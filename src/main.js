// Main-process half: wires render.js / files.js to the Slides IPC contract.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join, basename, extname, isAbsolute } from "node:path"
import { tmpdir, homedir } from "node:os"
import { Slides } from "./ipc.js"
import { renderDeck, createWatchers } from "./render.js"
import { createDeckFiles, readViewerScript } from "./files.js"

const PLUGIN_ID = "opencode-slides"
const IMAGE_MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
}

// Electron exists only in the desktop host. Required lazily (inside the handlers) so that tests and
// other hosts never load it.
const electron = () => require("electron")

// A file name without directories or characters Windows rejects.
const safeName = (name) => basename(String(name || "")).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") || "file"
const absolute = (path, what) => {
  if (typeof path !== "string" || !isAbsolute(path)) throw new Error(`${what} must be an absolute path: ${path}`)
  return path
}
const filtersFor = (name) => {
  const ext = extname(name).slice(1)
  return ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : []
}

// Writes the bundled deck.py text to a stable temp path (only when it changed).
function materializeScript(source) {
  const dir = join(tmpdir(), "opencode-slides")
  const file = join(dir, "deck.py")
  let current = null
  try {
    current = readFileSync(file, "utf8")
  } catch {}
  if (current !== source) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(file, source, "utf8")
  }
  return file
}

// Where this plugin is installed, as reported by the host (shape unknown: guard every step).
async function pluginPathFromHost(ctx) {
  try {
    const res = await ctx.client?.plugin?.list?.()
    const list = [res, res?.data, res?.plugins, res?.data?.plugins].find(Array.isArray) || []
    const entry = list.find((p) => p?.id === PLUGIN_ID || p?.name === PLUGIN_ID)
    const path = entry?.source?.path ?? entry?.path
    return typeof path === "string" ? path : null
  } catch (err) {
    ctx.log?.error?.(`plugin.list: ${err?.message || err}`)
    return null
  }
}

export function setupMain(ctx, scriptSource, pluginDir) {
  const opts = ctx.options || {}
  let script = opts.renderScript
  const renderOpts = () => {
    script ??= materializeScript(scriptSource)
    return { python: opts.python, soffice: opts.soffice, script }
  }

  let handle
  const files = createDeckFiles()
  const watchers = createWatchers(
    files.filterOwnWrites((path) => handle?.emit("changed", { path })),
    (msg) => ctx.log?.error?.(msg),
  )

  const loadViewer = async () => {
    const candidates = [opts.pluginDir, pluginDir, await pluginPathFromHost(ctx)]
    try {
      candidates.push(join(homedir(), ".config", "opencode", "plugins", PLUGIN_ID))
    } catch {}
    return readViewerScript(candidates)
  }

  const logged = (name, fn) => async (input) => {
    try {
      return await fn(input)
    } catch (err) {
      ctx.log?.error?.(`${name} ${input?.path ?? ""}: ${err?.message || err}`)
      throw err
    }
  }

  handle = ctx.provide(Slides, {
    render: logged("render", ({ path }) => renderDeck(path, renderOpts())),
    watch: async ({ path }) => {
      try {
        watchers.watch(path)
      } catch (err) {
        ctx.log?.error?.(`watch ${path}: ${err?.message || err}`)
      }
    },
    unwatch: async ({ path }) => watchers.unwatch(path),
    read: logged("read", ({ path }) => files.read(path)),
    write: logged("write", ({ path, data }) => files.write(path, data)),
    // Read from disk each time (windows cache it per load), so a rebuilt viewer is picked up without
    // restarting the desktop app.
    viewerScript: logged("viewerScript", () => loadViewer()),
    saveAs: logged("saveAs", async ({ name, data, defaultDir }) => {
      const { dialog, BrowserWindow } = electron()
      const file = safeName(name)
      const dir = defaultDir && isAbsolute(defaultDir) ? defaultDir : homedir()
      const res = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow() ?? undefined, {
        defaultPath: join(dir, file),
        filters: filtersFor(file),
      })
      if (res.canceled || !res.filePath) return { path: "", canceled: true }
      await writeFile(res.filePath, Buffer.from(data, "base64"))
      return { path: res.filePath, canceled: false }
    }),
    reveal: logged("reveal", async ({ path }) => {
      electron().shell.showItemInFolder(absolute(path, "reveal path"))
    }),
    openExternal: logged("openExternal", async ({ path, name, data }) => {
      let target = path
      if (data != null) {
        // Printing: the export goes to a temp file that the user's PDF viewer opens.
        const dir = join(tmpdir(), PLUGIN_ID, "print")
        await mkdir(dir, { recursive: true })
        target = join(dir, safeName(name || "print.pdf"))
        await writeFile(target, Buffer.from(data, "base64"))
      }
      absolute(target, "openExternal path")
      if (!/\.pdf$/i.test(target)) throw new Error(`openExternal only opens .pdf files: ${target}`)
      const err = await electron().shell.openPath(target)
      if (err) throw new Error(err)
      return { path: target }
    }),
    pickImage: logged("pickImage", async () => {
      const { dialog, BrowserWindow } = electron()
      const res = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() ?? undefined, {
        properties: ["openFile"],
        filters: [{ name: "Images", extensions: Object.keys(IMAGE_MIME) }],
      })
      const file = res.canceled ? undefined : res.filePaths?.[0]
      if (!file) return { name: "", data: "", mime: "" }
      const ext = extname(file).slice(1).toLowerCase()
      return {
        name: basename(file),
        data: (await readFile(file)).toString("base64"),
        mime: IMAGE_MIME[ext] || "application/octet-stream",
      }
    }),
  })

  ctx.onCleanup?.(() => watchers.closeAll())
  return handle
}
