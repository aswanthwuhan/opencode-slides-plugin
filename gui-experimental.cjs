var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/gui.js
var exports_gui = {};
__export(exports_gui, {
  default: () => gui_default
});
module.exports = __toCommonJS(exports_gui);
var import_solid_js = require("solid-js");
var import_gui2 = require("@opencode/plugin/gui");

// src/ipc.js
var import_effect = require("effect");
var import_gui = require("@opencode/plugin/gui");
var Slides = import_gui.Ipc.define({
  id: "opencode-slides",
  methods: {
    render: {
      input: import_effect.Schema.Struct({ path: import_effect.Schema.String }),
      output: import_effect.Schema.Struct({ manifest: import_effect.Schema.String, images: import_effect.Schema.Array(import_effect.Schema.String) })
    },
    watch: { input: import_effect.Schema.Struct({ path: import_effect.Schema.String }) },
    unwatch: { input: import_effect.Schema.Struct({ path: import_effect.Schema.String }) },
    read: {
      input: import_effect.Schema.Struct({ path: import_effect.Schema.String }),
      output: import_effect.Schema.Struct({ data: import_effect.Schema.String, mtime: import_effect.Schema.Number })
    },
    write: {
      input: import_effect.Schema.Struct({ path: import_effect.Schema.String, data: import_effect.Schema.String }),
      output: import_effect.Schema.Struct({ mtime: import_effect.Schema.Number })
    },
    viewerScript: { output: import_effect.Schema.String },
    saveAs: {
      input: import_effect.Schema.Struct({ name: import_effect.Schema.String, data: import_effect.Schema.String, defaultDir: import_effect.Schema.optional(import_effect.Schema.String) }),
      output: import_effect.Schema.Struct({ path: import_effect.Schema.String, canceled: import_effect.Schema.Boolean })
    },
    reveal: { input: import_effect.Schema.Struct({ path: import_effect.Schema.String }) },
    openExternal: {
      input: import_effect.Schema.Struct({
        path: import_effect.Schema.optional(import_effect.Schema.String),
        name: import_effect.Schema.optional(import_effect.Schema.String),
        data: import_effect.Schema.optional(import_effect.Schema.String)
      }),
      output: import_effect.Schema.Struct({ path: import_effect.Schema.String })
    },
    pickImage: {
      output: import_effect.Schema.Struct({ name: import_effect.Schema.String, data: import_effect.Schema.String, mime: import_effect.Schema.String })
    }
  },
  events: {
    changed: import_effect.Schema.Struct({ path: import_effect.Schema.String })
  }
});

// src/rpc.js
var CaptureRpc = {
  id: "opencode-slides",
  methods: {
    submitCapture: {
      input: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          images: { type: "array", items: { type: "string" } },
          slides: { type: "array", items: { type: "number" } },
          deck: { type: "string" },
          error: { type: "string" }
        },
        required: ["requestId"]
      },
      output: { type: "object" }
    }
  },
  events: {
    deck: {
      schema: {
        type: "object",
        properties: {
          sessionID: { type: "string" },
          directory: { type: "string" },
          path: { type: "string" },
          tool: { type: "string" }
        }
      }
    },
    capture: {
      schema: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          sessionID: { type: "string" },
          directory: { type: "string" },
          deck: { type: "string" },
          slides: { type: "array", items: { type: "number" } }
        }
      }
    }
  }
};

