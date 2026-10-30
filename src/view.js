// Slides panel shell (v2): header, same-origin iframe hosting the SlidesApp viewer/editor, comment bar.
// Plain DOM, no imports, host-independent. See SPEC2.md "Panel shell (TASK P)".

const CSS = `
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
`

const FRAME_DOC =
  '<!doctype html><html><head><meta charset="utf-8"><style>html,body,#root{height:100%;margin:0}</style></head>' +
  '<body><div id="root"></div></body></html>'

// Slide regions inside the viewer document (one per slide, labelled "Slide N").
const SLIDE_REGION = '[data-pptx-viewport] [role="region"][aria-label^="Slide"]'
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi))

// Viewer script source, shared by all panels in this window.
let viewerSource = null

function el(tag, cls, text) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = text
  return n
}

function button(text, title, onClick, cls) {
  const b = el("button", cls, text)
  b.type = "button"
  if (title) b.title = title
  b.addEventListener("click", onClick)
  return b
}

const baseName = (p) => String(p || "").split(/[\\/]/).pop()
const errText = (err) => String((err && err.message) || err)
const clip = (s, n) => {
  const t = String(s || "").replace(/\s+/g, " ").trim()
  return t.length > n ? t.slice(0, n - 1) + "…" : t
}

function samePath(a, b) {
  if (!a || !b) return false
  const norm = (p) => String(p).replace(/\//g, "\\")
  if (a === b) return true
  const win = /^[a-z]:[\\/]/i.test(a) || a.startsWith("\\\\")
  return win && norm(a).toLowerCase() === norm(b).toLowerCase()
}

export function createSlidesView(api) {
  const root = el("div", "ocs-root")
  root.style.height = "100%"
  const style = el("style")
  style.textContent = CSS
  root.appendChild(style)

  const state = {
    path: null,
    ready: false, // viewer finished rendering the current document
    slideCount: 0,
    slide: 0, // active slide, zero-based
    selection: [], // SelectionItem[]
    comments: [], // { id, slide (1-based), shape: SelectionItem|null, text }
    dirty: false,
    save: "", // "" | "saved" | "saving" | "unsaved" | "error"
    conflict: false,
    busy: false, // sending
    canUndo: false,
    canRedo: false,
  }
  let nextId = 1
  let docToken = 0 // bumps whenever a different document is (re)loaded
  let disposed = false
  let unsubChanged = null
  let unregisterCapture = null
  let saveTimer = null
  let saving = null
  let captureChain = Promise.resolve()
  let lastDark = null

  // ---- header ----
  const header = el("div", "ocs-header")
  const openBtn = button("Open", "Open a .pptx file", () => openDeck())
  const nameEl = el("span", "ocs-name")
  const saveEl = button("", "Save now (Ctrl+S)", () => saveNow(), "ocs-save ocs-muted")
  const reloadBtn = button("↻", "Reload from disk (saves pending edits first)", async () => {
    if (!state.path) return
    // Never throw away edits that only missed the 1.2 s autosave: write them first.
    try {
      await flushSave(true)
    } catch {
      return // save failed (status shows why); keep the in-memory deck
    }
    reloadFromDisk("Reloaded")
  })
  const arrow = (flip) =>
    `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"${flip ? ' style="transform:scaleX(-1)"' : ""}><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>`
  const undoBtn = button("", "Undo (Ctrl+Z)", () => history("undo"), "ocs-hist")
  const redoBtn = button("", "Redo (Ctrl+Y)", () => history("redo"), "ocs-hist")
  undoBtn.innerHTML = arrow(false)
  redoBtn.innerHTML = arrow(true)
  undoBtn.setAttribute("aria-label", "Undo")
  redoBtn.setAttribute("aria-label", "Redo")
  const prevBtn = button("‹", "Previous slide (←)", () => step(-1), "ocs-nav")
  const counterEl = el("span", "ocs-counter ocs-muted")
  const nextBtn = button("›", "Next slide (→)", () => step(1), "ocs-nav")
  let tools = safe(() => localStorage.getItem("opencode-slides:tools") === "1", false)
  const toolsBtn = button("Edit", "Show/hide the editing tools (ribbon, thumbnails, panels)", () => {
    tools = !tools
    safe(() => localStorage.setItem("opencode-slides:tools", tools ? "1" : "0"))
    applyTools()
    renderHeader()
  })
  header.append(openBtn, nameEl, saveEl, undoBtn, redoBtn, prevBtn, counterEl, nextBtn, toolsBtn, reloadBtn)

  function history(kind) {
    const a = app()
    if (a) safe(() => a[kind]())
    syncHistory()
    focusEditor()
  }

  // Keeps the undo/redo buttons in step with the editor (its history callback can lag a React commit).
  function syncHistory() {
    const a = app()
    if (!a || !state.ready) return
    const u = !!safe(() => a.canUndo(), false)
    const r = !!safe(() => a.canRedo(), false)
    if (u !== state.canUndo || r !== state.canRedo) {
      state.canUndo = u
      state.canRedo = r
      renderHeader()
    }
  }
  const historyTimer = setInterval(syncHistory, 300)

  function focusEditor() {
    safe(() => iframe.contentWindow.focus())
  }

  function step(delta) {
    const a = app()
    if (!a || !state.slideCount) return
    const next = Math.max(0, Math.min(state.slideCount - 1, state.slide + delta))
    if (next !== state.slide) a.goTo(next)
  }

  const statusEl = el("div", "ocs-status ocs-muted")

  const banner = el("div", "ocs-banner")
  banner.setAttribute("role", "status")
  banner.append(
    el("span", null, "File changed on disk."),
    button("Reload", "Discard my edits and load the file from disk", () => {
      state.conflict = false
      reloadFromDisk("Updated from disk")
    }),
    button("Keep mine", "Keep my edits; the next autosave overwrites the file", () => {
      state.conflict = false
      if (state.dirty) scheduleSave()
      render()
    }),
  )

  const empty = el("div", "ocs-empty")
  empty.append(
    el("div", "ocs-muted", "No deck open. Open a .pptx to view and edit it, comment on elements, and send them to the model."),
    button("Open deck…", null, () => openDeck(), "ocs-primary"),
  )

  // ---- viewer iframe (same-origin srcdoc, no sandbox, so the script can be injected and called) ----
  const frameBox = el("div", "ocs-frame")
  const iframe = el("iframe")
  iframe.title = "Slides editor"
  iframe.srcdoc = FRAME_DOC
  frameBox.appendChild(iframe)
  let frameLoads = 0
  let frameWaiters = []
  let mountedWin = null // window the viewer is mounted in (a re-attached iframe gets a fresh one)

  function onFrameLoad() {
    frameLoads++
    const waiters = frameWaiters
    frameWaiters = []
    waiters.forEach((r) => r())
    // The host moved/re-attached the panel: the iframe reloaded and lost the viewer. Remount.
    if (frameLoads > 1 && state.path && mountedWin && mountedWin !== iframe.contentWindow) {
      mountedWin = null
      openPath(state.path, { initialSlide: state.slide, status: "" })
    }
  }
  iframe.addEventListener("load", onFrameLoad)

  async function frameWindow() {
    if (!frameLoads) await new Promise((r) => frameWaiters.push(r))
    const win = iframe.contentWindow
    if (!win || !win.document || !win.document.getElementById("root")) {
      await new Promise((r) => frameWaiters.push(r))
    }
    return iframe.contentWindow
  }

  async function viewerScript() {
    if (!viewerSource) {
      viewerSource = Promise.resolve(api.loadViewerScript())
      viewerSource.catch(() => (viewerSource = null))
    }
    return viewerSource
  }

  // Returns the SlidesApp of the current iframe window, injecting the viewer script if needed.
  async function ensureApp() {
    const [win, source] = await Promise.all([frameWindow(), viewerScript()])
    if (win.SlidesApp) return win.SlidesApp
    const doc = win.document
    const script = doc.createElement("script")
    script.textContent = source
    ;(doc.head || doc.documentElement).appendChild(script)
    if (!win.SlidesApp) {
      // Inline script blocked (e.g. by a CSP inherited from the host page): evaluate in the frame's realm.
      try {
        new win.Function(source)()
      } catch (err) {
        throw new Error("Cannot start the slide editor: " + errText(err))
      }
    }
    if (!win.SlidesApp) throw new Error("Cannot start the slide editor: viewer script did not define SlidesApp")
    return win.SlidesApp
  }

  function app() {
    const win = iframe.contentWindow
    return mountedWin && win === mountedWin ? win.SlidesApp : null
  }

  // ---- comment bar ----
  const bar = el("div", "ocs-bar")
  const contextEl = el("div", "ocs-context ocs-muted")
  const input = el("textarea")
  input.placeholder = "Describe a change, or click an element on the slide to target it"
  input.title = "Enter sends · Alt+Enter queues · Shift+Enter new line"
  input.rows = 1
  // Height: grows with the text (up to 96 px) until the user drags the grip above the bar; then their height sticks.
  let userHeight = Number(safe(() => localStorage.getItem("opencode-slides:barH"), 0)) || 0
  const grow = () => {
    if (userHeight) {
      input.style.height = userHeight + "px"
      return
    }
    input.style.height = "auto"
    input.style.height = Math.min(input.scrollHeight + 2, 96) + "px"
  }
  if (userHeight) input.style.height = userHeight + "px"
  const grip = el("div", "ocs-bar-grip")
  grip.title = "Drag to resize (double-click to reset)"
  grip.addEventListener("pointerdown", (e) => {
    e.preventDefault()
    grip.setPointerCapture(e.pointerId)
    const y0 = e.clientY
    const h0 = input.offsetHeight
    const move = (ev) => {
      userHeight = clamp(Math.round(h0 + (y0 - ev.clientY)), 26, Math.max(60, Math.round(root.offsetHeight * 0.6)))
      grow()
      layout()
    }
    const up = () => {
      grip.removeEventListener("pointermove", move)
      grip.removeEventListener("pointerup", up)
      safe(() => localStorage.setItem("opencode-slides:barH", String(userHeight)))
    }
    grip.addEventListener("pointermove", move)
    grip.addEventListener("pointerup", up)
  })
  grip.addEventListener("dblclick", () => {
    userHeight = 0
    safe(() => localStorage.removeItem("opencode-slides:barH"))
    grow()
    layout()
  })
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing) return
    e.preventDefault()
    if (e.altKey) addComment()
    else send("comments")
  })
  input.addEventListener("input", () => {
    grow()
    renderButtons()
  })
  const addBtn = button("+ Queue", "Queue this request for the selection and write another (Alt+Enter)", () => addComment())
  const sendBtn = button("Send", "Send queued comments with slide images (Enter)", () => send("comments"), "ocs-primary")
  const compose = el("div", "ocs-compose")
  compose.append(input, addBtn, sendBtn)
  const barHead = el("div", "ocs-bar-head")
  const countEl = el("span", "ocs-count")
  const queueEl = el("div", "ocs-queue")
  const attachLabel = el("label", "ocs-check ocs-muted")
  const attachAll = el("input")
  attachAll.type = "checkbox"
  attachLabel.append(attachAll, document.createTextNode("All slides"))
  attachLabel.title = "Attach images of all slides (default: only slides with comments)"
  const reviewBtn = button("Review", "Ask the model to review all slides (text box = optional note)", () => send("review"))
  barHead.append(el("span", "ocs-bar-title", "✎ Ask AI to edit"), contextEl, countEl, attachLabel, reviewBtn)
  contextEl.className = "ocs-target"
  bar.append(grip, barHead, queueEl, compose)

  root.append(header, statusEl, banner, empty, frameBox, bar)

  // ---- status / save state ----
  function setStatus(text, error) {
    statusEl.textContent = text || ""
    statusEl.title = text || ""
    statusEl.className = "ocs-status " + (error ? "ocs-error" : "ocs-muted")
    statusEl.style.display = text ? "" : "none"
  }

  function setSave(s) {
    state.save = s
    renderHeader()
  }

  // ---- open / load ----
  async function openDeck() {
    let p
    try {
      p = await api.pickDeck()
    } catch (err) {
      setStatus(errText(err), true)
      return
    }
    if (!p || disposed) return
    if (!samePath(p, state.path)) {
      try {
        await flushSave()
      } catch {}
    }
    try {
      api.remember && api.remember(p)
    } catch {}
    openPath(p, { initialSlide: samePath(p, state.path) ? state.slide : 0 })
  }

  function subscribe(path) {
    if (unsubChanged) unsubChanged()
    unsubChanged = null
    if (!api.onChanged) return
    unsubChanged = api.onChanged(path, () => {
      if (!disposed && samePath(state.path, path)) onExternalChange()
    })
  }

  function viewerOptions(initialSlide) {
    return {
      initialSlide,
      dark: isDark(),
      tools,
      path: state.path,
      onSaveRequest() {
        if (!disposed) saveNow()
      },
      onDownload(file) {
        if (!disposed && file) exportFile(file.name, file.bytes)
      },
      // File › Save As (.pptx/.ppsx/.pptm/.ppt): ask where to save; a .pptx copy becomes the open deck.
      async onSaveAs(file) {
        if (disposed || !file) return undefined
        const saved = await exportFile(file.name, file.bytes, "Saved as")
        if (saved && /\.pptx$/i.test(saved) && !samePath(saved, state.path)) {
          try {
            api.remember && api.remember(saved)
          } catch {}
          openPath(saved, { initialSlide: state.slide, status: "" })
          setStatus(`Saved as ${baseName(saved)} — now editing it`)
        }
        return saved ? { fileName: baseName(saved) } : undefined
      },
      onPrint() {
        if (!disposed) printDeck()
      },
      onMenu(open) {
        if (disposed || tools === !!open) return
        tools = !!open
        safe(() => localStorage.setItem("opencode-slides:tools", tools ? "1" : "0"))
        renderHeader()
      },
      onReady(info) {
        if (disposed) return
        state.ready = true
        state.slideCount = (info && info.slideCount) || safe(() => app().getSlideCount(), 0)
        if (statusEl.textContent === "Loading editor…" || statusEl.textContent === "Loading…") setStatus("")
        render()
      },
      onSelection(items) {
        const next = Array.from(items || [])
        const key = (l) => l.map((i) => i.slide + ":" + i.elementId).join(",")
        if (key(next) !== key(state.selection)) bubbleHidden = false
        state.selection = next
        renderContext()
        layout()
      },
      onSlide(index) {
        bubbleHidden = false
        state.slide = index
        closePop()
        renderContext()
        renderHeader()
        renderPins()
        layout()
      },
      onHistory(h) {
        if (disposed) return
        state.canUndo = !!(h && h.canUndo)
        state.canRedo = !!(h && h.canRedo)
        renderHeader()
      },
      onDirty(dirty) {
        if (disposed) return
        state.dirty = !!dirty
        if (dirty) {
          setSave(saving ? "saving" : "unsaved")
          if (!state.conflict) scheduleSave()
        } else if (!saving) setSave("saved")
      },
    }
  }

  async function openPath(path, { initialSlide = 0, status = "Loading editor…" } = {}) {
    const token = ++docToken
    const changedPath = !samePath(path, state.path)
    state.path = path
    if (changedPath) {
      state.comments = []
      state.selection = []
      state.slide = initialSlide
      state.conflict = false
      subscribe(path)
    }
    state.ready = false
    state.dirty = false
    clearTimeout(saveTimer)
    saveTimer = null
    setSave("")
    if (status) setStatus(status)
    render()
    try {
      const [App, deck] = await Promise.all([ensureApp(), api.readDeck(path)])
      if (token !== docToken || disposed) return
      const win = iframe.contentWindow
      const bytes = new win.Uint8Array(deck.bytes) // copy into the frame's realm (zip libs use instanceof)
      if (mountedWin === win) {
        App.load(bytes, { initialSlide })
      } else {
        mountedWin = win // before mount: callbacks may fire synchronously
        try {
          App.mount(win.document.getElementById("root"), bytes, viewerOptions(initialSlide))
          if (!win.__ocsSaveKey) {
            win.__ocsSaveKey = true
            win.document.addEventListener("keydown", onSaveKey, true)
          }
        } catch (err) {
          mountedWin = null
          throw err
        }
      }
      setSave("saved")
    } catch (err) {
      if (token !== docToken || disposed) return
      setStatus(errText(err), true)
    }
    render()
  }

  function reloadFromDisk(status) {
    if (!state.path) return
    const a = app()
    const slide = a ? safe(() => a.getActiveSlide(), state.slide) : state.slide
    state.conflict = false
    openPath(state.path, { initialSlide: slide, status: "Loading…" }).then(() => {
      if (!disposed && status && statusEl.className.indexOf("ocs-error") < 0) setStatus(status)
    })
  }

  function onExternalChange() {
    const label = state.awaitingModel ? "Updated by model" : "Updated from disk"
    state.awaitingModel = false
    if (!app()) return reloadFromDisk(label)
    if (state.dirty || saving || saveTimer) {
      state.conflict = true
      clearTimeout(saveTimer)
      saveTimer = null
      render()
    } else {
      reloadFromDisk(label)
    }
  }

  // ---- save now / export / print (host hooks from the viewer) ----
  function saveNow() {
    if (!state.path || !state.ready) return
    flushSave(true).then(
      () => !disposed && !state.dirty && setSave("saved"),
      () => {},
    )
  }

  function applyTools() {
    const a = app()
    if (!a) return
    safe(() => (tools ? a.openMenu?.() : a.closeMenu?.()))
  }

  const dirOf = (p) => String(p || "").replace(/[\\/][^\\/]*$/, "")

  // Asks the host where to save `bytes` (its Save dialog); returns the saved path, or null.
  async function exportFile(name, bytes, verb = "Exported to") {
    if (!api.saveFile) {
      setStatus("Saving files is not available here", true)
      return null
    }
    try {
      const r = await api.saveFile({ name, bytes: new Uint8Array(bytes), defaultDir: state.exportDir || dirOf(state.path) })
      if (!r || r.canceled || !r.path) {
        setStatus("")
        return null
      }
      state.exportDir = dirOf(r.path)
      setStatus(`${verb} ${baseName(r.path)}`)
      return r.path
    } catch (err) {
      setStatus("Save failed: " + errText(err), true)
      return null
    }
  }

  async function printDeck() {
    const a = app()
    if (!a || typeof a.exportPdf !== "function") return
    try {
      setStatus("Preparing PDF…")
      const bytes = await a.exportPdf()
      const name = baseName(state.path).replace(/\.pptx$/i, "") + ".pdf"
      if (api.openPrint) {
        await api.openPrint({ name, bytes: new Uint8Array(bytes) })
        setStatus("Opened the PDF in your PDF viewer for printing")
      } else await exportFile(name, bytes)
    } catch (err) {
      setStatus("Print failed: " + errText(err), true)
    }
  }

  // PowerPoint shortcuts. The slide editor handles most of them itself while its frame has focus
  // (undo/redo, copy/paste, duplicate, delete, arrows, F5, Ctrl+B/I/U inside text, …). This layer adds
  // what it lacks (Ctrl+S/P, bold/italic/underline on a selected shape, Ctrl+Home/End) and forwards keys
  // pressed while focus is on the panel chrome (e.g. after clicking a header button) into the frame.
  const isTyping = (t) =>
    !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ""))

  function onSaveKey(e) {
    if (e.isComposing || !(e.ctrlKey || e.metaKey) || e.altKey) return false
    const k = e.key.toLowerCase()
    const done = () => {
      e.preventDefault()
      e.stopPropagation()
      return true
    }
    if (k === "s") {
      saveNow()
      return done()
    }
    if (!state.path || isTyping(e.target)) return false
    const a = app()
    if (!a || !state.ready) return false
    if (k === "p" && !e.shiftKey) {
      printDeck()
      return done()
    }
    if ((k === "b" || k === "i" || k === "u") && !e.shiftKey) {
      // Inside a text box (contenteditable) the editor formats the selected text itself.
      safe(() => a.toggleFormat({ b: "bold", i: "italic", u: "underline" }[k]))
      return done()
    }
    if (k === "home" || k === "end") {
      a.goTo(k === "home" ? 0 : state.slideCount - 1)
      return done()
    }
    return false
  }

  const FORWARD = /^(z|y|c|x|v|d|a|g|m|l|e|r|j|\[|\]|<|>|,|\.)$/i
  root.addEventListener("keydown", (e) => {
    if (onSaveKey(e) || isTyping(e.target) || !state.ready) return
    const k = e.key
    const mod = e.ctrlKey || e.metaKey
    const forward =
      (mod && !e.altKey && FORWARD.test(k)) ||
      k === "Delete" ||
      k === "F5" ||
      k === "PageUp" ||
      k === "PageDown" ||
      (!mod && /^Arrow/.test(k) && e.target === document.body)
    if (!forward) return
    const win = iframe.contentWindow
    if (!win) return
    e.preventDefault()
    win.focus()
    win.dispatchEvent(
      new win.KeyboardEvent("keydown", {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        bubbles: true,
        cancelable: true,
      }),
    )
  })

  // ---- autosave ----
  function scheduleSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      flushSave().catch(() => {})
    }, 1200)
  }

  // Saves pending edits now (waits for an in-flight save first). Throws when saving fails.
  // force: write even if the editor reports no changes (explicit Save / Reload must never skip a write).
  async function flushSave(force = false) {
    clearTimeout(saveTimer)
    saveTimer = null
    while (saving) await saving.catch(() => {})
    const a = app()
    if (!a || !state.path || state.conflict) return
    if (!force && !safe(() => a.isDirty(), state.dirty)) return
    saving = doSave(a, state.path, docToken)
    try {
      await saving
    } finally {
      saving = null
    }
  }

  async function doSave(a, path, token) {
    setSave("saving")
    try {
      const content = await a.getContent()
      if (token !== docToken || disposed) return
      await api.writeDeck(path, new Uint8Array(content))
      if (token !== docToken || disposed) return
      a.markSaved()
      state.dirty = false
      setSave("saved")
    } catch (err) {
      if (token !== docToken || disposed) return
      setSave("error")
      setStatus(errText(err), true)
      throw err
    }
  }

  // ---- comments ----
  function currentTargets() {
    if (state.selection.length) return state.selection.map((s) => ({ slide: s.slide, shape: s }))
    return [{ slide: state.slide + 1, shape: null }]
  }

  // Bottom bar: queues the text for every current target. Bubble popover: queues it for one {slide, shape} target.
  function addComment(target, text) {
    const fromBar = !target
    const body = fromBar ? input.value.trim() : String(text || "").trim()
    if (!body || !app()) {
      if (fromBar) input.focus()
      return false
    }
    for (const t of fromBar ? currentTargets() : [target]) {
      state.comments.push({ id: nextId++, slide: t.slide, shape: t.shape, text: body })
    }
    if (fromBar) input.value = ""
    render()
    return true
  }

  async function capture(slides1) {
    const a = app()
    if (!a) throw new Error("not open")
    const n = safe(() => a.getSlideCount(), state.slideCount)
    const list = (slides1 && slides1.length ? slides1 : Array.from({ length: n }, (_, i) => i + 1)).filter(
      (s) => Number.isInteger(s) && s >= 1 && s <= n,
    )
    const run = captureChain.then(async () => {
      const win = iframe.contentWindow
      const urls = await a.capture(win.Array.from(list, (s) => s - 1), { width: 1280 })
      return { slides: list, urls: Array.from(urls || []) }
    })
    captureChain = run.catch(() => {})
    return run
  }

  async function send(mode) {
    if (state.busy || !state.path || !app()) return
    let note = ""
    if (mode === "comments") {
      if (input.value.trim()) addComment()
      if (!state.comments.length) {
        setStatus("Write a comment first")
        input.focus()
        return
      }
    } else {
      note = input.value.trim()
    }
    state.busy = true
    renderButtons()
    const path = state.path
    const sent = mode === "comments" ? state.comments.slice() : []
    try {
      setStatus("Saving…")
      await flushSave()
      setStatus("Capturing slides…")
      let slides
      if (mode === "review" || attachAll.checked) slides = []
      else {
        slides = [...new Set(sent.map((c) => c.slide))].sort((a, b) => a - b)
        if (!slides.length) slides = [state.slide + 1]
      }
      const shot = await capture(slides)
      const images = shot.slides.map((slide, i) => ({ slide, uri: shot.urls[i] || "" })).filter((x) => x.uri)
      setStatus("Sending…")
      await api.send({
        deck: path,
        mode,
        note,
        comments: sent.map((c) => ({ slide: c.slide, shape: c.shape, text: c.text })),
        images,
      })
      if (disposed) return
      const ids = new Set(sent.map((c) => c.id))
      state.comments = state.comments.filter((c) => !ids.has(c.id))
      if (mode === "review" || !input.value.trim()) input.value = ""
      state.awaitingModel = true
      setStatus("Sent to model — the slide updates here when the model saves")
    } catch (err) {
      if (disposed) return
      setStatus(errText(err), true)
    } finally {
      state.busy = false
    }
    render()
  }

  // ---- selection bubble, comment pins and popover (overlay layer above the iframe) ----
  const layer = el("div", "ocs-layer")
  const bubbleBtn = button("", "Describe a change for the model to make to this element", () => openNew(), "ocs-bubble")
  bubbleBtn.append(el("span", "ocs-bubble-icon", "✎"), document.createTextNode("Ask AI to edit"))
  // Where the user last pressed inside the slide (iframe viewport coords), to show the bubble there.
  let lastPointer = null
  bubbleBtn.style.display = "none"
  const pinsEl = el("div", "ocs-pins")
  const popEl = el("div", "ocs-pop")
  popEl.style.display = "none"
  const popTitle = el("div", "ocs-muted ocs-pop-title")
  const popText = el("textarea")
  popText.rows = 2
  popText.placeholder = "What should the AI change? e.g. make it bold and red (Enter to add)"
  const popDelete = button("Delete", "Delete this comment", () => popDeleteNow(), "ocs-danger")
  const popCancel = button("Cancel", null, () => closePop())
  const popPrimary = button("Add", null, () => popCommit(), "ocs-primary")
  const popRow = el("div", "ocs-pop-row")
  popRow.append(popDelete, el("span", "ocs-grow"), popCancel, popPrimary)
  popEl.append(popTitle, popText, popRow)
  layer.append(bubbleBtn, pinsEl, popEl)
  frameBox.appendChild(layer)
  // { kind: "new", target } | { kind: "edit", commentId, target }; target = { slide (1-based), shape|null }
  let popState = null
  let raf = 0
  let lastPoll = 0
  let listenedDoc = null

  const targetName = (t) => (t.shape ? t.shape.name || t.shape.type || "element" : "slide " + t.slide)
  const frameDoc = () => (iframe.contentWindow && iframe.contentWindow.document) || null

  function cssEscape(s) {
    const C = iframe.contentWindow && iframe.contentWindow.CSS
    return C && C.escape ? C.escape(s) : String(s).replace(/["\\]/g, "\\$&")
  }

  function slideRegion(n) {
    const doc = frameDoc()
    if (!doc) return null
    let best = null
    let area = 0
    for (const r of doc.querySelectorAll(SLIDE_REGION)) {
      const label = r.getAttribute("aria-label") || ""
      if (label !== "Slide " + n && !label.startsWith("Slide " + n + " ")) continue
      const b = r.getBoundingClientRect()
      if (b.width * b.height > area) {
        area = b.width * b.height
        best = r
      }
    }
    return best
  }

  // Viewport rect of a target (iframe coordinates), or null when it is not rendered.
  function targetRect(t) {
    const doc = frameDoc()
    if (!t || !doc) return null
    const region = slideRegion(t.slide)
    let node = region
    if (t.shape) {
      node = null
      if (t.shape.elementId != null) {
        node = (region || doc).querySelector(`[data-element-id="${cssEscape(String(t.shape.elementId))}"]`)
      }
    }
    if (!node) return null
    const b = node.getBoundingClientRect()
    if (!b.width && !b.height) return null
    // Hidden behind the editor's own menus/dialogs (File page, Options, slide sheet): draw nothing.
    const win = doc.defaultView
    const x = Math.min(Math.max(b.left + b.width / 2, 1), (win?.innerWidth || 1) - 1)
    const y = Math.min(Math.max(b.top + Math.min(b.height / 2, 12), 1), (win?.innerHeight || 1) - 1)
    const hit = doc.elementFromPoint(x, y)
    const scope = region || node
    if (!hit || !(scope === hit || scope.contains(hit))) return null
    return b
  }

  // The "Ask AI to edit" bubble steps aside while the user edits by hand (typing, double-click into
  // text, dragging/resizing) and comes back when the selection changes.
  let bubbleHidden = false
  let dragFrom = null
  function hideBubble() {
    if (bubbleHidden) return
    bubbleHidden = true
    layout()
  }
  function onFrameKey(e) {
    if (e.key === "Escape" || /^(Control|Shift|Alt|Meta|CapsLock)$/.test(e.key)) return
    hideBubble()
  }
  function onFrameMove(e) {
    if (!dragFrom || !(e.buttons & 1)) return
    if (Math.abs(e.clientX - dragFrom.x) + Math.abs(e.clientY - dragFrom.y) > 4) hideBubble()
  }
  const frameEvents = [
    ["scroll", () => layout()],
    ["pointerdown", (e) => ((dragFrom = { x: e.clientX, y: e.clientY }), onFramePointerDown(e))],
    ["pointermove", onFrameMove],
    ["pointerup", () => (dragFrom = null)],
    ["dblclick", hideBubble],
    ["keydown", onFrameKey],
  ]

  function syncFrameListeners() {
    const doc = frameDoc()
    if (doc === listenedDoc) return
    if (listenedDoc) for (const [t, f] of frameEvents) listenedDoc.removeEventListener(t, f, true)
    listenedDoc = doc
    if (doc) for (const [t, f] of frameEvents) doc.addEventListener(t, f, true)
  }

  // A click on the slide closes the popover without adding.
  function onFramePointerDown(e) {
    lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() }
    if (popState) closePop()
  }

  function openNew() {
    const sel = state.selection[0]
    if (!sel || sel.slide !== state.slide + 1 || !app()) return
    const target = { slide: sel.slide, shape: sel }
    showPop({ kind: "new", target }, "Ask AI to edit " + clip(targetName(target), 60), "", false)
  }

  function openEdit(c) {
    const target = { slide: c.slide, shape: c.shape }
    showPop({ kind: "edit", commentId: c.id, target }, "Ask AI to edit " + clip(targetName(target), 60), c.text, true)
  }

  function showPop(next, title, text, editing) {
    popState = next
    popTitle.textContent = title
    popTitle.title = title
    popText.value = text
    popPrimary.textContent = editing ? "Save" : "Add"
    popPrimary.disabled = !text.trim()
    popDelete.style.display = editing ? "" : "none"
    popEl.style.display = ""
    layout()
    popText.focus()
    popText.setSelectionRange(text.length, text.length)
  }

  function closePop() {
    popState = null
    popEl.style.display = "none"
    layout()
  }

  function popCommit() {
    if (!popState) return
    const text = popText.value.trim()
    if (!text) return
    if (popState.kind === "new") {
      if (!addComment(popState.target, text)) return
    } else {
      const c = state.comments.find((x) => x.id === popState.commentId)
      if (c) c.text = text
    }
    closePop()
    render()
  }

  function popDeleteNow() {
    if (!popState || popState.kind !== "edit") return
    const id = popState.commentId
    state.comments = state.comments.filter((c) => c.id !== id)
    closePop()
    render()
  }

  popText.addEventListener("keydown", (e) => {
    if (e.isComposing) return
    if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      closePop()
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      popCommit()
    }
  })
  popText.addEventListener("input", () => {
    popPrimary.disabled = !popText.value.trim()
  })

  // Numbered pins for comments on the current slide. Number = index in state.comments (all slides).
  function renderPins() {
    pinsEl.replaceChildren()
    const cur = state.slide + 1
    state.comments.forEach((c, i) => {
      if (c.slide !== cur) return
      const pin = el("div", "ocs-pin", String(i + 1))
      pin.title = c.text
      pin.tabIndex = 0
      pin.setAttribute("role", "button")
      pin.setAttribute("aria-label", "Comment " + (i + 1))
      pin._target = { slide: c.slide, shape: c.shape }
      pin.addEventListener("click", (e) => {
        e.stopPropagation()
        openEdit(c)
      })
      pin.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
        pin.click()
      })
      pinsEl.appendChild(pin)
    })
  }

  // Positions the bubble, pins and popover. Cheap enough to call from any change event.
  function layout() {
    if (disposed) return
    syncFrameListeners()
    const cur = state.slide + 1
    const fw = frameBox.clientWidth
    const fh = frameBox.clientHeight
    const fr = frameBox.getBoundingClientRect()
    const ir = iframe.getBoundingClientRect()
    const ox = ir.left - fr.left
    const oy = ir.top - fr.top
    const rectOf = (t) => {
      const r = targetRect(t)
      if (!r) return null
      return { left: r.left + ox, top: r.top + oy, right: r.right + ox, bottom: r.bottom + oy }
    }
    const visible = (r) => r.right > 0 && r.bottom > 0 && r.left < fw && r.top < fh

    if (popState) {
      const stale = popState.kind === "edit" && !state.comments.some((c) => c.id === popState.commentId)
      if (stale || popState.target.slide !== cur) {
        popState = null
        popEl.style.display = "none"
      }
    }

    // Selection bubble: just outside the top-right corner of the (first) selected element.
    const sel = state.selection[0]
    const bub = app() && !popState && !bubbleHidden && sel && sel.slide === cur ? rectOf(sel) : null
    if (bub && visible(bub)) {
      bubbleBtn.style.display = ""
      const bw = bubbleBtn.offsetWidth || 70
      const bh = bubbleBtn.offsetHeight || 17
      // Next to the cursor when the selection came from a click; else the element's top-right corner.
      const p = lastPointer && Date.now() - lastPointer.t < 60_000 ? { x: lastPointer.x + ox, y: lastPointer.y + oy } : null
      const near = p && p.x >= bub.left - 24 && p.x <= bub.right + 24 && p.y >= bub.top - 24 && p.y <= bub.bottom + 24
      let left = near ? p.x + 12 : bub.right + 4
      let top = near ? p.y - bh - 10 : bub.top - bh - 4
      if (top < 2) top = near ? p.y + 16 : bub.top + 4
      if (left + bw > fw - 2) left = (near ? p.x : bub.right) - bw - 12
      bubbleBtn.style.left = clamp(left, 2, fw - bw - 2) + "px"
      bubbleBtn.style.top = clamp(top, 2, fh - bh - 2) + "px"
    } else {
      bubbleBtn.style.display = "none"
    }

    // Pins: top-left corner of the element (or of the slide for whole-slide comments).
    for (const pin of pinsEl.children) {
      const r = rectOf(pin._target)
      if (!r || !visible(r)) {
        pin.style.display = "none"
        continue
      }
      pin.style.display = ""
      pin.style.left = r.left - 20 + "px"
      pin.style.top = r.top - 20 + "px"
    }

    // Popover: below the target, or above when there is no room; kept inside the frame.
    if (popState) {
      const r = rectOf(popState.target)
      if (!r) {
        popEl.style.display = "none"
      } else {
        popEl.style.display = ""
        const w = popEl.offsetWidth || 220
        const h = popEl.offsetHeight
        let top = r.bottom + 8
        if (top + h > fh - 4 && r.top - h - 8 >= 4) top = r.top - h - 8
        popEl.style.left = clamp(r.left, 4, fw - w - 4) + "px"
        popEl.style.top = clamp(top, 4, fh - h - 4) + "px"
      }
    }
    ensureLoop()
  }

  // Light poll, only while something is shown (bubble, popover or pins).
  function wantsFrames() {
    if (disposed || !app()) return !!popState && !disposed
    if (popState) return true
    const sel = state.selection[0]
    return (!!sel && sel.slide === state.slide + 1) || pinsEl.childElementCount > 0
  }

  function ensureLoop() {
    if (raf || !wantsFrames()) return
    raf = requestAnimationFrame(tick)
  }

  function tick(now) {
    raf = 0
    if (now - lastPoll >= 100) {
      lastPoll = now
      layout()
    } else {
      ensureLoop()
    }
  }

  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => layout()) : null
  if (ro) ro.observe(frameBox)
  const onWindowResize = () => layout()
  window.addEventListener("resize", onWindowResize)
  const onIframeLoad = () => layout()
  iframe.addEventListener("load", onIframeLoad)

  // ---- model screenshot tool hook ----
  if (api.registerCapture) {
    unregisterCapture = api.registerCapture(async (deckPath, slides1) => {
      if (disposed || !state.path || !app() || !state.ready) throw new Error("not open")
      if (deckPath && !samePath(deckPath, state.path)) throw new Error("not open")
      return (await capture(Array.from(slides1 || []))).urls
    })
  }

  // ---- theme ----
  function isDark() {
    return !!safe(() => api.dark && api.dark(), false)
  }
  const darkTimer = setInterval(() => {
    const d = isDark()
    if (d === lastDark) return
    lastDark = d
    root.classList.toggle("ocs-dark", d)
    const a = app()
    if (a) safe(() => a.setDark(d))
  }, 1000)
  lastDark = isDark()
  root.classList.toggle("ocs-dark", lastDark)

  // ---- rendering ----
  function renderHeader() {
    nameEl.textContent = state.path ? baseName(state.path) : ""
    nameEl.title = state.path || ""
    const labels = { saved: "✓ Saved", saving: "Saving…", unsaved: "● Unsaved", error: "⚠ Save failed" }
    saveEl.textContent = labels[state.save] || ""
    saveEl.style.display = state.path && state.save ? "" : "none"
    saveEl.disabled = state.save === "saving"
    saveEl.className = "ocs-save " + (state.save === "error" ? "ocs-error" : state.save === "unsaved" ? "ocs-warn" : "ocs-muted")
    reloadBtn.disabled = !state.path
    reloadBtn.style.display = state.path ? "" : "none"
    for (const node of [undoBtn, redoBtn]) node.style.display = state.path ? "" : "none"
    undoBtn.disabled = !state.canUndo
    redoBtn.disabled = !state.canRedo
    const ready = !!state.path && state.ready && state.slideCount > 0
    for (const node of [prevBtn, counterEl, nextBtn, toolsBtn]) node.style.display = state.path ? "" : "none"
    counterEl.textContent = ready ? `${state.slide + 1} / ${state.slideCount}` : ""
    prevBtn.disabled = !ready || state.slide <= 0
    nextBtn.disabled = !ready || state.slide >= state.slideCount - 1
    toolsBtn.disabled = !ready
    toolsBtn.classList.toggle("ocs-on", tools)
  }

  function renderContext() {
    if (!state.path) return
    let text
    const sel = state.selection
    if (sel.length) {
      const first = sel[0]
      text = `${first.name || first.type || "element"} · slide ${first.slide}`
      if (sel.length > 1) text += ` +${sel.length - 1} more`
    } else {
      text = `Whole slide ${state.slide + 1}`
    }
    contextEl.textContent = text
    input.placeholder = sel.length
      ? `Describe the change to this ${(sel[0].type && sel[0].type !== "unknown" ? sel[0].type : "element")}…`
      : "Describe a change for this slide, or click an element to target just it"
    contextEl.title = sel.length && sel[0].text ? clip(sel[0].text, 300) : text
  }

  function renderQueue() {
    queueEl.replaceChildren()
    queueEl.style.display = state.comments.length ? "" : "none"
    countEl.textContent = state.comments.length ? `${state.comments.length} queued` : ""
    countEl.style.display = state.comments.length ? "" : "none"
    state.comments.forEach((c, i) => {
      const chip = el("div", "ocs-chip")
      chip.title = `Slide ${c.slide}: ${c.text}`
      chip.tabIndex = 0
      chip.setAttribute("role", "button")
      const body = el("div", "ocs-chip-body")
      body.append(
        el("span", "ocs-chip-where", `Slide ${c.slide} · ${c.shape ? c.shape.name || c.shape.type || "element" : "whole slide"}`),
        el("span", "ocs-chip-text", clip(c.text, 160)),
      )
      chip.append(el("span", "ocs-chip-num", String(i + 1)), body)
      chip.appendChild(
        button("×", "Remove comment", (e) => {
          e.stopPropagation()
          state.comments = state.comments.filter((x) => x.id !== c.id)
          render()
        }),
      )
      chip.addEventListener("click", () => {
        const a = app()
        if (a) safe(() => a.goTo(c.slide - 1))
      })
      chip.addEventListener("keydown", (e) => {
        if (e.target !== chip || (e.key !== "Enter" && e.key !== " ")) return
        e.preventDefault()
        chip.click()
      })
      queueEl.appendChild(chip)
    })
  }

  function renderButtons() {
    const ok = !!app() && state.ready && !state.busy
    addBtn.disabled = !ok || !input.value.trim()
    sendBtn.disabled = !ok || (!state.comments.length && !input.value.trim())
    sendBtn.textContent = state.comments.length ? `Send all (${state.comments.length}) ➤` : "Send ➤"
    reviewBtn.disabled = !ok
  }

  function render() {
    if (disposed) return
    renderHeader()
    const open = !!state.path
    empty.style.display = open ? "none" : ""
    // The iframe stays in the DOM while hidden, so it loads early and keeps the viewer alive.
    frameBox.style.display = open ? "" : "none"
    bar.style.display = open ? "" : "none"
    banner.style.display = state.conflict ? "" : "none"
    renderContext()
    renderQueue()
    renderButtons()
    renderPins()
    layout()
  }

  function safe(fn, fallback) {
    try {
      return fn()
    } catch {
      return fallback
    }
  }

  setStatus("")
  render()
  if (api.initialPath) openPath(api.initialPath)

  return {
    element: root,
    // Shows `path` (e.g. a deck the model is building) with a status note; later saves reload it.
    async open(path, note) {
      if (disposed || !path) return
      if (!samePath(path, state.path)) {
        try {
          await flushSave()
        } catch {}
        try {
          api.remember && api.remember(path)
        } catch {}
        await openPath(path, { initialSlide: 0 })
      }
      state.awaitingModel = true
      if (note && !disposed) setStatus(note)
    },
    notice(note) {
      if (disposed) return
      state.awaitingModel = true
      if (note) setStatus(note)
    },
    dispose() {
      if (disposed) return
      // Best effort: write pending edits (the frame may be torn down before this completes).
      const a = app()
      const path = state.path
      if (a && path && (state.dirty || saveTimer) && !state.conflict && !saving) {
        Promise.resolve(safe(() => a.getContent(), null))
          .then((c) => c && api.writeDeck(path, new Uint8Array(c)))
          .catch(() => {})
      }
      disposed = true
      docToken++
      clearTimeout(saveTimer)
      clearInterval(darkTimer)
      clearInterval(historyTimer)
      cancelAnimationFrame(raf)
      raf = 0
      if (ro) ro.disconnect()
      window.removeEventListener("resize", onWindowResize)
      iframe.removeEventListener("load", onIframeLoad)
      if (listenedDoc) {
        for (const [t, f] of frameEvents) listenedDoc.removeEventListener(t, f, true)
        listenedDoc = null
      }
      popState = null
      if (unsubChanged) unsubChanged()
      unsubChanged = null
      if (unregisterCapture) safe(() => unregisterCapture())
      unregisterCapture = null
      iframe.removeEventListener("load", onFrameLoad)
      if (a) safe(() => a.unmount())
      mountedWin = null
      iframe.remove()
      root.remove()
    },
  }
}
