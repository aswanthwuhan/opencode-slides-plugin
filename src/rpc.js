// Server <-> window RPC used by the slide_screenshot tool. Plain JSON Schemas so both the server
// plugin and the desktop window can use the same definition without extra modules.
export const CaptureRpc = {
  id: "opencode-slides",
  methods: {
    // A window answers a capture request with PNG data URLs (or an error message).
    submitCapture: {
      input: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          images: { type: "array", items: { type: "string" } },
          slides: { type: "array", items: { type: "number" } },
          deck: { type: "string" },
          error: { type: "string" },
        },
        required: ["requestId"],
      },
      output: { type: "object" },
    },
  },
  events: {
    // A tool call in a session created or saved a .pptx: open it in that session's Slides panel.
    deck: {
      schema: {
        type: "object",
        properties: {
          sessionID: { type: "string" },
          directory: { type: "string" },
          path: { type: "string" },
          tool: { type: "string" },
        },
      },
    },
    // The server asks open Slides panels to capture slides (1-based; empty = all).
    capture: {
      schema: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          sessionID: { type: "string" },
          directory: { type: "string" },
          deck: { type: "string" },
          slides: { type: "array", items: { type: "number" } },
        },
      },
    },
  },
}