// src/view.js
var CSS = `
.ocs-root{height:100%;display:flex;flex-direction:column;gap:4px;box-sizing:border-box;padding:4px;
  font:inherit;font-size:12px;color:var(--v2-text-base,inherit);background:transparent;overflow:hidden}
.ocs-root *{box-sizing:border-box}
.ocs-root button{font:inherit;font-size:12px;color:inherit;background:transparent;cursor:pointer;
  border:1px solid var(--v2-border-base,rgba(127,127,127,.3));border-radius:4px;padding:2px 7px}
.ocs-root button:hover:not(:disabled){border-color:var(--v2-accent,#3b82f6)}
.ocs-root button:disabled{opacity:.45;cursor:default}
.ocs-root button.ocs-primary{background:var(--v2-accent,#3b82f6);border-color:var(--v2-accent,#3b82f6);color:#fff}
.ocs-root textarea{font:inherit;font-size:12px;color:inherit;background:transparent;width:100%;resize:none;min-height:28px;max-height:96px;
  border:1px solid var(--v2-border-base,rgba(127,127,127,.3));border-radius:4px;padding:4px 6px}
.ocs-muted{color:var(--v2-text-weak,#5b6270)}
.ocs-header{display:flex;align-items:center;gap:4px;flex:none;min-width:0;flex-wrap:wrap;row-gap:4px}
.ocs-name{flex:1 1 90px;min-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.ocs-root button.ocs-save{flex:none;white-space:nowrap;padding:2px 8px}
.ocs-root button.ocs-save.ocs-warn{border-color:#b07400;color:#8a5a00;font-weight:600}
.ocs-root.ocs-dark button.ocs-save.ocs-warn{color:#e5a50a;border-color:#e5a50a}
.ocs-root button.ocs-save.ocs-error{border-color:#e5484d}
.ocs-save.ocs-error{color:#e5484d}
.ocs-status{flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ocs-status.ocs-error{color:#e5484d;white-space:pre-wrap;word-break:break-word;max-height:6em;overflow:auto}
.ocs-banner{flex:none;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 6px;border-radius:4px;
  border:1px solid color-mix(in srgb,#e5a50a 60%,transparent);background:color-mix(in srgb,#e5a50a 12%,transparent)}
.ocs-banner span{flex:1;min-width:120px}
.ocs-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px 8px;text-align:center}
.ocs-frame{flex:1;min-height:120px;position:relative;border-radius:4px;overflow:hidden}
.ocs-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:transparent}
.ocs-bar{flex:none;display:flex;flex-direction:column;gap:4px;margin:2px 0 0;padding:2px 6px 6px;border-radius:8px;position:relative;
  border:1px solid color-mix(in srgb,var(--v2-accent,#3b82f6) 35%,transparent);
  background:color-mix(in srgb,var(--v2-accent,#3b82f6) 7%,var(--v2-background-bg-base,transparent));
  box-shadow:0 2px 10px rgba(0,0,0,.08)}
.ocs-bar-head{display:flex;align-items:center;gap:6px;min-width:0}
.ocs-bar-head{flex-wrap:nowrap}
.ocs-bar-head .ocs-target{flex:0 1 auto;min-width:40px}
.ocs-bar-grip{flex:none;height:9px;margin:0 -6px;cursor:ns-resize;position:relative;touch-action:none}
.ocs-bar-grip::after{content:"";position:absolute;left:50%;top:3px;width:34px;height:3px;margin-left:-17px;border-radius:2px;background:var(--v2-border-base,rgba(127,127,127,.5))}
.ocs-bar-grip:hover::after{background:var(--v2-accent,#3b82f6)}
.ocs-bar-title{flex:none;font-size:11px;font-weight:700;color:var(--v2-accent,#3b82f6);white-space:nowrap}
.ocs-target{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;
  padding:1px 7px;border-radius:999px;background:color-mix(in srgb,var(--v2-accent,#3b82f6) 14%,transparent);
  color:var(--v2-text-base,inherit)}
.ocs-count{flex:none;font-size:11px;font-weight:700;color:#fff;background:var(--v2-accent,#3b82f6);
  border-radius:999px;padding:1px 8px}
.ocs-bar .ocs-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ocs-root .ocs-bar button{font-size:11px;padding:2px 8px;border-radius:6px}
.ocs-root .ocs-bar button.ocs-primary{font-size:11.5px;font-weight:700;padding:3px 12px;box-shadow:0 2px 8px color-mix(in srgb,var(--v2-accent,#3b82f6) 45%,transparent)}
.ocs-root .ocs-bar button.ocs-primary:hover:not(:disabled){filter:brightness(1.1)}
.ocs-context{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ocs-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ocs-grow{flex:1}
.ocs-root button.ocs-hist{display:inline-flex;align-items:center;padding:3px 6px;border-color:var(--v2-accent,#3b82f6)}
.ocs-root button.ocs-hist:disabled{border-color:var(--v2-border-base,rgba(127,127,127,.3))}
.ocs-root button.ocs-hist svg{flex:none}
.ocs-counter{flex:none;white-space:nowrap;min-width:3.2em;text-align:center}
.ocs-root button.ocs-on{border-color:var(--v2-accent,#3b82f6);color:var(--v2-accent,#3b82f6)}
.ocs-compose{display:flex;align-items:flex-end;gap:5px}
.ocs-bar .ocs-check{font-size:11px}
.ocs-root .ocs-compose textarea{flex:1;font-size:12px;min-height:26px;max-height:60vh;padding:4px 7px;border-radius:6px;
  background:var(--v2-background-bg-base,rgba(255,255,255,.04));border:1px solid var(--v2-border-base,rgba(127,127,127,.35));
  transition:border-color .12s,box-shadow .12s}
.ocs-root .ocs-compose textarea:focus{outline:none;border-color:var(--v2-accent,#3b82f6);
  box-shadow:0 0 0 2px color-mix(in srgb,var(--v2-accent,#3b82f6) 25%,transparent)}
.ocs-queue{display:flex;flex-direction:column;gap:4px;max-height:150px;overflow:auto}
.ocs-chip{display:flex;align-items:center;gap:8px;min-width:0;padding:5px 6px 5px 6px;border-radius:8px;cursor:pointer;
  background:var(--v2-background-bg-base,rgba(127,127,127,.06));border:1px solid var(--v2-border-base,rgba(127,127,127,.25))}
.ocs-chip:hover{border-color:var(--v2-accent,#3b82f6)}
.ocs-chip-num{flex:none;width:20px;height:20px;border-radius:50%;background:var(--v2-accent,#3b82f6);color:#fff;
  font-size:11px;font-weight:700;line-height:20px;text-align:center}
.ocs-chip-body{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}
.ocs-chip-where{font-size:10.5px;color:var(--v2-text-weak,#5b6270);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ocs-chip-text{font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ocs-root .ocs-chip button{flex:none;border:0;padding:2px 6px;font-size:16px;line-height:20px;min-width:24px;min-height:24px;opacity:.75}
.ocs-root .ocs-pin:focus-visible,.ocs-root .ocs-chip:focus-visible{outline:2px solid var(--v2-accent,#3b82f6);outline-offset:2px}
.ocs-root button.ocs-nav{min-width:26px;padding:2px 4px}
.ocs-root .ocs-chip button:hover{opacity:1}
.ocs-check{display:flex;align-items:center;gap:4px;cursor:pointer}
.ocs-layer{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden}
.ocs-root .ocs-bubble{position:absolute;height:17px;padding:0 7px 0 6px;border:0;border-radius:9px;
  display:flex;align-items:center;gap:3px;white-space:nowrap;cursor:pointer;
  background:#2563eb;color:#fff;font-size:9px;font-weight:600;line-height:17px;
  box-shadow:0 2px 7px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.85);pointer-events:auto;
  animation:ocs-pop .14s ease-out}
.ocs-root .ocs-bubble .ocs-bubble-icon{font-size:9px;line-height:1}
@keyframes ocs-pop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
.ocs-root .ocs-bubble:hover{filter:brightness(1.12)}
.ocs-pins{position:absolute;inset:0;pointer-events:none}
.ocs-root .ocs-pin{position:absolute;width:20px;height:20px;padding:0;border:2px solid #fff;border-radius:50%;
  background:var(--v2-accent,#3b82f6);color:#fff;font-size:11px;font-weight:700;line-height:16px;text-align:center;
  box-shadow:0 1px 3px rgba(0,0,0,.3);pointer-events:auto;user-select:none}
.ocs-root .ocs-pop{position:absolute;display:flex;flex-direction:column;gap:6px;width:220px;max-width:calc(100% - 8px);
  padding:8px;border-radius:6px;background:var(--v2-bg-base,#fff);color:var(--v2-text-base,inherit);
  border:1px solid var(--v2-border-base,rgba(127,127,127,.3));box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:auto}
.ocs-pop-title{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ocs-pop-row{display:flex;align-items:center;gap:6px}
.ocs-root .ocs-pop button.ocs-danger:hover:not(:disabled){border-color:#e5484d;color:#e5484d}
`;
var FRAME_DOC = '<!doctype html><html><head><meta charset="utf-8"><style>html,body,#root{height:100%;margin:0}</style></head>' + '<body><div id="root"></div></body></html>';
var SLIDE_REGION = '[data-pptx-viewport] [role="region"][aria-label^="Slide"]';
var clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
var viewerSource = null;
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls)
    n.className = cls;
  if (text != null)
    n.textContent = text;
  return n;
}
function button(text, title, onClick, cls) {
  const b = el("button", cls, text);
  b.type = "button";
  if (title)
    b.title = title;
  b.addEventListener("click", onClick);
  return b;
}
var baseName = (p) => String(p || "").split(/[\\/]/).pop();
var errText = (err) => String(err && err.message || err);
var clip = (s, n) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};
function samePath(a, b) {
  if (!a || !b)
    return false;
  const norm = (p) => String(p).replace(/\//g, "\\");
  if (a === b)
    return true;
  const win = /^[a-z]:[\\/]/i.test(a) || a.startsWith("\\\\");
  return win && norm(a).toLowerCase() === norm(b).toLowerCase();
}
function createSlidesView(api) {
  const root = el("div", "ocs-root");
  root.style.height = "100%";
  const style = el("style");
  style.textContent = CSS;
  root.appendChild(style);
  const state = {
    path: null,
    ready: false,
    slideCount: 0,
    slide: 0,
    selection: [],
    comments: [],
    dirty: false,
    save: "",
    conflict: false,
    busy: false,
    canUndo: false,
    canRedo: false
  };
  let nextId = 1;
  let docToken = 0;
  let disposed = false;
  let unsubChanged = null;
  let unregisterCapture = null;
  let saveTimer = null;
  let saving = null;
  let captureChain = Promise.resolve();
  let lastDark = null;
  const header = el("div", "ocs-header");
  const openBtn = button("Open", "Open a .pptx file", () => openDeck());
  const nameEl = el("span", "ocs-name");
  const saveEl = button("", "Save now (Ctrl+S)", () => saveNow(), "ocs-save ocs-muted");
  const reloadBtn = button("↻", "Reload from disk (saves pending edits first)", async () => {
    if (!state.path)
      return;
    try {
      await flushSave(true);
    } catch {
      return;
    }
    reloadFromDisk("Reloaded");
  });
  const arrow = (flip) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"${flip ? ' style="transform:scaleX(-1)"' : ""}><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>`;
  const undoBtn = button("", "Undo (Ctrl+Z)", () => history("undo"), "ocs-hist");
  const redoBtn = button("", "Redo (Ctrl+Y)", () => history("redo"), "ocs-hist");
  undoBtn.innerHTML = arrow(false);
  redoBtn.innerHTML = arrow(true);
  undoBtn.setAttribute("aria-label", "Undo");
  redoBtn.setAttribute("aria-label", "Redo");
  const prevBtn = button("‹", "Previous slide (←)", () => step(-1), "ocs-nav");
  const counterEl = el("span", "ocs-counter ocs-muted");
  const nextBtn = button("›", "Next slide (→)", () => step(1), "ocs-nav");
  let tools = safe(() => localStorage.getItem("opencode-slides:tools") === "1", false);
  const toolsBtn = button("Edit", "Show/hide the editing tools (ribbon, thumbnails, panels)", () => {
    tools = !tools;
    safe(() => localStorage.setItem("opencode-slides:tools", tools ? "1" : "0"));
    applyTools();
    renderHeader();
  });
  header.append(openBtn, nameEl, saveEl, undoBtn, redoBtn, prevBtn, counterEl, nextBtn, toolsBtn, reloadBtn);
  function history(kind) {
    const a = app();
    if (a)
      safe(() => a[kind]());
    syncHistory();
    focusEditor();
  }
  function syncHistory() {
    const a = app();
    if (!a || !state.ready)
      return;
    const u = !!safe(() => a.canUndo(), false);
    const r = !!safe(() => a.canRedo(), false);
    if (u !== state.canUndo || r !== state.canRedo) {
      state.canUndo = u;
      state.canRedo = r;
      renderHeader();
    }
  }
  const historyTimer = setInterval(syncHistory, 300);
  function focusEditor() {
    safe(() => iframe.contentWindow.focus());
  }
  function step(delta) {
    const a = app();
    if (!a || !state.slideCount)
      return;
    const next = Math.max(0, Math.min(state.slideCount - 1, state.slide + delta));
    if (next !== state.slide)
      a.goTo(next);
  }
  const statusEl = el("div", "ocs-status ocs-muted");
  const banner = el("div", "ocs-banner");
  banner.setAttribute("role", "status");
  banner.append(el("span", null, "File changed on disk."), button("Reload", "Discard my edits and load the file from disk", () => {
    state.conflict = false;
    reloadFromDisk("Updated from disk");
  }), button("Keep mine", "Keep my edits; the next autosave overwrites the file", () => {
    state.conflict = false;
    if (state.dirty)
      scheduleSave();
    render();
  }));
  const empty = el("div", "ocs-empty");
  empty.append(el("div", "ocs-muted", "No deck open. Open a .pptx to view and edit it, comment on elements, and send them to the model."), button("Open deck…", null, () => openDeck(), "ocs-primary"));
  const frameBox = el("div", "ocs-frame");
  const iframe = el("iframe");
  iframe.title = "Slides editor";
  iframe.srcdoc = FRAME_DOC;
  frameBox.appendChild(iframe);
  let frameLoads = 0;
  let frameWaiters = [];
  let mountedWin = null;
  function onFrameLoad() {
    frameLoads++;
    const waiters = frameWaiters;
    frameWaiters = [];
    waiters.forEach((r) => r());
    if (frameLoads > 1 && state.path && mountedWin && mountedWin !== iframe.contentWindow) {
      mountedWin = null;
      openPath(state.path, { initialSlide: state.slide, status: "" });
    }
  }
  iframe.addEventListener("load", onFrameLoad);
  async function frameWindow() {
    if (!frameLoads)
      await new Promise((r) => frameWaiters.push(r));
    const win = iframe.contentWindow;
    if (!win || !win.document || !win.document.getElementById("root")) {
      await new Promise((r) => frameWaiters.push(r));
    }
    return iframe.contentWindow;
  }
  async function viewerScript() {
    if (!viewerSource) {
      viewerSource = Promise.resolve(api.loadViewerScript());
      viewerSource.catch(() => viewerSource = null);
    }
    return viewerSource;
  }
  async function ensureApp() {
    const [win, source] = await Promise.all([frameWindow(), viewerScript()]);
    if (win.SlidesApp)
      return win.SlidesApp;
    const doc = win.document;
    const script = doc.createElement("script");
    script.textContent = source;
    (doc.head || doc.documentElement).appendChild(script);
    if (!win.SlidesApp) {
      try {
        new win.Function(source)();
      } catch (err) {
        throw new Error("Cannot start the slide editor: " + errText(err));
      }
    }
    if (!win.SlidesApp)
      throw new Error("Cannot start the slide editor: viewer script did not define SlidesApp");
    return win.SlidesApp;
  }
  function app() {
    const win = iframe.contentWindow;
    return mountedWin && win === mountedWin ? win.SlidesApp : null;
  }
  const bar = el("div", "ocs-bar");
  const contextEl = el("div", "ocs-context ocs-muted");
  const input = el("textarea");
  input.placeholder = "Describe a change, or click an element on the slide to target it";
  input.title = "Enter sends · Alt+Enter queues · Shift+Enter new line";
  input.rows = 1;
  let userHeight = Number(safe(() => localStorage.getItem("opencode-slides:barH"), 0)) || 0;
  const grow = () => {
    if (userHeight) {
      input.style.height = userHeight + "px";
      return;
    }
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight + 2, 96) + "px";
  };
  if (userHeight)
    input.style.height = userHeight + "px";
  const grip = el("div", "ocs-bar-grip");
  grip.title = "Drag to resize (double-click to reset)";
  grip.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    const y0 = e.clientY;
    const h0 = input.offsetHeight;
    const move = (ev) => {
      userHeight = clamp(Math.round(h0 + (y0 - ev.clientY)), 26, Math.max(60, Math.round(root.offsetHeight * 0.6)));
      grow();
      layout();
    };
    const up = () => {
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", up);
      safe(() => localStorage.setItem("opencode-slides:barH", String(userHeight)));
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", up);
  });
  grip.addEventListener("dblclick", () => {
    userHeight = 0;
    safe(() => localStorage.removeItem("opencode-slides:barH"));
    grow();
    layout();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing)
      return;
    e.preventDefault();
    if (e.altKey)
      addComment();
    else
      send("comments");
  });
  input.addEventListener("input", () => {
    grow();
    renderButtons();
  });
  const addBtn = button("+ Queue", "Queue this request for the selection and write another (Alt+Enter)", () => addComment());
  const sendBtn = button("Send", "Send queued comments with slide images (Enter)", () => send("comments"), "ocs-primary");
  const compose = el("div", "ocs-compose");
  compose.append(input, addBtn, sendBtn);
  const barHead = el("div", "ocs-bar-head");
  const countEl = el("span", "ocs-count");
  const queueEl = el("div", "ocs-queue");
  const attachLabel = el("label", "ocs-check ocs-muted");
  const attachAll = el("input");
  attachAll.type = "checkbox";
  attachLabel.append(attachAll, document.createTextNode("All slides"));
  attachLabel.title = "Attach images of all slides (default: only slides with comments)";
  const reviewBtn = button("Review", "Ask the model to review all slides (text box = optional note)", () => send("review"));
  barHead.append(el("span", "ocs-bar-title", "✎ Ask AI to edit"), contextEl, countEl, attachLabel, reviewBtn);
  contextEl.className = "ocs-target";
  bar.append(grip, barHead, queueEl, compose);
  root.append(header, statusEl, banner, empty, frameBox, bar);
  function setStatus(text, error) {
    statusEl.textContent = text || "";
    statusEl.title = text || "";
    statusEl.className = "ocs-status " + (error ? "ocs-error" : "ocs-muted");
    statusEl.style.display = text ? "" : "none";
  }
  function setSave(s) {
    state.save = s;
    renderHeader();
  }
  async function openDeck() {
    let p;
    try {
      p = await api.pickDeck();
    } catch (err) {
      setStatus(errText(err), true);
      return;
    }
    if (!p || disposed)
      return;
    if (!samePath(p, state.path)) {
      try {
        await flushSave();
      } catch {}
    }
    try {
      api.remember && api.remember(p);
    } catch {}
    openPath(p, { initialSlide: samePath(p, state.path) ? state.slide : 0 });
  }
  function subscribe(path) {
    if (unsubChanged)
      unsubChanged();
    unsubChanged = null;
    if (!api.onChanged)
      return;
    unsubChanged = api.onChanged(path, () => {
      if (!disposed && samePath(state.path, path))
        onExternalChange();
    });
  }
  function viewerOptions(initialSlide) {
    return {
      initialSlide,
      dark: isDark(),
      tools,
      path: state.path,
      onSaveRequest() {
        if (!disposed)
          saveNow();
      },
      onDownload(file) {
        if (!disposed && file)
          exportFile(file.name, file.bytes);
      },
      async onSaveAs(file) {
        if (disposed || !file)
          return;
        const saved = await exportFile(file.name, file.bytes, "Saved as");
        if (saved && /\.pptx$/i.test(saved) && !samePath(saved, state.path)) {
          try {
            api.remember && api.remember(saved);
          } catch {}
          openPath(saved, { initialSlide: state.slide, status: "" });
          setStatus(`Saved as ${baseName(saved)} — now editing it`);
        }
        return saved ? { fileName: baseName(saved) } : undefined;
      },
      onPrint() {
        if (!disposed)
          printDeck();
      },
      onMenu(open) {
        if (disposed || tools === !!open)
          return;
        tools = !!open;
        safe(() => localStorage.setItem("opencode-slides:tools", tools ? "1" : "0"));
        renderHeader();
      },
      onReady(info) {
        if (disposed)
          return;
        state.ready = true;
        state.slideCount = info && info.slideCount || safe(() => app().getSlideCount(), 0);
        if (statusEl.textContent === "Loading editor…" || statusEl.textContent === "Loading…")
          setStatus("");
        render();
      },
      onSelection(items) {
        const next = Array.from(items || []);
        const key = (l) => l.map((i) => i.slide + ":" + i.elementId).join(",");
        if (key(next) !== key(state.selection))
          bubbleHidden = false;
        state.selection = next;
        renderContext();
        layout();
      },
      onSlide(index) {
        bubbleHidden = false;
        state.slide = index;
        closePop();
        renderContext();
        renderHeader();
        renderPins();
        layout();
      },
      onHistory(h) {
        if (disposed)
          return;
        state.canUndo = !!(h && h.canUndo);
        state.canRedo = !!(h && h.canRedo);
        renderHeader();
      },
      onDirty(dirty) {
        if (disposed)
          return;
        state.dirty = !!dirty;
        if (dirty) {
          setSave(saving ? "saving" : "unsaved");
          if (!state.conflict)
            scheduleSave();
        } else if (!saving)
          setSave("saved");
      }
    };
  }
  async function openPath(path, { initialSlide = 0, status = "Loading editor…" } = {}) {
    const token = ++docToken;
    const changedPath = !samePath(path, state.path);
    state.path = path;
    if (changedPath) {
      state.comments = [];
      state.selection = [];
      state.slide = initialSlide;
      state.conflict = false;
      subscribe(path);
    }
    state.ready = false;
    state.dirty = false;
    clearTimeout(saveTimer);
    saveTimer = null;
    setSave("");
    if (status)
      setStatus(status);
    render();
    try {
      const [App, deck] = await Promise.all([ensureApp(), api.readDeck(path)]);
      if (token !== docToken || disposed)
        return;
      const win = iframe.contentWindow;
      const bytes = new win.Uint8Array(deck.bytes);
      if (mountedWin === win) {
        App.load(bytes, { initialSlide });
      } else {
        mountedWin = win;
        try {
          App.mount(win.document.getElementById("root"), bytes, viewerOptions(initialSlide));
          if (!win.__ocsSaveKey) {
            win.__ocsSaveKey = true;
            win.document.addEventListener("keydown", onSaveKey, true);
          }
        } catch (err) {
          mountedWin = null;
          throw err;
        }
      }
      setSave("saved");
    } catch (err) {
      if (token !== docToken || disposed)
        return;
      setStatus(errText(err), true);
    }
    render();
  }
  function reloadFromDisk(status) {
    if (!state.path)
      return;
    const a = app();
    const slide = a ? safe(() => a.getActiveSlide(), state.slide) : state.slide;
    state.conflict = false;
    openPath(state.path, { initialSlide: slide, status: "Loading…" }).then(() => {
      if (!disposed && status && statusEl.className.indexOf("ocs-error") < 0)
        setStatus(status);
    });
  }
  function onExternalChange() {
    const label = state.awaitingModel ? "Updated by model" : "Updated from disk";
    state.awaitingModel = false;
    if (!app())
      return reloadFromDisk(label);
    if (state.dirty || saving || saveTimer) {
      state.conflict = true;
      clearTimeout(saveTimer);
      saveTimer = null;
      render();
    } else {
      reloadFromDisk(label);
    }
  }
  function saveNow() {
    if (!state.path || !state.ready)
      return;
    flushSave(true).then(() => !disposed && !state.dirty && setSave("saved"), () => {});
  }
  function applyTools() {
    const a = app();
    if (!a)
      return;
    safe(() => tools ? a.openMenu?.() : a.closeMenu?.());
  }
  const dirOf = (p) => String(p || "").replace(/[\\/][^\\/]*$/, "");
  async function exportFile(name, bytes, verb = "Exported to") {
    if (!api.saveFile) {
      setStatus("Saving files is not available here", true);
      return null;
    }
    try {
      const r = await api.saveFile({ name, bytes: new Uint8Array(bytes), defaultDir: state.exportDir || dirOf(state.path) });
      if (!r || r.canceled || !r.path) {
        setStatus("");
        return null;
      }
      state.exportDir = dirOf(r.path);
      setStatus(`${verb} ${baseName(r.path)}`);
      return r.path;
    } catch (err) {
      setStatus("Save failed: " + errText(err), true);
      return null;
    }
  }
  async function printDeck() {
    const a = app();
    if (!a || typeof a.exportPdf !== "function")
      return;
    try {
      setStatus("Preparing PDF…");
      const bytes = await a.exportPdf();
      const name = baseName(state.path).replace(/\.pptx$/i, "") + ".pdf";
      if (api.openPrint) {
        await api.openPrint({ name, bytes: new Uint8Array(bytes) });
        setStatus("Opened the PDF in your PDF viewer for printing");
      } else
        await exportFile(name, bytes);
    } catch (err) {
      setStatus("Print failed: " + errText(err), true);
    }
  }
  const isTyping = (t) => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ""));
  function onSaveKey(e) {
    if (e.isComposing || !(e.ctrlKey || e.metaKey) || e.altKey)
      return false;
    const k = e.key.toLowerCase();
    const done = () => {
      e.preventDefault();
      e.stopPropagation();
      return true;
    };
    if (k === "s") {
      saveNow();
      return done();
    }
    if (!state.path || isTyping(e.target))
      return false;
    const a = app();
    if (!a || !state.ready)
      return false;
    if (k === "p" && !e.shiftKey) {
      printDeck();
      return done();
    }
    if ((k === "b" || k === "i" || k === "u") && !e.shiftKey) {
      safe(() => a.toggleFormat({ b: "bold", i: "italic", u: "underline" }[k]));
      return done();
    }
    if (k === "home" || k === "end") {
      a.goTo(k === "home" ? 0 : state.slideCount - 1);
      return done();
    }
    return false;
  }
  const FORWARD = /^(z|y|c|x|v|d|a|g|m|l|e|r|j|\[|\]|<|>|,|\.)$/i;
  root.addEventListener("keydown", (e) => {
    if (onSaveKey(e) || isTyping(e.target) || !state.ready)
      return;
    const k = e.key;
    const mod = e.ctrlKey || e.metaKey;
    const forward = mod && !e.altKey && FORWARD.test(k) || k === "Delete" || k === "F5" || k === "PageUp" || k === "PageDown" || !mod && /^Arrow/.test(k) && e.target === document.body;
    if (!forward)
      return;
    const win = iframe.contentWindow;
    if (!win)
      return;
    e.preventDefault();
    win.focus();
    win.dispatchEvent(new win.KeyboardEvent("keydown", {
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      bubbles: true,
      cancelable: true
    }));
  });
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      flushSave().catch(() => {});
    }, 1200);
  }
  async function flushSave(force = false) {
    clearTimeout(saveTimer);
    saveTimer = null;
    while (saving)
      await saving.catch(() => {});
    const a = app();
    if (!a || !state.path || state.conflict)
      return;
    if (!force && !safe(() => a.isDirty(), state.dirty))
      return;
    saving = doSave(a, state.path, docToken);
    try {
      await saving;
    } finally {
      saving = null;
    }
  }
  async function doSave(a, path, token) {
    setSave("saving");
    try {
      const content = await a.getContent();
      if (token !== docToken || disposed)
        return;
      await api.writeDeck(path, new Uint8Array(content));
      if (token !== docToken || disposed)
        return;
      a.markSaved();
      state.dirty = false;
      setSave("saved");
    } catch (err) {
      if (token !== docToken || disposed)
        return;
      setSave("error");
      setStatus(errText(err), true);
      throw err;
    }
  }
  function currentTargets() {
    if (state.selection.length)
      return state.selection.map((s) => ({ slide: s.slide, shape: s }));
    return [{ slide: state.slide + 1, shape: null }];
  }
  function addComment(target, text) {
    const fromBar = !target;
    const body = fromBar ? input.value.trim() : String(text || "").trim();
    if (!body || !app()) {
      if (fromBar)
        input.focus();
      return false;
    }
    for (const t of fromBar ? currentTargets() : [target]) {
      state.comments.push({ id: nextId++, slide: t.slide, shape: t.shape, text: body });
    }
    if (fromBar)
      input.value = "";
    render();
    return true;
  }
  async function capture(slides1) {
    const a = app();
    if (!a)
      throw new Error("not open");
    const n = safe(() => a.getSlideCount(), state.slideCount);
    const list = (slides1 && slides1.length ? slides1 : Array.from({ length: n }, (_, i) => i + 1)).filter((s) => Number.isInteger(s) && s >= 1 && s <= n);
    const run = captureChain.then(async () => {
      const win = iframe.contentWindow;
      const urls = await a.capture(win.Array.from(list, (s) => s - 1), { width: 1280 });
      return { slides: list, urls: Array.from(urls || []) };
    });
    captureChain = run.catch(() => {});
    return run;
  }
  async function send(mode) {
    if (state.busy || !state.path || !app())
      return;
    let note = "";
    if (mode === "comments") {
      if (input.value.trim())
        addComment();
      if (!state.comments.length) {
        setStatus("Write a comment first");
        input.focus();
        return;
      }
    } else {
      note = input.value.trim();
    }
    state.busy = true;
    renderButtons();
    const path = state.path;
    const sent = mode === "comments" ? state.comments.slice() : [];
    try {
      setStatus("Saving…");
      await flushSave();
      setStatus("Capturing slides…");
      let slides;
      if (mode === "review" || attachAll.checked)
        slides = [];
      else {
        slides = [...new Set(sent.map((c) => c.slide))].sort((a, b) => a - b);
        if (!slides.length)
          slides = [state.slide + 1];
      }
      const shot = await capture(slides);
      const images = shot.slides.map((slide, i) => ({ slide, uri: shot.urls[i] || "" })).filter((x) => x.uri);
      setStatus("Sending…");
      await api.send({
        deck: path,
        mode,
        note,
        comments: sent.map((c) => ({ slide: c.slide, shape: c.shape, text: c.text })),
        images
      });
      if (disposed)
        return;
      const ids = new Set(sent.map((c) => c.id));
      state.comments = state.comments.filter((c) => !ids.has(c.id));
      if (mode === "review" || !input.value.trim())
        input.value = "";
      state.awaitingModel = true;
      setStatus("Sent to model — the slide updates here when the model saves");
    } catch (err) {
      if (disposed)
        return;
      setStatus(errText(err), true);
    } finally {
      state.busy = false;
    }
    render();
  }
  const layer = el("div", "ocs-layer");
  const bubbleBtn = button("", "Describe a change for the model to make to this element", () => openNew(), "ocs-bubble");
  bubbleBtn.append(el("span", "ocs-bubble-icon", "✎"), document.createTextNode("Ask AI to edit"));
  let lastPointer = null;
  bubbleBtn.style.display = "none";
  const pinsEl = el("div", "ocs-pins");
  const popEl = el("div", "ocs-pop");
  popEl.style.display = "none";
  const popTitle = el("div", "ocs-muted ocs-pop-title");
  const popText = el("textarea");
  popText.rows = 2;
  popText.placeholder = "What should the AI change? e.g. make it bold and red (Enter to add)";
  const popDelete = button("Delete", "Delete this comment", () => popDeleteNow(), "ocs-danger");
  const popCancel = button("Cancel", null, () => closePop());
  const popPrimary = button("Add", null, () => popCommit(), "ocs-primary");
  const popRow = el("div", "ocs-pop-row");
  popRow.append(popDelete, el("span", "ocs-grow"), popCancel, popPrimary);
  popEl.append(popTitle, popText, popRow);
  layer.append(bubbleBtn, pinsEl, popEl);
  frameBox.appendChild(layer);
  let popState = null;
  let raf = 0;
  let lastPoll = 0;
  let listenedDoc = null;
  const targetName = (t) => t.shape ? t.shape.name || t.shape.type || "element" : "slide " + t.slide;
  const frameDoc = () => iframe.contentWindow && iframe.contentWindow.document || null;
  function cssEscape(s) {
    const C = iframe.contentWindow && iframe.contentWindow.CSS;
    return C && C.escape ? C.escape(s) : String(s).replace(/["\\]/g, "\\$&");
  }
  function slideRegion(n) {
    const doc = frameDoc();
    if (!doc)
      return null;
    let best = null;
    let area = 0;
    for (const r of doc.querySelectorAll(SLIDE_REGION)) {
      const label = r.getAttribute("aria-label") || "";
      if (label !== "Slide " + n && !label.startsWith("Slide " + n + " "))
        continue;
      const b = r.getBoundingClientRect();
      if (b.width * b.height > area) {
        area = b.width * b.height;
        best = r;
      }
    }
    return best;
  }
  function targetRect(t) {
    const doc = frameDoc();
    if (!t || !doc)
      return null;
    const region = slideRegion(t.slide);
    let node = region;
    if (t.shape) {
      node = null;
      if (t.shape.elementId != null) {
        node = (region || doc).querySelector(`[data-element-id="${cssEscape(String(t.shape.elementId))}"]`);
      }
    }
    if (!node)
      return null;
    const b = node.getBoundingClientRect();
    if (!b.width && !b.height)
      return null;
    const win = doc.defaultView;
    const x = Math.min(Math.max(b.left + b.width / 2, 1), (win?.innerWidth || 1) - 1);
    const y = Math.min(Math.max(b.top + Math.min(b.height / 2, 12), 1), (win?.innerHeight || 1) - 1);
    const hit = doc.elementFromPoint(x, y);
    const scope = region || node;
    if (!hit || !(scope === hit || scope.contains(hit)))
      return null;
    return b;
  }
  let bubbleHidden = false;
  let dragFrom = null;
  function hideBubble() {
    if (bubbleHidden)
      return;
    bubbleHidden = true;
    layout();
  }
  function onFrameKey(e) {
    if (e.key === "Escape" || /^(Control|Shift|Alt|Meta|CapsLock)$/.test(e.key))
      return;
    hideBubble();
  }
  function onFrameMove(e) {
    if (!dragFrom || !(e.buttons & 1))
      return;
    if (Math.abs(e.clientX - dragFrom.x) + Math.abs(e.clientY - dragFrom.y) > 4)
      hideBubble();
  }
  const frameEvents = [
    ["scroll", () => layout()],
    ["pointerdown", (e) => (dragFrom = { x: e.clientX, y: e.clientY }, onFramePointerDown(e))],
    ["pointermove", onFrameMove],
    ["pointerup", () => dragFrom = null],
    ["dblclick", hideBubble],
    ["keydown", onFrameKey]
  ];
  function syncFrameListeners() {
    const doc = frameDoc();
    if (doc === listenedDoc)
      return;
    if (listenedDoc)
      for (const [t, f] of frameEvents)
        listenedDoc.removeEventListener(t, f, true);
    listenedDoc = doc;
    if (doc)
      for (const [t, f] of frameEvents)
        doc.addEventListener(t, f, true);
  }
  function onFramePointerDown(e) {
    lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() };
    if (popState)
      closePop();
  }
  function openNew() {
    const sel = state.selection[0];
    if (!sel || sel.slide !== state.slide + 1 || !app())
      return;
    const target = { slide: sel.slide, shape: sel };
    showPop({ kind: "new", target }, "Ask AI to edit " + clip(targetName(target), 60), "", false);
  }
  function openEdit(c) {
    const target = { slide: c.slide, shape: c.shape };
    showPop({ kind: "edit", commentId: c.id, target }, "Ask AI to edit " + clip(targetName(target), 60), c.text, true);
  }
  function showPop(next, title, text, editing) {
    popState = next;
    popTitle.textContent = title;
    popTitle.title = title;
    popText.value = text;
    popPrimary.textContent = editing ? "Save" : "Add";
    popPrimary.disabled = !text.trim();
    popDelete.style.display = editing ? "" : "none";
    popEl.style.display = "";
    layout();
    popText.focus();
    popText.setSelectionRange(text.length, text.length);
  }
  function closePop() {
    popState = null;
    popEl.style.display = "none";
    layout();
  }
  function popCommit() {
    if (!popState)
      return;
    const text = popText.value.trim();
    if (!text)
      return;
    if (popState.kind === "new") {
      if (!addComment(popState.target, text))
        return;
    } else {
      const c = state.comments.find((x) => x.id === popState.commentId);
      if (c)
        c.text = text;
    }
    closePop();
    render();
  }
  function popDeleteNow() {
    if (!popState || popState.kind !== "edit")
      return;
    const id = popState.commentId;
    state.comments = state.comments.filter((c) => c.id !== id);
    closePop();
    render();
  }
  popText.addEventListener("keydown", (e) => {
    if (e.isComposing)
      return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closePop();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      popCommit();
    }
  });
  popText.addEventListener("input", () => {
    popPrimary.disabled = !popText.value.trim();
  });
  function renderPins() {
    pinsEl.replaceChildren();
    const cur = state.slide + 1;
    state.comments.forEach((c, i) => {
      if (c.slide !== cur)
        return;
      const pin = el("div", "ocs-pin", String(i + 1));
      pin.title = c.text;
      pin.tabIndex = 0;
      pin.setAttribute("role", "button");
      pin.setAttribute("aria-label", "Comment " + (i + 1));
      pin._target = { slide: c.slide, shape: c.shape };
      pin.addEventListener("click", (e) => {
        e.stopPropagation();
        openEdit(c);
      });
      pin.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ")
          return;
        e.preventDefault();
        pin.click();
      });
      pinsEl.appendChild(pin);
    });
  }
  function layout() {
    if (disposed)
      return;
    syncFrameListeners();
    const cur = state.slide + 1;
    const fw = frameBox.clientWidth;
    const fh = frameBox.clientHeight;
    const fr = frameBox.getBoundingClientRect();
    const ir = iframe.getBoundingClientRect();
    const ox = ir.left - fr.left;
    const oy = ir.top - fr.top;
    const rectOf = (t) => {
      const r = targetRect(t);
      if (!r)
        return null;
      return { left: r.left + ox, top: r.top + oy, right: r.right + ox, bottom: r.bottom + oy };
    };
    const visible = (r) => r.right > 0 && r.bottom > 0 && r.left < fw && r.top < fh;
    if (popState) {
      const stale = popState.kind === "edit" && !state.comments.some((c) => c.id === popState.commentId);
      if (stale || popState.target.slide !== cur) {
        popState = null;
        popEl.style.display = "none";
      }
    }
    const sel = state.selection[0];
    const bub = app() && !popState && !bubbleHidden && sel && sel.slide === cur ? rectOf(sel) : null;
    if (bub && visible(bub)) {
      bubbleBtn.style.display = "";
      const bw = bubbleBtn.offsetWidth || 70;
      const bh = bubbleBtn.offsetHeight || 17;
      const p = lastPointer && Date.now() - lastPointer.t < 60000 ? { x: lastPointer.x + ox, y: lastPointer.y + oy } : null;
      const near = p && p.x >= bub.left - 24 && p.x <= bub.right + 24 && p.y >= bub.top - 24 && p.y <= bub.bottom + 24;
      let left = near ? p.x + 12 : bub.right + 4;
      let top = near ? p.y - bh - 10 : bub.top - bh - 4;
      if (top < 2)
        top = near ? p.y + 16 : bub.top + 4;
      if (left + bw > fw - 2)
        left = (near ? p.x : bub.right) - bw - 12;
      bubbleBtn.style.left = clamp(left, 2, fw - bw - 2) + "px";
      bubbleBtn.style.top = clamp(top, 2, fh - bh - 2) + "px";
    } else {
      bubbleBtn.style.display = "none";
    }
    for (const pin of pinsEl.children) {
      const r = rectOf(pin._target);
      if (!r || !visible(r)) {
        pin.style.display = "none";
        continue;
      }
      pin.style.display = "";
      pin.style.left = r.left - 20 + "px";
      pin.style.top = r.top - 20 + "px";
    }
    if (popState) {
      const r = rectOf(popState.target);
      if (!r) {
        popEl.style.display = "none";
      } else {
        popEl.style.display = "";
        const w = popEl.offsetWidth || 220;
        const h = popEl.offsetHeight;
        let top = r.bottom + 8;
        if (top + h > fh - 4 && r.top - h - 8 >= 4)
          top = r.top - h - 8;
        popEl.style.left = clamp(r.left, 4, fw - w - 4) + "px";
        popEl.style.top = clamp(top, 4, fh - h - 4) + "px";
      }
    }
    ensureLoop();
  }
  function wantsFrames() {
    if (disposed || !app())
      return !!popState && !disposed;
    if (popState)
      return true;
    const sel = state.selection[0];
    return !!sel && sel.slide === state.slide + 1 || pinsEl.childElementCount > 0;
  }
  function ensureLoop() {
    if (raf || !wantsFrames())
      return;
    raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    if (now - lastPoll >= 100) {
      lastPoll = now;
      layout();
    } else {
      ensureLoop();
    }
  }
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => layout()) : null;
  if (ro)
    ro.observe(frameBox);
  const onWindowResize = () => layout();
  window.addEventListener("resize", onWindowResize);
  const onIframeLoad = () => layout();
  iframe.addEventListener("load", onIframeLoad);
  if (api.registerCapture) {
    unregisterCapture = api.registerCapture(async (deckPath, slides1) => {
      if (disposed || !state.path || !app() || !state.ready)
        throw new Error("not open");
      if (deckPath && !samePath(deckPath, state.path))
        throw new Error("not open");
      return (await capture(Array.from(slides1 || []))).urls;
    });
  }
  function isDark() {
    return !!safe(() => api.dark && api.dark(), false);
  }
  const darkTimer = setInterval(() => {
    const d = isDark();
    if (d === lastDark)
      return;
    lastDark = d;
    root.classList.toggle("ocs-dark", d);
    const a = app();
    if (a)
      safe(() => a.setDark(d));
  }, 1000);
  lastDark = isDark();
  root.classList.toggle("ocs-dark", lastDark);
  function renderHeader() {
    nameEl.textContent = state.path ? baseName(state.path) : "";
    nameEl.title = state.path || "";
    const labels = { saved: "✓ Saved", saving: "Saving…", unsaved: "● Unsaved", error: "⚠ Save failed" };
    saveEl.textContent = labels[state.save] || "";
    saveEl.style.display = state.path && state.save ? "" : "none";
    saveEl.disabled = state.save === "saving";
    saveEl.className = "ocs-save " + (state.save === "error" ? "ocs-error" : state.save === "unsaved" ? "ocs-warn" : "ocs-muted");
    reloadBtn.disabled = !state.path;
    reloadBtn.style.display = state.path ? "" : "none";
    for (const node of [undoBtn, redoBtn])
      node.style.display = state.path ? "" : "none";
    undoBtn.disabled = !state.canUndo;
    redoBtn.disabled = !state.canRedo;
    const ready = !!state.path && state.ready && state.slideCount > 0;
    for (const node of [prevBtn, counterEl, nextBtn, toolsBtn])
      node.style.display = state.path ? "" : "none";
    counterEl.textContent = ready ? `${state.slide + 1} / ${state.slideCount}` : "";
    prevBtn.disabled = !ready || state.slide <= 0;
    nextBtn.disabled = !ready || state.slide >= state.slideCount - 1;
    toolsBtn.disabled = !ready;
    toolsBtn.classList.toggle("ocs-on", tools);
  }
  function renderContext() {
    if (!state.path)
      return;
    let text;
    const sel = state.selection;
    if (sel.length) {
      const first = sel[0];
      text = `${first.name || first.type || "element"} · slide ${first.slide}`;
      if (sel.length > 1)
        text += ` +${sel.length - 1} more`;
    } else {
      text = `Whole slide ${state.slide + 1}`;
    }
    contextEl.textContent = text;
    input.placeholder = sel.length ? `Describe the change to this ${sel[0].type && sel[0].type !== "unknown" ? sel[0].type : "element"}…` : "Describe a change for this slide, or click an element to target just it";
    contextEl.title = sel.length && sel[0].text ? clip(sel[0].text, 300) : text;
  }
  function renderQueue() {
    queueEl.replaceChildren();
    queueEl.style.display = state.comments.length ? "" : "none";
    countEl.textContent = state.comments.length ? `${state.comments.length} queued` : "";
    countEl.style.display = state.comments.length ? "" : "none";
    state.comments.forEach((c, i) => {
      const chip = el("div", "ocs-chip");
      chip.title = `Slide ${c.slide}: ${c.text}`;
      chip.tabIndex = 0;
      chip.setAttribute("role", "button");
      const body = el("div", "ocs-chip-body");
      body.append(el("span", "ocs-chip-where", `Slide ${c.slide} · ${c.shape ? c.shape.name || c.shape.type || "element" : "whole slide"}`), el("span", "ocs-chip-text", clip(c.text, 160)));
      chip.append(el("span", "ocs-chip-num", String(i + 1)), body);
      chip.appendChild(button("×", "Remove comment", (e) => {
        e.stopPropagation();
        state.comments = state.comments.filter((x) => x.id !== c.id);
        render();
      }));
      chip.addEventListener("click", () => {
        const a = app();
        if (a)
          safe(() => a.goTo(c.slide - 1));
      });
      chip.addEventListener("keydown", (e) => {
        if (e.target !== chip || e.key !== "Enter" && e.key !== " ")
          return;
        e.preventDefault();
        chip.click();
      });
      queueEl.appendChild(chip);
    });
  }
  function renderButtons() {
    const ok = !!app() && state.ready && !state.busy;
    addBtn.disabled = !ok || !input.value.trim();
    sendBtn.disabled = !ok || !state.comments.length && !input.value.trim();
    sendBtn.textContent = state.comments.length ? `Send all (${state.comments.length}) ➤` : "Send ➤";
    reviewBtn.disabled = !ok;
  }
  function render() {
    if (disposed)
      return;
    renderHeader();
    const open = !!state.path;
    empty.style.display = open ? "none" : "";
    frameBox.style.display = open ? "" : "none";
    bar.style.display = open ? "" : "none";
    banner.style.display = state.conflict ? "" : "none";
    renderContext();
    renderQueue();
    renderButtons();
    renderPins();
    layout();
  }
  function safe(fn, fallback) {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }
  setStatus("");
  render();
  if (api.initialPath)
    openPath(api.initialPath);
  return {
    element: root,
    async open(path, note) {
      if (disposed || !path)
        return;
      if (!samePath(path, state.path)) {
        try {
          await flushSave();
        } catch {}
        try {
          api.remember && api.remember(path);
        } catch {}
        await openPath(path, { initialSlide: 0 });
      }
      state.awaitingModel = true;
      if (note && !disposed)
        setStatus(note);
    },
    notice(note) {
      if (disposed)
        return;
      state.awaitingModel = true;
      if (note)
        setStatus(note);
    },
    dispose() {
      if (disposed)
        return;
      const a = app();
      const path = state.path;
      if (a && path && (state.dirty || saveTimer) && !state.conflict && !saving) {
        Promise.resolve(safe(() => a.getContent(), null)).then((c) => c && api.writeDeck(path, new Uint8Array(c))).catch(() => {});
      }
      disposed = true;
      docToken++;
      clearTimeout(saveTimer);
      clearInterval(darkTimer);
      clearInterval(historyTimer);
      cancelAnimationFrame(raf);
      raf = 0;
      if (ro)
        ro.disconnect();
      window.removeEventListener("resize", onWindowResize);
      iframe.removeEventListener("load", onIframeLoad);
      if (listenedDoc) {
        for (const [t, f] of frameEvents)
          listenedDoc.removeEventListener(t, f, true);
        listenedDoc = null;
      }
      popState = null;
      if (unsubChanged)
        unsubChanged();
      unsubChanged = null;
      if (unregisterCapture)
        safe(() => unregisterCapture());
      unregisterCapture = null;
      iframe.removeEventListener("load", onFrameLoad);
      if (a)
        safe(() => a.unmount());
      mountedWin = null;
      iframe.remove();
      root.remove();
    }
  };
}

