// Main-process rendering + file watching. Node built-ins only.
// The bundle is also evaluated in a window where node:* are inert proxies, so no node calls at top level.
import { execFile } from "node:child_process"
import { watch as fsWatch } from "node:fs"
import { readFile, stat, mkdir } from "node:fs/promises"
import { join, dirname, basename, isAbsolute } from "node:path"
import { tmpdir } from "node:os"
import { createHash } from "node:crypto"

const HINT = "needs Python with python-pptx and pymupdf, and LibreOffice"
const inflight = new Map()

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, timeout: 300000, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) Object.assign(err, { stdout, stderr }), reject(err)
      else resolve({ stdout, stderr })
    })
  })
}

function pythonCandidates(python, script) {
  if (python) return [[python, ["-I", script]]]
  const list = []
  if (process.platform === "win32") list.push(["py", ["-3", "-I", script]])
  list.push(["python3", ["-I", script]], ["python", ["-I", script]])
  return list
}

async function runDeckPy(path, out, { python, soffice, script }) {
  const extra = [path, out]
  if (soffice) extra.push("--soffice", soffice)
  let last
  for (const [cmd, args] of pythonCandidates(python, script)) {
    try {
      return await run(cmd, [...args, ...extra])
    } catch (err) {
      last = err
      if (err.code !== "ENOENT") break // interpreter found but script failed: don't try others
    }
  }
  const detail = `${last?.stderr || ""}\n${last?.stdout || ""}`.trim() || last?.message || "unknown error"
  throw new Error(`Rendering failed (${HINT}): ${detail.slice(0, 2000)}`)
}

async function cachedManifest(cache, mtime) {
  try {
    const text = await readFile(join(cache, "manifest.json"), "utf8")
    return Math.abs(JSON.parse(text).mtime - mtime) <= 0.001 ? text : null
  } catch {
    return null
  }
}

async function doRender(path, opts) {
  if (typeof path !== "string" || !isAbsolute(path)) throw new Error(`Deck path must be absolute: ${path}`)
  if (!/\.pptx$/i.test(path)) throw new Error(`Not a .pptx file: ${path}`)
  if (!opts?.script) throw new Error("renderDeck: missing script path")
  let st
  try {
    st = await stat(path)
  } catch {
    throw new Error(`Deck not found: ${path}`)
  }
  if (!st.isFile()) throw new Error(`Deck is not a file: ${path}`)

  const cache = join(tmpdir(), "opencode-slides", createHash("sha1").update(path).digest("hex").slice(0, 16))
  let manifest = await cachedManifest(cache, st.mtimeMs / 1000)
  if (!manifest) {
    await mkdir(cache, { recursive: true })
    await runDeckPy(path, cache, opts)
    manifest = await readFile(join(cache, "manifest.json"), "utf8")
  }
  const images = await Promise.all(
    (JSON.parse(manifest).slides || []).map(async (s) =>
      s.image ? "data:image/png;base64," + (await readFile(join(cache, s.image))).toString("base64") : "",
    ),
  )
  return { manifest, images }
}

/** Renders a deck (cached by mtime, serialized per path). */
export function renderDeck(path, opts) {
  const running = inflight.get(path)
  if (running) return running
  const p = doRender(path, opts).finally(() => inflight.delete(path))
  inflight.set(path, p)
  return p
}

/** Ref-counted, debounced directory watchers; onChange(path) fires after the deck file changes. */
export function createWatchers(onChange, log) {
  const entries = new Map() // path -> { refs, watcher, timer }

  const close = (e) => {
    clearTimeout(e.timer)
    try {
      e.watcher?.close()
    } catch {}
  }

  return {
    watch(path) {
      const existing = entries.get(path)
      if (existing) return void existing.refs++
      const e = { refs: 1, watcher: null, timer: null }
      entries.set(path, e)
      const name = basename(path).toLowerCase()
      try {
        e.watcher = fsWatch(dirname(path), (_event, file) => {
          if (file && String(file).toLowerCase() !== name) return
          clearTimeout(e.timer)
          e.timer = setTimeout(() => {
            if (entries.get(path) === e) onChange(path)
          }, 800)
        })
        e.watcher.on("error", (err) => log?.(`watch error for ${path}: ${err?.message || err}`))
      } catch (err) {
        log?.(`cannot watch ${path}: ${err?.message || err}`)
      }
    },
    unwatch(path) {
      const e = entries.get(path)
      if (!e || --e.refs > 0) return
      entries.delete(path)
      close(e)
    },
    closeAll() {
      for (const e of entries.values()) close(e)
      entries.clear()
    },
  }
}
