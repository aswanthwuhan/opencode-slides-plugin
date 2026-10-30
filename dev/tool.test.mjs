// Runs the server plugin's slide_screenshot tool with a mocked ctx (no panel -> LibreOffice fallback).
import plugin from "../index.js"
let tool, emitted = []
await plugin.setup({
  options: {},
  rpc: { register: async (_def, handlers) => ({ dispose() {}, events: { emit: async (name, data) => emitted.push([name, data]) } }) },
  tool: { transform: async (fn) => fn({ add: (t) => (tool = t) }) },
})
const deck = process.argv[2]
const t0 = Date.now()
const r = await tool.execute({ deck, slides: [2, 1] }, { sessionID: "ses_test", signal: undefined })
console.log("emitted:", emitted.map(([n, d]) => n + " " + JSON.stringify({ ...d, requestId: "…" })))
console.log("output field:", r.output === undefined ? "none" : "PRESENT", "metadata:", JSON.stringify(r.metadata), "ms:", Date.now() - t0)
console.log("content:", r.content.map((c) => c.type === "text" ? c.text : `${c.name} ${c.mime} ${c.uri.slice(0, 30)}… ${c.uri.length}`))
try { await tool.execute({}, { sessionID: "s" }) } catch (e) { console.log("no deck ->", e.message) }