// src/prompt.js
var clip2 = (text, max) => {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat;
};
var target = (comment) => {
  const shape = comment.shape;
  if (!shape)
    return `Slide ${comment.slide}, whole slide`;
  const text = clip2(shape.text, 160);
  const id = shape.shapeId ?? shape.id;
  return `Slide ${comment.slide}, ${id ? `shape id ${id} ` : ""}"${shape.name}" (${shape.type ?? shape.kind}${text ? `, text: "${text}"` : ""})`;
};
function buildPrompt(request) {
  const images = [...request.images].filter((image) => image.uri).sort((a, b) => a.slide - b.slide);
  const slides = images.map((image) => image.slide);
  const files = images.map((image) => ({ uri: image.uri, name: `slide-${image.slide}.png` }));
  const attached = slides.length ? `Attached are images of slide${slides.length > 1 ? "s" : ""} ${slides.join(", ")}, in that order, as currently rendered.` : "No slide images are attached.";
  const note = request.note?.trim();
  const lines = [];
  if (request.mode === "review") {
    lines.push(`Please review the PowerPoint deck at: ${request.deck}`, attached, "", note || "Look at each slide image and list concrete problems per slide: text overflow or clipping, overlaps, alignment, readability (font size, contrast), inconsistent styling, and content issues. Do not edit the file unless I ask.");
  } else {
    lines.push(`Please update the PowerPoint deck at: ${request.deck}`, attached, "", "Requested changes:");
    request.comments.forEach((comment, i) => lines.push(`${i + 1}. ${target(comment)}: ${comment.text.trim()}`));
    if (note)
      lines.push("", `Note: ${note}`);
    lines.push("", "How to edit: change the .pptx in place (for example with python-pptx). Shape ids are the slide-local `shape_id` values; slide numbers are 1-based in presentation order. Keep everything I did not mention unchanged and save to the same path. Afterwards call the `slide_screenshot` tool on the changed slides to check the result, then briefly list what you changed per comment.");
  }
  return { text: lines.join(`
`), files };
}

