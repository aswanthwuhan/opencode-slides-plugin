// node dev/main.test.mjs — exercises src/render.js against the real sample deck.
import assert from "node:assert/strict"
import { copyFileSync, mkdtempSync, rmSync, utimesSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import { renderDeck, createWatchers } from "../src/render.js"
import { createDeckFiles, readViewerScript } from "../src/files.js"
import JSZip from "jszip"

const here = dirname(fileURLToPath(import.meta.url))
const script = join(here, "..", "render", "deck.py")
const SAMPLE = join(here, "sample.pptx")
const mkdirp = (d) => mkdirSync(d, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  // Render + cache
  let t = Date.now()
  const a = await renderDeck(SAMPLE, { script })
  console.log(`first render ${Date.now() - t} ms`)
  const check = (r) => {
    assert.equal(r.images.length, 3)
    for (const img of r.images) assert.ok(img.startsWith("data:image/png;base64,"), "image is a png data url")
    assert.equal(JSON.parse(r.manifest).slides.length, 3)
  }
  check(a)
  t = Date.now()
  const b = await renderDeck(SAMPLE, { script })
  const second = Date.now() - t
  console.log(`second render ${second} ms`)
  check(b)
  assert.ok(second < 1500, "second render should hit the cache")
  console.log("render OK")

  // Concurrent calls share one in-flight render
  const p1 = renderDeck(SAMPLE, { script })
  assert.equal(renderDeck(SAMPLE, { script }), p1)
  await p1
  console.log("serialization OK")

  // Bad paths
  await assert.rejects(renderDeck("relative.pptx", { script }), /absolute/)
  await assert.rejects(renderDeck(join(tmpdir(), "x.txt"), { script }), /pptx/)
  await assert.rejects(renderDeck(join(tmpdir(), "does-not-exist-ocs.pptx"), { script }), /not found/)
  console.log("bad paths OK")

  // Watcher: debounced, fires once
  const dir = mkdtempSync(join(tmpdir(), "ocs-watch-"))
  const copy = join(dir, "deck.pptx")
  copyFileSync(SAMPLE, copy)
  await sleep(300)
  const fired = []
  const w = createWatchers((p) => fired.push(p), (m) => console.log("log:", m))
  w.watch(copy)
  w.watch(copy) // ref-counted
  for (let i = 0; i < 3; i++) {
    const now = new Date()
    utimesSync(copy, now, now)
    copyFileSync(SAMPLE, copy)
    await sleep(100)
  }
  await sleep(1500)
  assert.deepEqual(fired, [copy], `watcher should fire exactly once, got ${fired.length}`)
  w.unwatch(copy)
  copyFileSync(SAMPLE, copy) // still watched (one ref left)
  await sleep(1200)
  assert.equal(fired.length, 2, "still watching after one unwatch")
  w.unwatch(copy)
  copyFileSync(SAMPLE, copy)
  await sleep(1200)
  assert.equal(fired.length, 2, "closed after second unwatch")
  w.closeAll()
  rmSync(dir, { recursive: true, force: true })
  console.log("watcher OK")

  // Read / write round trip
  const files = createDeckFiles()
  const dir2 = mkdtempSync(join(tmpdir(), "ocs-files-"))
  const deck = join(dir2, "deck.pptx")
  copyFileSync(SAMPLE, deck)
  const original = readFileSync(SAMPLE)
  const r = await files.read(deck)
  assert.equal(typeof r.mtime, "number")
  assert.ok(Buffer.from(r.data, "base64").equals(original), "read returns the file bytes")
  const modified = Buffer.concat([original, Buffer.alloc(16)]) // still starts with PK
  const wr = await files.write(deck, modified.toString("base64"))
  assert.equal(typeof wr.mtime, "number")
  assert.ok(readFileSync(deck).equals(modified), "write replaced the file")
  assert.ok(!existsSync(deck + ".tmp-opencode-slides"), "temp file renamed away")
  assert.ok(Buffer.from((await files.read(deck)).data, "base64").equals(modified), "round trip")
  await assert.rejects(files.read("relative.pptx"), /absolute/)
  await assert.rejects(files.read(join(dir2, "missing.pptx")), /not found/)
  await assert.rejects(files.write(join(dir2, "x.txt"), modified.toString("base64")), /pptx/)
  await assert.rejects(files.write(deck, Buffer.from("not a zip").toString("base64")), /zip/)
  assert.ok(readFileSync(deck).equals(modified), "rejected write left the file alone")
  console.log("read/write OK")

  // Self-write suppression: own write -> no event; external change -> one event
  await sleep(300)
  const seen = []
  const w2 = createWatchers(files.filterOwnWrites((p) => seen.push(p)), (m) => console.log("log:", m))
  w2.watch(deck)
  await files.write(deck, original.toString("base64"))
  await sleep(1500)
  assert.deepEqual(seen, [], `own write must not fire, got ${seen.length}`)
  writeFileSync(deck, modified) // external
  await sleep(1500)
  assert.deepEqual(seen, [deck], "external change fires once")
  await files.write(deck, original.toString("base64"))
  copyFileSync(SAMPLE, deck) // external write of identical bytes right after ours: indistinguishable, suppressed
  await sleep(1500)
  assert.equal(seen.length, 1, "identical content stays suppressed")
  writeFileSync(deck, modified)
  await sleep(1500)
  assert.equal(seen.length, 2, "later external change fires")
  w2.closeAll()
  rmSync(dir2, { recursive: true, force: true })
  console.log("self-write suppression OK")

  // Viewer script lookup
  const vdir = mkdtempSync(join(tmpdir(), "ocs-viewer-"))
  await assert.rejects(readViewerScript([null, vdir]), /not found/)
  mkdirp(join(vdir, "dist"))
  writeFileSync(join(vdir, "dist", "viewer.js"), "window.SlidesApp={}")
  writeFileSync(join(vdir, "index.js"), "")
  assert.equal(await readViewerScript([join(tmpdir(), "nope-ocs"), vdir]), "window.SlidesApp={}")
  assert.equal(await readViewerScript([join(vdir, "index.js")]), "window.SlidesApp={}", "file candidate -> its dir")
  rmSync(vdir, { recursive: true, force: true })
  console.log("viewer script OK")

  console.log("ALL OK")
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("FAIL:", err?.stack || err)
    process.exit(1)
  },
)
