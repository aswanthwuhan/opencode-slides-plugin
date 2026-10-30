// Evaluates gui-experimental.cjs the way the desktop host does (new Function + shared require).
const fs = require("node:fs")
const code = fs.readFileSync(__dirname + "/../gui-experimental.cjs", "utf8")
const anySchema = new Proxy(function () {}, { get: () => anySchema, apply: () => anySchema })
const shared = {
  effect: { Schema: anySchema },
  "solid-js": { onCleanup() {} },
  "@opencode/plugin/gui": {
    Plugin: { define: (x) => x },
    Panel: { kind: "registry", id: "panel" },
    MenuItem: { kind: "registry", id: "menu" },
    Ipc: { define: (spec) => ({ kind: "ipc", id: spec.id, spec }) },
  },
}
const req = (name) => (name in shared ? shared[name] : name.startsWith("node:") ? require(name) : (() => { throw new Error("unshared " + name) })())
const mod = { exports: {} }
new Function("require", "module", "exports", code)(req, mod, mod.exports)
const def = mod.exports.default ?? mod.exports
if (typeof def.setup !== "function" || typeof def.main !== "function") throw new Error("missing setup/main")

const added = []
def.setup({ id: "opencode-slides", add: (reg, item) => added.push([reg.id, item.id]), layout: {}, sessions: {}, desktop: {}, client: { rpc: (d) => (console.log("window rpc:", d.id), { submitCapture: async () => ({}), events: { on: () => () => {} } }) } })
console.log("setup registered:", JSON.stringify(added))

let impl, token
def.main({ options: { pluginDir: require("node:path").join(__dirname, "..") }, log: { error: console.error }, onCleanup() {}, provide: (t, i) => ((token = t), (impl = i), { emit() {} }) })
console.log("main provided ipc:", token.id, Object.keys(impl))
const deck = process.argv[2]
impl.render({ path: deck }).then((r) => {
  const m = JSON.parse(r.manifest)
  console.log("render:", m.slides.length, "slides,", r.images.filter((x) => x.startsWith("data:image/png")).length, "images")
  console.log("BUNDLE OK")
}, (e) => { console.error("render failed", e); process.exit(1) })
setTimeout(async () => {
  const src = await impl.viewerScript()
  console.log("viewerScript:", (src.length / 1e6).toFixed(1), "MB")
  const f = await impl.read({ path: process.argv[2] })
  console.log("read:", f.data.length, "b64 chars, mtime", Math.round(f.mtime))
}, 100)