// src/main.js
var import_node_fs2 = require("node:fs");
var import_promises3 = require("node:fs/promises");
var import_node_path3 = require("node:path");
var import_node_os2 = require("node:os");

// src/render.js
var import_node_child_process = require("node:child_process");
var import_node_fs = require("node:fs");
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");
var import_node_os = require("node:os");
var import_node_crypto = require("node:crypto");
var HINT = "needs Python with python-pptx and pymupdf, and LibreOffice";
var inflight = new Map;
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    import_node_child_process.execFile(cmd, args, { windowsHide: true, timeout: 300000, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err)
        Object.assign(err, { stdout, stderr }), reject(err);
      else
        resolve({ stdout, stderr });
    });
  });
}
function pythonCandidates(python, script) {
  if (python)
    return [[python, ["-I", script]]];
  const list = [];
  if (process.platform === "win32")
    list.push(["py", ["-3", "-I", script]]);
  list.push(["python3", ["-I", script]], ["python", ["-I", script]]);
  return list;
}
async function runDeckPy(path, out, { python, soffice, script }) {
  const extra = [path, out];
  if (soffice)
    extra.push("--soffice", soffice);
  let last;
  for (const [cmd, args] of pythonCandidates(python, script)) {
    try {
      return await run(cmd, [...args, ...extra]);
    } catch (err) {
      last = err;
      if (err.code !== "ENOENT")
        break;
    }
  }
  const detail = `${last?.stderr || ""}
${last?.stdout || ""}`.trim() || last?.message || "unknown error";
  throw new Error(`Rendering failed (${HINT}): ${detail.slice(0, 2000)}`);
}
async function cachedManifest(cache, mtime) {
  try {
    const text = await import_promises.readFile(import_node_path.join(cache, "manifest.json"), "utf8");
    return Math.abs(JSON.parse(text).mtime - mtime) <= 0.001 ? text : null;
  } catch {
    return null;
  }
}
async function doRender(path, opts) {
  if (typeof path !== "string" || !import_node_path.isAbsolute(path))
    throw new Error(`Deck path must be absolute: ${path}`);
  if (!/\.pptx$/i.test(path))
    throw new Error(`Not a .pptx file: ${path}`);
  if (!opts?.script)
    throw new Error("renderDeck: missing script path");
  let st;
  try {
    st = await import_promises.stat(path);
  } catch {
    throw new Error(`Deck not found: ${path}`);
  }
  if (!st.isFile())
    throw new Error(`Deck is not a file: ${path}`);
  const cache = import_node_path.join(import_node_os.tmpdir(), "opencode-slides", import_node_crypto.createHash("sha1").update(path).digest("hex").slice(0, 16));
  let manifest = await cachedManifest(cache, st.mtimeMs / 1000);
  if (!manifest) {
    await import_promises.mkdir(cache, { recursive: true });
    await runDeckPy(path, cache, opts);
    manifest = await import_promises.readFile(import_node_path.join(cache, "manifest.json"), "utf8");
  }
  const images = await Promise.all((JSON.parse(manifest).slides || []).map(async (s) => s.image ? "data:image/png;base64," + (await import_promises.readFile(import_node_path.join(cache, s.image))).toString("base64") : ""));
  return { manifest, images };
}
function renderDeck(path, opts) {
  const running = inflight.get(path);
  if (running)
    return running;
  const p = doRender(path, opts).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}
