// The plugin's ./gui-experimental entry: a "Slides" side panel in each session. The deck is rendered and
// edited in the panel (pptx-react-viewer in an iframe); the main process reads/writes/watches the file,
// and open panels answer the server's slide_screenshot tool.
import { onCleanup } from "solid-js"
import { Plugin, Panel, MenuItem } from "@opencode/plugin/gui"
import { Slides } from "./ipc.js"
import { CaptureRpc } from "./rpc.js"
import { createSlidesView } from "./view.js"
import { buildPrompt } from "./prompt.js"
import { setupMain } from "./main.js"
import deckScript from "../render/deck.py" with { type: "text" }

const TAB = "deck"
const storageKey = (session) => `opencode-slides:deck:${session.id}`
const samePath = (a, b) => !!a && !!b && a.replace(/\//g, "\\").toLowerCase() === b.replace(/\//g, "\\").toLowerCase()

const toBase64 = (bytes) => {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
const fromBase64 = (data) => Uint8Array.from(atob(data), (c) => c.charCodeAt(0))

// The main half loads once at app start, while windows pick up a rebuilt plugin on reload. A method
// added since then is missing from the running main process: say so instead of the host's bare error.
const withRestartHint = (api) =>
  new Proxy(api, {
    get(target, key) {
      const value = target[key]
      if (typeof value !== "function" || !Object.hasOwn(Slides.spec?.methods ?? {}, key)) return value
      return (...args) =>
        Promise.resolve(value.apply(target, args)).catch((err) => {
          if (/no method/i.test(String(err?.message))) {
            throw new Error(`"${String(key)}" needs the updated plugin — fully quit and restart OpenCode`)
          }
          throw err
        })
    },
  })

// One copy of the 12 MB viewer source per window.
let viewerSource

export default Plugin.define({
  setup(ctx) {
    const tab = { id: TAB, title: "Slides" }
    const open = (session) => session && ctx.layout.open(`${ctx.id}:${TAB}`, session, { tab: "select" })
    // Open panels by session id: { deck(), capture(deck, slides) }.
    const panels = new Map()

    // The server's slide_screenshot tool asks open panels for images.
    const capture = ctx.client.rpc(CaptureRpc)
    const offCapture = capture.events.on("capture", async (request) => {
      let panel = panels.get(request.sessionID)
      if (!panel && request.deck) panel = [...panels.values()].find((p) => samePath(p.deck(), request.deck))
      if (!panel || (request.deck && !samePath(panel.deck(), request.deck))) return
      try {
        const images = await panel.capture(request.deck, request.slides ?? [])
        const slides = request.slides?.length ? request.slides : images.map((_, i) => i + 1)
        const location = request.directory ? { location: { directory: request.directory } } : undefined
        await capture.submitCapture({ requestId: request.requestId, images, slides, deck: panel.deck() }, location)
      } catch {
        // Let another window answer, or the server fall back to rendering the file.
      }
    })
    if (typeof offCapture === "function") onCleanup(offCapture)

    // Live view: the model just created/saved a deck in a session. Show it in that session's panel,
    // opening the Slides tab when it is closed. Later saves reload it through the file watcher.
    const offDeck = capture.events.on("deck", (event) => {
      if (!event?.path || !event.sessionID || ctx.options?.autoOpen === false) return
      const panel = panels.get(event.sessionID)
      if (panel) {
        if (!samePath(panel.deck(), event.path)) panel.open(event.path)
        else panel.building()
        return
      }
      const session = [ctx.sessions.current(), ...(ctx.sessions.list?.() ?? [])].find((s) => s?.id === event.sessionID)
      if (!session) return
      localStorage.setItem(storageKey(session), event.path)
      open(session)
    })
    if (typeof offDeck === "function") onCleanup(offDeck)

    ctx.add(Panel, {
      id: "slides",
      region: "side",
      wide: true,
      list: (input) => (input.open.includes(TAB) ? [tab] : []),
      render: (props) => {
        const session = props.session
        const slides = withRestartHint(ctx.main(Slides))
        let deck = localStorage.getItem(storageKey(session))
        let capturer

        const view = createSlidesView({
          initialPath: deck,
          dark: () => ctx.appearance?.mode?.() === "dark",
          async pickDeck() {
            const picked = await ctx.desktop.pick({ title: "Open presentation", extensions: ["pptx"] })
            return picked?.[0] ?? null
          },
          async readDeck(path) {
            const file = await slides.read({ path })
            return { bytes: fromBase64(file.data), mtime: file.mtime }
          },
          async writeDeck(path, bytes) {
            return slides.write({ path, data: toBase64(bytes) })
          },
          async loadViewerScript() {
            viewerSource ??= slides.viewerScript()
            try {
              return await viewerSource
            } catch (error) {
              viewerSource = undefined
              throw error
            }
          },
          onChanged(path, cb) {
            void slides.watch({ path }).catch(() => {})
            const off = slides.on("changed", (event) => {
              if (samePath(event.path, path)) cb()
            })
            return () => {
              off()
              void slides.unwatch({ path }).catch(() => {})
            }
          },
          remember(path) {
            deck = path
            localStorage.setItem(storageKey(session), path)
          },
          // Exports: the host's save dialog writes the bytes; resolves { path } or { canceled: true }.
          async saveFile({ name, bytes, defaultDir }) {
            return slides.saveAs({ name, data: toBase64(bytes), ...(defaultDir ? { defaultDir } : {}) })
          },
          async reveal({ path }) {
            await slides.reveal({ path })
          },
          // Printing: the PDF goes to a temp file and opens in the user's PDF viewer.
          async openPrint({ name, bytes }) {
            await slides.openExternal({ name, data: toBase64(bytes) })
          },
          // Resolves { name, data (base64), mime }; name is "" when canceled.
          pickImage() {
            return slides.pickImage()
          },
          registerCapture(fn) {
            capturer = fn
            return () => {
              if (capturer === fn) capturer = undefined
            }
          },
          async send(request) {
            const prompt = buildPrompt(request)
            const input = { sessionID: session.id, text: prompt.text, files: prompt.files }
            // The window's data layer shows the message at once; the plain client is the fallback.
            const data = session.server.data?.session
            await (data?.prompt ? data.prompt(input) : session.server.client.session.prompt(input))
          },
        })

        panels.set(session.id, {
          deck: () => deck,
          open: (path) => view.open?.(path, "Model is building this deck — it updates here as it saves"),
          building: () => view.notice?.("Model is building this deck — it updates here as it saves"),
          capture: (path, wanted) => {
            if (!capturer) throw new Error("not open")
            return capturer(path, wanted)
          },
        })
        onCleanup(() => {
          panels.delete(session.id)
          view.dispose()
        })
        return view.element
      },
    })

    ctx.add(MenuItem, {
      menu: "session.panel",
      id: "open",
      title: "Slides",
      icon: "outline-photo",
      run: () => open(ctx.sessions.current()),
    })
  },

  main(ctx) {
    setupMain(ctx, deckScript)
  },
})
