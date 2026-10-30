// Main-process deck file access: read/write (atomic) with self-write suppression, and the viewer script.
// Node built-ins only, and no node calls at top level (the bundle is also evaluated in a window).
import { readFile, writeFile, rename, stat, unlink } from "node:fs/promises"
import { join, dirname, isAbsolute } from "node:path"
import { createHash } from "node:crypto"

const TMP_SUFFIX = ".tmp-opencode-slides"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha1 = (buf) => createHash("sha1").update(buf).digest("hex")

function checkDeckPath(path) {
  if (typeof path !== "string" || !isAbsolute(path)) throw new Error(`Deck path must be absolute: ${path}`)
  if (!/\.pptx$/i.test(path)) throw new Error(`Not a .pptx file: ${path}`)
}

/**
 * Deck read/write for the IPC layer. `write` remembers the sha1 of what it wrote per path;
 * `filterOwnWrites(onChange)` wraps a watcher callback so changes caused by our own writes are dropped.
 */
export function createDeckFiles() {
  const own = new Map() // normalized path -> sha1 of the bytes we last wrote
  const key = (path) => (process.platform === "win32" ? path.toLowerCase() : path)

  return {
    /** @returns {Promise<{ data: string, mtime: number }>} data is base64, mtime in ms */
    async read(path) {
      checkDeckPath(path)
      let buf, st
      try {
        ;[buf, st] = await Promise.all([readFile(path), stat(path)])
      } catch (err) {
        throw new Error(err?.code === "ENOENT" ? `Deck not found: ${path}` : `Cannot read ${path}: ${err?.message || err}`)
      }
      return { data: buf.toString("base64"), mtime: st.mtimeMs }
    },

    /** Writes base64 data to path + TMP_SUFFIX, then renames over the original. */
    async write(path, data) {
      checkDeckPath(path)
      if (typeof data !== "string" || !data) throw new Error("write: empty data")
      const buf = Buffer.from(data, "base64")
      // A .pptx is a zip: refuse anything that isn't, rather than clobbering the deck.
      if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error("write: data is not a .pptx (zip) file")
      const tmp = path + TMP_SUFFIX
      const k = key(path)
      const previous = own.get(k)
      own.set(k, sha1(buf))
      try {
        await writeFile(tmp, buf)
        for (let attempt = 0; ; attempt++) {
          try {
            await rename(tmp, path)
            break
          } catch (err) {
            // Windows: the target may be briefly locked (indexer, antivirus, PowerPoint).
            if (attempt >= 5 || !["EPERM", "EBUSY", "EACCES"].includes(err?.code)) throw err
            await sleep(100 * (attempt + 1))
          }
        }
      } catch (err) {
        if (previous === undefined) own.delete(k)
        else own.set(k, previous)
        await unlink(tmp).catch(() => {})
        throw new Error(`Cannot save ${path}: ${err?.message || err}`)
      }
      return { mtime: (await stat(path)).mtimeMs }
    },

    /** Wraps onChange(path): skips the call when the file's content equals our last write. */
    filterOwnWrites(onChange) {
      return async (path) => {
        const k = key(path)
        const mine = own.get(k)
        if (mine) {
          try {
            if (sha1(await readFile(path)) === mine) return
          } catch {}
          own.delete(k)
        }
        onChange(path)
      }
    },
  }
}

/**
 * Reads `<dir>/dist/viewer.js` from the first candidate plugin dir that has it.
 * Candidates may be files (e.g. a plugin's index.js); their directory is tried then.
 */
export async function readViewerScript(candidates) {
  const tried = []
  for (const c of candidates) {
    if (typeof c !== "string" || !c) continue
    const dirs = [c]
    try {
      if ((await stat(c)).isFile()) dirs[0] = dirname(c)
    } catch {}
    for (const dir of dirs) {
      const file = join(dir, "dist", "viewer.js")
      tried.push(file)
      try {
        return await readFile(file, "utf8")
      } catch {}
    }
  }
  throw new Error(`Viewer script not found (run \`npm run build:viewer\`). Tried: ${tried.join(", ") || "nothing"}`)
}