function createWatchers(onChange, log) {
  const entries = new Map;
  const close = (e) => {
    clearTimeout(e.timer);
    try {
      e.watcher?.close();
    } catch {}
  };
  return {
    watch(path) {
      const existing = entries.get(path);
      if (existing)
        return void existing.refs++;
      const e = { refs: 1, watcher: null, timer: null };
      entries.set(path, e);
      const name = import_node_path.basename(path).toLowerCase();
      try {
        e.watcher = import_node_fs.watch(import_node_path.dirname(path), (_event, file) => {
          if (file && String(file).toLowerCase() !== name)
            return;
          clearTimeout(e.timer);
          e.timer = setTimeout(() => {
            if (entries.get(path) === e)
              onChange(path);
          }, 800);
        });
        e.watcher.on("error", (err) => log?.(`watch error for ${path}: ${err?.message || err}`));
      } catch (err) {
        log?.(`cannot watch ${path}: ${err?.message || err}`);
      }
    },
    unwatch(path) {
      const e = entries.get(path);
      if (!e || --e.refs > 0)
        return;
      entries.delete(path);
      close(e);
    },
    closeAll() {
      for (const e of entries.values())
        close(e);
      entries.clear();
    }
  };
}

// src/files.js
var import_promises2 = require("node:fs/promises");
var import_node_path2 = require("node:path");
var import_node_crypto2 = require("node:crypto");
var TMP_SUFFIX = ".tmp-opencode-slides";
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var sha1 = (buf) => import_node_crypto2.createHash("sha1").update(buf).digest("hex");
function checkDeckPath(path) {
  if (typeof path !== "string" || !import_node_path2.isAbsolute(path))
    throw new Error(`Deck path must be absolute: ${path}`);
  if (!/\.pptx$/i.test(path))
    throw new Error(`Not a .pptx file: ${path}`);
}
function createDeckFiles() {
  const own = new Map;
  const key = (path) => process.platform === "win32" ? path.toLowerCase() : path;
  return {
    async read(path) {
      checkDeckPath(path);
      let buf, st;
      try {
        [buf, st] = await Promise.all([import_promises2.readFile(path), import_promises2.stat(path)]);
      } catch (err) {
        throw new Error(err?.code === "ENOENT" ? `Deck not found: ${path}` : `Cannot read ${path}: ${err?.message || err}`);
      }
      return { data: buf.toString("base64"), mtime: st.mtimeMs };
    },
    async write(path, data) {
      checkDeckPath(path);
      if (typeof data !== "string" || !data)
        throw new Error("write: empty data");
      const buf = Buffer.from(data, "base64");
      if (buf.length < 4 || buf[0] !== 80 || buf[1] !== 75)
        throw new Error("write: data is not a .pptx (zip) file");
      const tmp = path + TMP_SUFFIX;
      const k = key(path);
      const previous = own.get(k);
      own.set(k, sha1(buf));
      try {
        await import_promises2.writeFile(tmp, buf);
        for (let attempt = 0;; attempt++) {
          try {
            await import_promises2.rename(tmp, path);
            break;
          } catch (err) {
            if (attempt >= 5 || !["EPERM", "EBUSY", "EACCES"].includes(err?.code))
              throw err;
            await sleep(100 * (attempt + 1));
          }
        }
      } catch (err) {
        if (previous === undefined)
          own.delete(k);
        else
          own.set(k, previous);
        await import_promises2.unlink(tmp).catch(() => {});
        throw new Error(`Cannot save ${path}: ${err?.message || err}`);
      }
      return { mtime: (await import_promises2.stat(path)).mtimeMs };
    },
    filterOwnWrites(onChange) {
      return async (path) => {
        const k = key(path);
        const mine = own.get(k);
        if (mine) {
          try {
            if (sha1(await import_promises2.readFile(path)) === mine)
              return;
          } catch {}
          own.delete(k);
        }
        onChange(path);
      };
    }
  };
}
async function readViewerScript(candidates) {
  const tried = [];
  for (const c of candidates) {
    if (typeof c !== "string" || !c)
      continue;
    const dirs = [c];
    try {
      if ((await import_promises2.stat(c)).isFile())
        dirs[0] = import_node_path2.dirname(c);
    } catch {}
    for (const dir of dirs) {
      const file = import_node_path2.join(dir, "dist", "viewer.js");
      tried.push(file);
      try {
        return await import_promises2.readFile(file, "utf8");
      } catch {}
    }
  }
  throw new Error(`Viewer script not found (run \`npm run build:viewer\`). Tried: ${tried.join(", ") || "nothing"}`);
}

