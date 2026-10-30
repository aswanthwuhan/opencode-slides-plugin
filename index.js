// Server half: the slide_screenshot tool. It asks an open Slides panel to capture slides (fast,
// shows unsaved edits too) and falls back to rendering the file with LibreOffice when no panel answers.
import { fileURLToPath } from "node:url"
import { dirname, join, isAbsolute } from "node:path"
import { CaptureRpc } from "./src/rpc.js"
import { renderDeck } from "./src/render.js"
import { collectStrings, findDecks } from "./src/decks.js"

const PANEL_TIMEOUT = 5000
const RECENT_MS = 120_000 // a deck counts as "being built" when the tool call changed it this recently
const MAX_SLIDES = 12
const here = dirname(fileURLToPath(import.meta.url))

export default {
  id: "opencode-slides",
  async setup(ctx) {
    const pending = new Map()

    const rpc = await ctx.rpc.register(CaptureRpc, {
      submitCapture: async (input) => {
        const waiter = pending.get(input.requestId)
        if (waiter && !input.error && input.images?.length) {
          pending.delete(input.requestId)
          waiter.resolve(input)
        }
        return {}
      },
    })

    const askPanel = (request, signal) =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          pending.delete(request.requestId)
          resolve(null)
        }, PANEL_TIMEOUT)
        const done = (value) => {
          clearTimeout(timer)
          resolve(value)
        }
        pending.set(request.requestId, { resolve: done })
        signal?.addEventListener("abort", () => {
          pending.delete(request.requestId)
          done(null)
        })
        void rpc.events.emit("capture", request)
      })

    const fromFile = async (deck, slides) => {
      const result = await renderDeck(deck, {
        python: ctx.options?.python,
        soffice: ctx.options?.soffice,
        script: ctx.options?.renderScript ?? join(here, "render", "deck.py"),
      })
      const wanted = slides.length ? slides : result.images.map((_, i) => i + 1)
      return {
        deck,
        slides: wanted.filter((n) => result.images[n - 1]),
        images: wanted.map((n) => result.images[n - 1]).filter(Boolean),
      }
    }

    // Live view while the model builds a deck: after every tool call, look for .pptx files it mentions
    // that were just written, and ask that session's Slides panel to show them.
    if (ctx.options?.autoOpen !== false && typeof ctx.tool.hook === "function") {
      await ctx.tool.hook("execute.after", async (event) => {
        try {
          if (!event || event.tool === "slide_screenshot" || !event.sessionID) return
          const directory = ctx.location?.directory ?? ""
          const texts = collectStrings([event.input, event.result?.output, event.result?.content])
          const now = Date.now()
          for (const deck of findDecks(texts, directory)) {
            if (now - deck.mtimeMs > RECENT_MS) continue
            await rpc.events.emit("deck", { sessionID: event.sessionID, directory, path: deck.path, tool: String(event.tool ?? "") })
          }
        } catch {
          // Never let the live view break a tool call.
        }
      })
    }

    await ctx.tool.transform((t) => {
      t.add({
        name: "slide_screenshot",
        description:
          "Take a screenshot of slides of a PowerPoint (.pptx) deck so you can see how they actually look. " +
          "Uses the deck open in the user's Slides side panel (including unsaved edits) when available; otherwise renders the file. " +
          "Use it after editing a deck to check layout, overflow and overlaps.",
        input: {
          type: "object",
          properties: {
            deck: {
              type: "string",
              description: "Absolute path of the .pptx. Optional when the deck is open in the Slides panel.",
            },
            slides: {
              type: "array",
              items: { type: "integer", minimum: 1 },
              description: `1-based slide numbers (max ${MAX_SLIDES}). Omit for all slides (up to ${MAX_SLIDES}).`,
            },
          },
        },
        options: { codemode: false },
        execute: async (input, call) => {
          const deck = input.deck?.trim() || ""
          if (deck && (!isAbsolute(deck) || !/\.pptx$/i.test(deck))) throw new Error("deck must be an absolute path to a .pptx file")
          const slides = [...new Set(input.slides ?? [])].filter((n) => Number.isInteger(n) && n >= 1).slice(0, MAX_SLIDES)

          const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
          let shot = await askPanel({ requestId, sessionID: call.sessionID, directory: ctx.location?.directory ?? "", deck, slides }, call.signal)
          let source = "Slides panel"
          if (!shot) {
            if (!deck) throw new Error("No Slides panel answered. Open the deck in the Slides panel or pass `deck` (absolute .pptx path).")
            shot = await fromFile(deck, slides)
            source = "rendered from file"
          }

          const shown = (shot.slides?.length ? shot.slides : shot.images.map((_, i) => i + 1)).slice(0, MAX_SLIDES)
          const images = shot.images.slice(0, MAX_SLIDES)
          // No `output`: the server rejects a structured output unless the tool declares an output schema.
          return {
            metadata: { deck: shot.deck || deck, slides: shown, source },
            content: [
              { type: "text", text: `${shot.deck || deck} — slide${shown.length > 1 ? "s" : ""} ${shown.join(", ")} (${source}), in order:` },
              ...images.map((uri, i) => ({ type: "file", uri, mime: "image/png", name: `slide-${shown[i] ?? i + 1}.png` })),
            ],
          }
        },
      })
    })
  },
}
