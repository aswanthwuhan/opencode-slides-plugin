import { Schema } from "effect"
import { Ipc } from "@opencode/plugin/gui"

/** Window <-> main-process contract. The id must equal the plugin id. */
export const Slides = Ipc.define({
  id: "opencode-slides",
  methods: {
    // Renders the deck (LibreOffice -> PDF -> PNG) and returns the manifest JSON written by
    // render/deck.py plus one data:image/png URL per slide ("" for slides without an image).
    // v2: only the fallback for the model's screenshot tool when no panel is open.
    render: {
      input: Schema.Struct({ path: Schema.String }),
      output: Schema.Struct({ manifest: Schema.String, images: Schema.Array(Schema.String) }),
    },
    // Starts watching the deck file; a change fires the `changed` event. One watch per path.
    // Changes caused by `write` (same bytes) are not reported.
    watch: { input: Schema.Struct({ path: Schema.String }) },
    unwatch: { input: Schema.Struct({ path: Schema.String }) },
    // Reads the deck. data = base64 of the file bytes, mtime in ms.
    read: {
      input: Schema.Struct({ path: Schema.String }),
      output: Schema.Struct({ data: Schema.String, mtime: Schema.Number }),
    },
    // Atomically replaces the deck with base64 `data` (must be a zip/.pptx). Returns the new mtime (ms).
    write: {
      input: Schema.Struct({ path: Schema.String, data: Schema.String }),
      output: Schema.Struct({ mtime: Schema.Number }),
    },
    // JS source of dist/viewer.js (defines window.SlidesApp when executed in a document).
    viewerScript: { output: Schema.String },
    // Save dialog, then writes base64 `data` to the chosen file. canceled = true when the user cancels.
    // defaultDir (optional) is where the dialog starts; the default name is `name`.
    saveAs: {
      input: Schema.Struct({ name: Schema.String, data: Schema.String, defaultDir: Schema.optional(Schema.String) }),
      output: Schema.Struct({ path: Schema.String, canceled: Schema.Boolean }),
    },
    // Shows a file in its folder (shell.showItemInFolder).
    reveal: { input: Schema.Struct({ path: Schema.String }) },
    // Opens a PDF with the OS default app. Either `path` (an existing .pdf) or `name` + base64 `data`,
    // which is written to a temp file first (used to print an export). Returns the opened path.
    openExternal: {
      input: Schema.Struct({
        path: Schema.optional(Schema.String),
        name: Schema.optional(Schema.String),
        data: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({ path: Schema.String }),
    },
    // Image file picker. Empty name/data/mime when the user cancels. data = base64.
    pickImage: {
      output: Schema.Struct({ name: Schema.String, data: Schema.String, mime: Schema.String }),
    },
  },
  events: {
    changed: Schema.Struct({ path: Schema.String }),
  },
})