// src/main.js
var PLUGIN_ID = "opencode-slides";
var IMAGE_MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml"
};
var electron = () => require("electron");
var safeName = (name) => import_node_path3.basename(String(name || "")).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") || "file";
var absolute = (path, what) => {
  if (typeof path !== "string" || !import_node_path3.isAbsolute(path))
    throw new Error(`${what} must be an absolute path: ${path}`);
  return path;
};
var filtersFor = (name) => {
  const ext = import_node_path3.extname(name).slice(1);
  return ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [];
};
function materializeScript(source) {
  const dir = import_node_path3.join(import_node_os2.tmpdir(), "opencode-slides");
  const file = import_node_path3.join(dir, "deck.py");
  let current = null;
  try {
    current = import_node_fs2.readFileSync(file, "utf8");
  } catch {}
  if (current !== source) {
    import_node_fs2.mkdirSync(dir, { recursive: true });
    import_node_fs2.writeFileSync(file, source, "utf8");
  }
  return file;
}
async function pluginPathFromHost(ctx) {
  try {
    const res = await ctx.client?.plugin?.list?.();
    const list = [res, res?.data, res?.plugins, res?.data?.plugins].find(Array.isArray) || [];
    const entry = list.find((p) => p?.id === PLUGIN_ID || p?.name === PLUGIN_ID);
    const path = entry?.source?.path ?? entry?.path;
    return typeof path === "string" ? path : null;
  } catch (err) {
    ctx.log?.error?.(`plugin.list: ${err?.message || err}`);
    return null;
  }
}
function setupMain(ctx, scriptSource, pluginDir) {
  const opts = ctx.options || {};
  let script = opts.renderScript;
  const renderOpts = () => {
    script ??= materializeScript(scriptSource);
    return { python: opts.python, soffice: opts.soffice, script };
  };
  let handle;
  const files = createDeckFiles();
  const watchers = createWatchers(files.filterOwnWrites((path) => handle?.emit("changed", { path })), (msg) => ctx.log?.error?.(msg));
  const loadViewer = async () => {
    const candidates = [opts.pluginDir, pluginDir, await pluginPathFromHost(ctx)];
    try {
      candidates.push(import_node_path3.join(import_node_os2.homedir(), ".config", "opencode", "plugins", PLUGIN_ID));
    } catch {}
    return readViewerScript(candidates);
  };
  const logged = (name, fn) => async (input) => {
    try {
      return await fn(input);
    } catch (err) {
      ctx.log?.error?.(`${name} ${input?.path ?? ""}: ${err?.message || err}`);
      throw err;
    }
  };
  handle = ctx.provide(Slides, {
    render: logged("render", ({ path }) => renderDeck(path, renderOpts())),
    watch: async ({ path }) => {
      try {
        watchers.watch(path);
      } catch (err) {
        ctx.log?.error?.(`watch ${path}: ${err?.message || err}`);
      }
    },
    unwatch: async ({ path }) => watchers.unwatch(path),
    read: logged("read", ({ path }) => files.read(path)),
    write: logged("write", ({ path, data }) => files.write(path, data)),
    viewerScript: logged("viewerScript", () => loadViewer()),
    saveAs: logged("saveAs", async ({ name, data, defaultDir }) => {
      const { dialog, BrowserWindow } = electron();
      const file = safeName(name);
      const dir = defaultDir && import_node_path3.isAbsolute(defaultDir) ? defaultDir : import_node_os2.homedir();
      const res = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow() ?? undefined, {
        defaultPath: import_node_path3.join(dir, file),
        filters: filtersFor(file)
      });
      if (res.canceled || !res.filePath)
        return { path: "", canceled: true };
      await import_promises3.writeFile(res.filePath, Buffer.from(data, "base64"));
      return { path: res.filePath, canceled: false };
    }),
    reveal: logged("reveal", async ({ path }) => {
      electron().shell.showItemInFolder(absolute(path, "reveal path"));
    }),
    openExternal: logged("openExternal", async ({ path, name, data }) => {
      let target = path;
      if (data != null) {
        const dir = import_node_path3.join(import_node_os2.tmpdir(), PLUGIN_ID, "print");
        await import_promises3.mkdir(dir, { recursive: true });
        target = import_node_path3.join(dir, safeName(name || "print.pdf"));
        await import_promises3.writeFile(target, Buffer.from(data, "base64"));
      }
      absolute(target, "openExternal path");
      if (!/\.pdf$/i.test(target))
        throw new Error(`openExternal only opens .pdf files: ${target}`);
      const err = await electron().shell.openPath(target);
      if (err)
        throw new Error(err);
      return { path: target };
    }),
    pickImage: logged("pickImage", async () => {
      const { dialog, BrowserWindow } = electron();
      const res = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() ?? undefined, {
        properties: ["openFile"],
        filters: [{ name: "Images", extensions: Object.keys(IMAGE_MIME) }]
      });
      const file = res.canceled ? undefined : res.filePaths?.[0];
      if (!file)
        return { name: "", data: "", mime: "" };
      const ext = import_node_path3.extname(file).slice(1).toLowerCase();
      return {
        name: import_node_path3.basename(file),
        data: (await import_promises3.readFile(file)).toString("base64"),
        mime: IMAGE_MIME[ext] || "application/octet-stream"
      };
    })
  });
  ctx.onCleanup?.(() => watchers.closeAll());
  return handle;
}

// render/deck.py
var deck_default = `"""Render a .pptx into per-slide PNGs plus a manifest of shape boxes.

Usage: python -I deck.py <deck.pptx> <out_dir> [--soffice PATH] [--dpi N]

Writes <out_dir>/slide-<n>.png and <out_dir>/manifest.json:
{
  "deck": "...", "width": EMU, "height": EMU, "mtime": float,
  "slides": [{"index": 1, "image": "slide-1.png", "title": str, "notes": str,
              "shapes": [{"id": int, "name": str, "kind": str, "text": str,
                          "box": [x, y, w, h]}]}]
}
Box values are fractions of the slide size (0..1), so the UI can overlay them
on an image of any size.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

import pymupdf
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

DEFAULT_SOFFICE = [
    r"C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    r"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "soffice",
    "libreoffice",
]


def find_soffice(explicit):
    for cand in [explicit] + DEFAULT_SOFFICE if explicit else DEFAULT_SOFFICE:
        if os.path.isabs(cand) and os.path.exists(cand):
            return cand
        found = shutil.which(cand)
        if found:
            return found
    raise SystemExit("LibreOffice (soffice) not found; set it in the plugin options")


def to_pdf(soffice, deck, workdir):
    # A private profile dir lets this run while the user has LibreOffice open.
    profile = "file:///" + os.path.join(workdir, "profile").replace("\\\\", "/").lstrip("/")
    subprocess.run(
        [soffice, f"-env:UserInstallation={profile}", "--headless",
         "--convert-to", "pdf", "--outdir", workdir, deck],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300,
    )
    pdf = os.path.join(workdir, os.path.splitext(os.path.basename(deck))[0] + ".pdf")
    if not os.path.exists(pdf):
        raise SystemExit("LibreOffice did not produce a PDF")
    return pdf


def shape_text(shape):
    if shape.has_text_frame:
        return shape.text_frame.text.strip()
    if getattr(shape, "has_table", False) and shape.has_table:
        rows = []
        for row in shape.table.rows:
            rows.append(" | ".join(c.text.strip() for c in row.cells))
        return "\\n".join(rows)
    return ""


def shape_kind(shape):
    if shape.is_placeholder:
        return "placeholder"
    if getattr(shape, "has_chart", False) and shape.has_chart:
        return "chart"
    if getattr(shape, "has_table", False) and shape.has_table:
        return "table"
    st = shape.shape_type
    if st == MSO_SHAPE_TYPE.PICTURE:
        return "picture"
    if st == MSO_SHAPE_TYPE.GROUP:
        return "group"
    if shape.has_text_frame:
        return "text"
    return "shape"


def walk(shapes, sw, sh, out, depth=0):
    for shape in shapes:
        if shape.left is None or shape.width is None:
            continue
        out.append({
            "id": shape.shape_id,
            "name": shape.name,
            "kind": shape_kind(shape),
            "text": shape_text(shape)[:2000],
            "depth": depth,
            "box": [shape.left / sw, shape.top / sh, shape.width / sw, shape.height / sh],
        })
        # Group children carry absolute slide coordinates in python-pptx only
        # when the group has no child offset; good enough for click targets.
        if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
            walk(shape.shapes, sw, sh, out, depth + 1)


def main(argv):
    args = list(argv)
    soffice = None
    dpi = 110
    if "--soffice" in args:
        i = args.index("--soffice")
        soffice = args[i + 1]
        del args[i:i + 2]
    if "--dpi" in args:
        i = args.index("--dpi")
        dpi = int(args[i + 1])
        del args[i:i + 2]
    if len(args) != 2:
        raise SystemExit(__doc__)
    deck, out_dir = (os.path.abspath(a) for a in args)
    os.makedirs(out_dir, exist_ok=True)

    prs = Presentation(deck)
    sw, sh = prs.slide_width, prs.slide_height

    with tempfile.TemporaryDirectory() as work:
        pdf = to_pdf(find_soffice(soffice), deck, work)
        pymupdf.TOOLS.mupdf_display_errors(False)
        doc = pymupdf.open(pdf)
        for old in os.listdir(out_dir):
            if old.startswith("slide-") and old.endswith(".png"):
                os.remove(os.path.join(out_dir, old))
        for n, page in enumerate(doc, start=1):
            page.get_pixmap(dpi=dpi).save(os.path.join(out_dir, f"slide-{n}.png"))
        page_count = doc.page_count
        doc.close()

    slides = []
    for n, slide in enumerate(prs.slides, start=1):
        shapes = []
        walk(slide.shapes, sw, sh, shapes)
        title = slide.shapes.title.text_frame.text.strip() if slide.shapes.title is not None else ""
        notes = ""
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame is not None:
            notes = slide.notes_slide.notes_text_frame.text.strip()
        slides.append({
            "index": n,
            # Hidden slides are skipped by the PDF export, so images can run short.
            "image": f"slide-{n}.png" if n <= page_count else None,
            "title": title,
            "notes": notes,
            "shapes": shapes,
        })

    manifest = {
        "deck": deck,
        "width": sw,
        "height": sh,
        "mtime": os.path.getmtime(deck),
        "slides": slides,
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(json.dumps({"ok": True, "slides": len(slides), "out": out_dir}))


if __name__ == "__main__":
    main(sys.argv[1:])
`;

// src/gui.js
var TAB = "deck";
var storageKey = (session) => `opencode-slides:deck:${session.id}`;
var samePath2 = (a, b) => !!a && !!b && a.replace(/\//g, "\\").toLowerCase() === b.replace(/\//g, "\\").toLowerCase();
var toBase64 = (bytes) => {
  let binary = "";
  for (let i = 0;i < bytes.length; i += 32768)
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
  return btoa(binary);
};
var fromBase64 = (data) => Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
var withRestartHint = (api) => new Proxy(api, {
  get(target, key) {
    const value = target[key];
    if (typeof value !== "function" || !Object.hasOwn(Slides.spec?.methods ?? {}, key))
      return value;
    return (...args) => Promise.resolve(value.apply(target, args)).catch((err) => {
      if (/no method/i.test(String(err?.message))) {
        throw new Error(`"${String(key)}" needs the updated plugin — fully quit and restart OpenCode`);
      }
      throw err;
    });
  }
});
var viewerSource2;
var gui_default = import_gui2.Plugin.define({
  setup(ctx) {
    const tab = { id: TAB, title: "Slides" };
    const open = (session) => session && ctx.layout.open(`${ctx.id}:${TAB}`, session, { tab: "select" });
    const panels = new Map;
    const capture = ctx.client.rpc(CaptureRpc);
    const offCapture = capture.events.on("capture", async (request) => {
      let panel = panels.get(request.sessionID);
      if (!panel && request.deck)
        panel = [...panels.values()].find((p) => samePath2(p.deck(), request.deck));
      if (!panel || request.deck && !samePath2(panel.deck(), request.deck))
        return;
      try {
        const images = await panel.capture(request.deck, request.slides ?? []);
        const slides = request.slides?.length ? request.slides : images.map((_, i) => i + 1);
        const location = request.directory ? { location: { directory: request.directory } } : undefined;
        await capture.submitCapture({ requestId: request.requestId, images, slides, deck: panel.deck() }, location);
      } catch {}
    });
    if (typeof offCapture === "function")
      import_solid_js.onCleanup(offCapture);
    const offDeck = capture.events.on("deck", (event) => {
      if (!event?.path || !event.sessionID || ctx.options?.autoOpen === false)
        return;
      const panel = panels.get(event.sessionID);
      if (panel) {
        if (!samePath2(panel.deck(), event.path))
          panel.open(event.path);
        else
          panel.building();
        return;
      }
      const session = [ctx.sessions.current(), ...ctx.sessions.list?.() ?? []].find((s) => s?.id === event.sessionID);
      if (!session)
        return;
      localStorage.setItem(storageKey(session), event.path);
      open(session);
    });
    if (typeof offDeck === "function")
      import_solid_js.onCleanup(offDeck);
    ctx.add(import_gui2.Panel, {
      id: "slides",
      region: "side",
      wide: true,
      list: (input) => input.open.includes(TAB) ? [tab] : [],
      render: (props) => {
        const session = props.session;
        const slides = withRestartHint(ctx.main(Slides));
        let deck = localStorage.getItem(storageKey(session));
        let capturer;
        const view = createSlidesView({
          initialPath: deck,
          dark: () => ctx.appearance?.mode?.() === "dark",
          async pickDeck() {
            const picked = await ctx.desktop.pick({ title: "Open presentation", extensions: ["pptx"] });
            return picked?.[0] ?? null;
          },
          async readDeck(path) {
            const file = await slides.read({ path });
            return { bytes: fromBase64(file.data), mtime: file.mtime };
          },
          async writeDeck(path, bytes) {
            return slides.write({ path, data: toBase64(bytes) });
          },
          async loadViewerScript() {
            viewerSource2 ??= slides.viewerScript();
            try {
              return await viewerSource2;
            } catch (error) {
              viewerSource2 = undefined;
              throw error;
            }
          },
          onChanged(path, cb) {
            slides.watch({ path }).catch(() => {});
            const off = slides.on("changed", (event) => {
              if (samePath2(event.path, path))
                cb();
            });
            return () => {
              off();
              slides.unwatch({ path }).catch(() => {});
            };
          },
          remember(path) {
            deck = path;
            localStorage.setItem(storageKey(session), path);
          },
          async saveFile({ name, bytes, defaultDir }) {
            return slides.saveAs({ name, data: toBase64(bytes), ...defaultDir ? { defaultDir } : {} });
          },
          async reveal({ path }) {
            await slides.reveal({ path });
          },
          async openPrint({ name, bytes }) {
            await slides.openExternal({ name, data: toBase64(bytes) });
          },
          pickImage() {
            return slides.pickImage();
          },
          registerCapture(fn) {
            capturer = fn;
            return () => {
              if (capturer === fn)
                capturer = undefined;
            };
          },
          async send(request) {
            const prompt = buildPrompt(request);
            const input = { sessionID: session.id, text: prompt.text, files: prompt.files };
            const data = session.server.data?.session;
            await (data?.prompt ? data.prompt(input) : session.server.client.session.prompt(input));
          }
        });
        panels.set(session.id, {
          deck: () => deck,
          open: (path) => view.open?.(path, "Model is building this deck — it updates here as it saves"),
          building: () => view.notice?.("Model is building this deck — it updates here as it saves"),
          capture: (path, wanted) => {
            if (!capturer)
              throw new Error("not open");
            return capturer(path, wanted);
          }
        });
        import_solid_js.onCleanup(() => {
          panels.delete(session.id);
          view.dispose();
        });
        return view.element;
      }
    });
    ctx.add(import_gui2.MenuItem, {
      menu: "session.panel",
      id: "open",
      title: "Slides",
      icon: "outline-photo",
      run: () => open(ctx.sessions.current())
    });
  },
  main(ctx) {
    setupMain(ctx, deck_default);
  }
});
