// opencode-slides viewer: an iframe app around pptx-react-viewer's PowerPointViewer.
// Built with `npm run build:viewer` into dist/viewer.js (IIFE). Executing it inside a document
// defines window.SlidesApp (see SPEC2.md "The viewer API" and SPEC3.md TASK V3).
import React from "react"
import { createRoot } from "react-dom/client"
import {
  PowerPointViewer,
  PptxI18nProvider,
  renderToCanvas,
  THEME_CATALOG,
  defaultThemeColors,
  createImageElementFromFile,
} from "pptx-react-viewer"
import { translationsEn, keyToLabel } from "pptx-react-viewer/i18n"
import css from "pptx-react-viewer/styles.css" with { type: "text" }
import { installAnimationIcons } from "./anim-icons.js"
import { jsPDF } from "jspdf"

// ---------------------------------------------------------------------------------------------
// Static configuration (module-level so the references stay stable across renders: a new
// `customization` object replaces the whole customisation, a new `translate` re-translates).

const translate = (key, params) => {
  let s = translationsEn[key] ?? keyToLabel(key)
  if (params && typeof s === "string") s = s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(params[k] ?? ""))
  return s
}

// Top-level toolbar buttons / ribbon tabs we do not want in the side panel.
const HIDDEN_ACTIONS = ["share", "broadcast", "record"]

const CUSTOMIZATION = {
  // AI assistant + real-time collaboration (Share dialog, presence) are off as whole features.
  disabledFeatures: ["ai", "collaboration"],
  // Title bar = AutoSave toggle + file name + quick-access row; the panel header owns those.
  hiddenPanels: ["titleBar"],
  hiddenDialogs: ["share", "broadcast", "passwordProtection", "signatures"],
  capabilities: { share: false },
  ribbon: { hiddenTabs: ["record"], hiddenButtons: ["share", "broadcast", "record"] },
  // File tab: the host owns opening/saving the deck, and there is no account.
  backstage: {
    hiddenPages: ["home", "new", "open", "share", "close", "account"],
    hiddenCards: ["share", "versionHistory"],
  },
}

// Compact (default): only the slide. Every side/status panel is hidden; the ribbon and thumbnails are
// turned off via props. openMenu() switches to the full editor chrome until closeMenu().
const COMPACT_CUSTOMIZATION = {
  ...CUSTOMIZATION,
  hiddenPanels: ["titleBar", "statusBar", "slidesPane", "inspector", "notes", "quickAccessToolbar", "selectionPane", "findReplace", "accessibilityPane", "comparePane"],
}

const LIGHT_THEME = THEME_CATALOG.find((e) => e.key === "light")?.theme ?? { colors: {} }
const DARK_THEME = { colors: { ...defaultThemeColors } }

// The user's pick in File › Options › Appearance wins over the host's light/dark; remembered across
// panels. "default" is the library's own (dark) look.
const THEME_PREF = "opencode-slides:viewer-theme"
let userThemeKey = (() => {
  try {
    return localStorage.getItem(THEME_PREF)
  } catch {
    return null
  }
})()

function currentTheme() {
  if (userThemeKey) {
    const entry = THEME_CATALOG.find((e) => e.key === userThemeKey)
    if (entry) return entry.theme ?? DARK_THEME
  }
  return state?.dark ? DARK_THEME : LIGHT_THEME
}

function themeIsDark() {
  if (!userThemeKey) return !!state?.dark
  return userThemeKey === "default" || /dark/i.test(userThemeKey)
}

function onThemeChange(key) {
  userThemeKey = key || null
  try {
    if (userThemeKey) localStorage.setItem(THEME_PREF, userThemeKey)
    else localStorage.removeItem(THEME_PREF)
  } catch {}
  render()
}

// Dark mode also restyles the canvas surround (the grey area around the slide).
const DARK_SURROUND_CSS = `
:root { color-scheme: dark; --office-background: #1f1f1f; --pptx-background: #1f1f1f; }
[data-pptx-viewport] { background: #1f1f1f !important; }
`
const LIGHT_SURROUND_CSS = ":root { color-scheme: light; } [data-pptx-outline-view] { background: #ffffff !important; color: #1f2937 !important; }"

const REGION_SELECTOR = '[data-pptx-viewport] [role="region"][aria-label^="Slide"]'
const MAX_TEXT = 500
const DEFAULT_SLIDE = { width: 1280, height: 720 }

// ---------------------------------------------------------------------------------------------
// State

const ref = React.createRef()
let root = null
let container = null
let styleEl = null
let themeEl = null
let stopIcons = null
let opts = {}
let state = null
let tools = false // full editor chrome (ribbon, thumbnails, panels) vs. slide only
let lastHistory = ""

function freshState(bytes, initialSlide, dark) {
  return {
    bytes,
    initialSlide: Math.max(0, initialSlide | 0),
    dark: !!dark,
    key: (state?.key ?? 0) + 1,
    loading: true,
    slideCount: 0,
    active: Math.max(0, initialSlide | 0),
    selection: [],
    // Dirty tracking: revisions instead of the library flag, so markSaved() can clear it.
    editRev: 0,
    savedRev: 0,
    contentRev: null, // editRev at the time of the last getContent() call
    dirty: false,
  }
}

let capturing = 0 // > 0 while capture() moves between slides: suppress onSlide/onSelection
let captureChain = Promise.resolve()

function call(name, ...args) {
  try {
    opts[name]?.(...args)
  } catch (err) {
    console.error(`[SlidesApp] ${name} callback failed`, err)
  }
}

function handle() {
  return ref.current ?? null
}

// ---------------------------------------------------------------------------------------------
// Download interception (installed once per window, inside the viewer's document).
// The viewer saves files by creating a Blob URL and clicking an <a download>; in Electron such
// clicks go nowhere. We read the bytes and hand them to the host via onDownload instead.

const blobByUrl = new Map()

function extFromMime(mime) {
  const m = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "application/json": "json",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  }
  return m[mime] ?? "bin"
}

// Starts reading synchronously (the blob may be revoked a moment later) and reports to the host.
function routeDownload(name, href, mimeHint) {
  const local = blobByUrl.get(href)
  const pending = local ? Promise.resolve(local) : fetch(href).then((r) => r.blob())
  pending
    .then(async (blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const mime = blob.type || mimeHint || "application/octet-stream"
      const fileName = name && name.trim() ? name.trim() : `download.${extFromMime(mime)}`
      call("onDownload", { name: fileName, mime, bytes })
    })
    .catch((err) => console.error("[SlidesApp] download failed", err))
}

function interceptAnchor(a) {
  if (!a.hasAttribute("download")) return false
  const href = a.href || ""
  if (!/^(blob|data):/.test(href)) return false
  routeDownload(a.getAttribute("download") || "", href)
  return true
}

function installHooks(win) {
  if (win.__opencodeSlidesHooks) return
  win.__opencodeSlidesHooks = true

  const URLCls = win.URL
  const origCreate = URLCls.createObjectURL
  URLCls.createObjectURL = function (obj) {
    const url = origCreate.call(this, obj)
    if (obj instanceof win.Blob) blobByUrl.set(url, obj)
    return url
  }
  const origRevoke = URLCls.revokeObjectURL
  URLCls.revokeObjectURL = function (url) {
    blobByUrl.delete(url)
    return origRevoke.call(this, url)
  }

  const AP = win.HTMLAnchorElement.prototype
  const origClick = AP.click
  AP.click = function () {
    if (interceptAnchor(this)) return undefined
    return origClick.call(this)
  }
  const origDispatch = AP.dispatchEvent
  AP.dispatchEvent = function (ev) {
    if (ev && ev.type === "click" && interceptAnchor(this)) return false
    return origDispatch.call(this, ev)
  }

  const origOpen = win.open
  win.open = function (url, ...rest) {
    if (typeof url === "string" && url.startsWith("blob:") && blobByUrl.has(url)) {
      routeDownload("", url)
      return null
    }
    return origOpen.call(this, url, ...rest)
  }

  win.print = function () {
    call("onPrint")
  }

  // Forces the viewer onto anchor downloads (the native picker cannot be used in a sandboxed iframe).
  try {
    delete win.showSaveFilePicker
  } catch {}
}

// ---------------------------------------------------------------------------------------------
// Viewer callbacks

function setDirty(next) {
  if (!state || state.dirty === next) return
  state.dirty = next
  call("onDirty", next)
}

// The library fires onChange/onDirty as a side effect of serialising (getContent), which would flag the
// deck as edited again right after it was saved and stop later edits from being autosaved. Edits that
// arrive while serialising, or within a short window after it, are that echo, not user edits.
let serializing = false
let quietUntil = 0

function noteEdit() {
  if (!state || state.loading) return
  if (serializing || Date.now() < quietUntil) return
  state.editRev++
  setDirty(true)
}

// Called after any document change, including the API's own edits and undo/redo.
function afterEdit() {
  noteEdit()
  emitHistory()
}

// Deck-level changes (theme, variant, background, slide size, …) do not fire onChange; the
// serialised-content callback does. Ignore the reports that arrive while (re)loading.
function afterContentChange() {
  if (!state || state.loading) return
  afterEdit()
}

function onDirtyChange(isDirty) {
  // The library only reports transitions; after markSaved() it stays "dirty" internally, so later
  // edits are detected through onChange. A false report (e.g. undo back to the loaded state) is
  // ignored: the host will simply save once more.
  if (!state || state.loading || !isDirty) return
  if (state.editRev === state.savedRev) noteEdit()
}

function emitHistory(force = false) {
  const h = handle()
  if (!h || !state) return
  const next = { canUndo: !!h.canUndo?.(), canRedo: !!h.canRedo?.() }
  const json = JSON.stringify(next)
  if (!force && json === lastHistory) return
  lastHistory = json
  call("onHistory", next)
}

function elementText(el) {
  let t = el?.text
  if (typeof t !== "string") {
    if (Array.isArray(el?.textSegments)) t = el.textSegments.map((s) => s?.text ?? "").join("")
    else t = ""
  }
  return t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) : t
}

function findElement(h, id, slideIndex) {
  let el = null
  try {
    el = h.getElementById?.(id, slideIndex) ?? null
  } catch {}
  if (el) return el
  try {
    const stack = [...(h.getElements?.(slideIndex) ?? [])]
    while (stack.length) {
      const e = stack.shift()
      if (!e) continue
      if (e.id === id) return e
      if (Array.isArray(e.children)) stack.push(...e.children)
    }
  } catch {}
  return null
}

function toItems(ids) {
  const h = handle()
  if (!h || !state || !ids?.length) return []
  const slide = state.active
  return ids.map((id) => {
    const el = findElement(h, id, slide)
    return {
      slide: slide + 1,
      elementId: String(id),
      shapeId: el?.shapeId != null ? String(el.shapeId) : null,
      name: el?.name ? String(el.name) : String(el?.type ?? "element"),
      type: String(el?.type ?? "unknown"),
      text: elementText(el),
    }
  })
}

// Last values reported to the host, to drop the viewer's repeated/transient notifications
// (it re-reports an empty selection and slide 0 while (re)loading).
let emitted = { slide: null, selection: "[]" }

function emitSelection() {
  const json = JSON.stringify(state.selection)
  if (json === emitted.selection) return
  emitted.selection = json
  call("onSelection", state.selection.slice())
}

function emitSlide() {
  if (state.active === emitted.slide) return
  emitted.slide = state.active
  call("onSlide", state.active)
}

function onSelectionChange(ids) {
  if (!state) return
  state.selection = toItems(ids)
  if (!capturing && !state.loading) emitSelection()
}

function onActiveSlideChange(index) {
  if (!state) return
  state.active = index
  if (!capturing && !state.loading) emitSlide()
}

function onSlideCountChange(n) {
  if (state) state.slideCount = n
}

function onLoad(detail) {
  if (!state) return
  state.loading = false
  state.slideCount = detail?.slideCount ?? handle()?.getSlideCount?.() ?? 0
  state.active = Math.min(state.initialSlide, Math.max(0, state.slideCount - 1))
  state.selection = []
  state.editRev = state.savedRev = 0
  state.contentRev = null
  setDirty(false)
  emitSlide()
  emitSelection()
  emitHistory(true)
  call("onReady", { slideCount: state.slideCount })
}

function onError(message) {
  call("onError", message)
}

function onPresentationChange(presenting) {
  call("onPresentChange", !!presenting)
}

// Every save from inside the viewer comes here (the viewer only downloads when no storage is given).
// Plain Save → the host writes the open deck. Save As (.pptx/.ppsx/.pptm/.ppt) → the host asks where
// to put the copy (its Save dialog) via onSaveAs, else the generic onDownload path.
const STORAGE = {
  async save(bytes, meta) {
    if (!meta || meta.reason === "save") {
      call("onSaveRequest")
      return
    }
    const file = { name: meta.fileName || "presentation.pptx", mime: meta.mimeType || "", bytes: toBytes(bytes) }
    if (typeof opts.onSaveAs === "function") {
      const result = await opts.onSaveAs(file)
      return result && result.fileName ? { fileName: result.fileName } : undefined
    }
    call("onDownload", file)
  },
}

// ---------------------------------------------------------------------------------------------
// Rendering

function applyPageTheme(doc) {
  const c = currentTheme().colors ?? {}
  const dark = themeIsDark()
  doc.documentElement.style.colorScheme = dark ? "dark" : "light"
  if (doc.body) doc.body.style.background = c.background ?? ""
  if (themeEl) themeEl.textContent = dark ? DARK_SURROUND_CSS : LIGHT_SURROUND_CSS
}

function render() {
  if (!root || !state) return
  applyPageTheme(container.ownerDocument, state.dark)
  const path = opts.path ? String(opts.path) : undefined
  const fileName = path ? path.split(/[\\/]/).pop() : undefined
  root.render(
    <PptxI18nProvider locale="en" translate={translate}>
      <div style={{ height: "100%", width: "100%" }}>
        <PowerPointViewer
          key={state.key}
          ref={ref}
          content={state.bytes}
          canEdit={true}
          fileName={fileName}
          filePath={path}
          initialSlide={state.initialSlide}
          theme={currentTheme()}
          defaultThemeKey={userThemeKey ?? (state.dark ? "default" : "light")}
          onThemeChange={onThemeChange}
          autosave={false}
          storage={STORAGE}
          hiddenActions={HIDDEN_ACTIONS}
          customization={tools ? CUSTOMIZATION : COMPACT_CUSTOMIZATION}
          showToolbar={tools}
          showThumbnails={tools}
          showCompatibilityToasts={false}
          inspectorInitiallyOpen={false}
          onLoad={onLoad}
          onError={onError}
          onSelectionChange={onSelectionChange}
          onActiveSlideChange={onActiveSlideChange}
          onSlideCountChange={onSlideCountChange}
          onDirtyChange={onDirtyChange}
          onChange={afterEdit}
          onContentChange={afterContentChange}
          onPresentationChange={onPresentationChange}
          onOpenFile={() => call("onOpenRequest")}
        />
      </div>
    </PptxI18nProvider>,
  )
}

function toBytes(bytes) {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  if (ArrayBuffer.isView(bytes)) return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  throw new TypeError("SlidesApp: bytes must be a Uint8Array")
}

function dataUrlToBytes(url) {
  const bin = atob(url.slice(url.indexOf(",") + 1))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ---------------------------------------------------------------------------------------------
// Capture

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function frame(win) {
  // rAF can be throttled in background/hidden frames; never wait more than 100 ms for one.
  return Promise.race([new Promise((r) => win.requestAnimationFrame(() => r())), sleep(100)])
}

function findRegion(doc, index) {
  const label = `Slide ${index + 1}`
  for (const el of doc.querySelectorAll(REGION_SELECTOR)) {
    if (el.getAttribute("aria-label") === label && el.offsetWidth > 0) return el
  }
  return null
}

async function waitForRegion(index, timeoutMs = 8000) {
  const doc = container.ownerDocument
  const win = doc.defaultView
  const end = Date.now() + timeoutMs
  let el = null
  while (!(el = findRegion(doc, index))) {
    if (Date.now() > end) throw new Error(`slide ${index + 1} did not render`)
    await sleep(30)
  }
  await frame(win)
  await frame(win)
  try {
    await Promise.race([doc.fonts?.ready, sleep(3000)])
  } catch {}
  // Let pictures finish decoding (bounded).
  const imgs = [...el.querySelectorAll("img")].filter((i) => !i.complete)
  if (imgs.length) {
    await Promise.race([
      Promise.all(imgs.map((i) => new Promise((r) => (i.addEventListener("load", r, { once: true }), i.addEventListener("error", r, { once: true }))))),
      sleep(3000),
    ])
  }
  return findRegion(doc, index) ?? el
}

async function captureRegion(el, width) {
  const w = el.offsetWidth
  const h = el.offsetHeight
  const canvas = await renderToCanvas(el, {
    scale: width / w,
    width: w,
    height: h,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (doc, clone) => {
      clone.style.transform = "none"
      clone.classList.remove("shadow-2xl")
      for (let p = clone.parentElement; p; p = p.parentElement) {
        p.style.overflow = "visible"
        p.style.transform = "none"
      }
      // Selection ring/outline of the selected element (class combo used by the viewer).
      for (const sel of clone.querySelectorAll(".ring-2")) {
        sel.style.outline = "none"
        sel.style.boxShadow = "none"
      }
    },
  })
  return canvas.toDataURL("image/png")
}

// The handle object is recreated on viewer renders (a kept reference has stale getters), so never
// keep one across awaits: always read ref.current afresh.
function activeIndex() {
  const i = handle()?.getActiveSlideIndex?.()
  return Number.isInteger(i) ? i : state?.active ?? 0
}

async function doCapture(indexes, width) {
  if (!handle() || !state || state.loading) throw new Error("no deck loaded")
  const count = handle().getSlideCount?.() ?? state.slideCount
  for (const i of indexes) {
    if (!Number.isInteger(i) || i < 0 || i >= count) throw new RangeError(`slide ${i + 1} out of range (1-${count})`)
  }
  const prevSlide = activeIndex()
  const prevSel = handle().getSelectedElementIds?.() ?? []
  const out = []
  capturing++
  try {
    for (const i of indexes) {
      if (activeIndex() !== i) handle()?.goTo(i)
      const el = await waitForRegion(i)
      out.push(await captureRegion(el, width))
    }
  } finally {
    try {
      if (activeIndex() !== prevSlide) {
        handle()?.goTo(prevSlide)
        await waitForRegion(prevSlide, 3000).catch(() => {})
        await frame(container.ownerDocument.defaultView)
        if (prevSel.length) handle()?.selectElements?.(prevSel)
      }
    } finally {
      capturing--
    }
    if (state) state.active = activeIndex()
  }
  return out
}

// Lets React commit and the viewer refresh its handle after a model change (bounded).
async function settle() {
  const win = container?.ownerDocument?.defaultView
  if (win) {
    await frame(win)
    await frame(win)
  } else await sleep(50)
}

// Size of the active slide in canvas px (the region's layout size; transforms ignored).
function slideSize() {
  const doc = container?.ownerDocument
  const el = doc ? findRegion(doc, activeIndex()) : null
  const width = el?.offsetWidth
  const height = el?.offsetHeight
  return width > 0 && height > 0 ? { width, height } : { ...DEFAULT_SLIDE }
}

// ---------------------------------------------------------------------------------------------
// Editing helpers

function ready() {
  return !!(handle() && state && !state.loading)
}

const COLOR_RE = /^#[0-9a-f]{6}$/i
const ALIGN = new Set(["left", "center", "right"])
const DEFAULT_FONT_PX = 24 // 18 pt

// Patch for one element from a format() request, or null when nothing applies to it.
function formatPatch(el, f) {
  const patch = {}
  const hasText = el.type === "text" || Array.isArray(el.textSegments) || !!el.textStyle
  const add = {}
  if (hasText) {
    if (typeof f.bold === "boolean") add.bold = f.bold
    if (typeof f.italic === "boolean") add.italic = f.italic
    if (typeof f.underline === "boolean") add.underline = f.underline
    if (typeof f.fontSize === "number" && f.fontSize > 0) add.fontSize = f.fontSize / 0.75
    if (typeof f.fontSizeDelta === "number" && f.fontSizeDelta) {
      // Points in, px stored (pt = px * 0.75).
      const cur = el.textStyle?.fontSize ?? el.textSegments?.[0]?.style?.fontSize ?? DEFAULT_FONT_PX
      add.fontSize = Math.max(1, cur * 0.75 + f.fontSizeDelta) / 0.75
    }
    if (typeof f.color === "string" && COLOR_RE.test(f.color)) add.color = f.color.toUpperCase()
    if (typeof f.align === "string" && ALIGN.has(f.align)) add.align = f.align
  }
  if (Object.keys(add).length) {
    if (Array.isArray(el.textSegments)) {
      patch.textSegments = el.textSegments.map((s) => ({
        ...s,
        style: { ...s.style, ...add, authoredRunStyle: { ...s.style?.authoredRunStyle, ...add } },
      }))
    }
    patch.textStyle = { ...el.textStyle, ...add }
  }
  if (typeof f.fill === "string" && COLOR_RE.test(f.fill) && (el.type === "shape" || el.shapeStyle)) {
    patch.shapeStyle = { ...el.shapeStyle, fillMode: "solid", fillColor: f.fill.toUpperCase() }
  }
  return Object.keys(patch).length ? patch : null
}

const SHAPES = {
  rect: { name: "Rectangle", shapeType: "rect", width: 320, height: 200, fill: true },
  ellipse: { name: "Oval", shapeType: "ellipse", width: 320, height: 200, fill: true },
  arrow: { name: "Right Arrow", shapeType: "rightArrow", width: 360, height: 160, fill: true },
  line: { name: "Line", shapeType: "line", width: 360, height: 0, fill: false },
}

// Ribbon at half size: every icon stays, large ones go 32 -> 16 px and the buttons/groups shrink to fit.
const RIBBON_COMPACT_CSS = `
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] button[data-size="large"] {
  min-width: 36px !important; height: 40px !important; min-height: 40px !important; padding: 2px 4px !important; gap: 1px !important;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] button[data-size="large"] svg:not(.chev) { width: 16px !important; height: 16px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] button[data-size="large"] svg.chev { width: 8px !important; height: 8px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] button[data-pptx-chrome="split-main"][data-size="large"] { height: 28px !important; min-height: 28px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] [data-ribbon-group] { min-height: 56px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] [data-ribbon-group] button:not([data-size="large"]) svg:not(.chev) { width: 12px !important; height: 12px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] [data-ribbon-group] button:not([data-size="large"]) { height: 20px !important; min-width: 22px !important; font-size: 11px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] [data-pptx-chrome="ribbon-group-label"] { height: 12px !important; font-size: 10px !important; line-height: 12px !important; }
/* One top row: tabs on the left, the Present/Show/panel buttons on the right, the ribbon below. */
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon"] { display: flex !important; flex-wrap: wrap !important; align-items: center !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-tabs"] { order: 1; flex: 1 1 auto !important; min-width: 0 !important; overflow: hidden !important; height: 26px !important; min-height: 26px !important; border-bottom: 0 !important; padding: 0 2px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-tab-scroll"] { height: 26px !important; margin-bottom: 0 !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-tabs"] [role="tab"] { height: 26px !important; padding: 4px 8px !important; font-size: 11px !important; line-height: 18px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-tabs"] button:not([role="tab"]) { height: 22px !important; padding: 0 6px !important; font-size: 11px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-tabs"] button:not([role="tab"]) svg { width: 12px !important; height: 12px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-primary"] { order: 2; flex: 0 0 auto !important; margin-left: auto !important; max-width: 100%; position: relative; z-index: 2; height: 26px !important; min-height: 26px !important; padding: 0 4px !important; gap: 0 !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-primary"] button { height: 22px !important; min-height: 0 !important; min-width: 0 !important; padding: 0 5px !important; font-size: 11px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-primary"] button svg { width: 13px !important; height: 13px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] { order: 3; flex: 1 0 100% !important; min-height: 0 !important; border-top: 1px solid var(--pptx-border); }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon"] > :not([data-pptx-chrome="ribbon-primary"]):not([data-pptx-chrome="ribbon-tabs"]):not([data-pptx-chrome="ribbon-content"]) { order: 4; flex: 1 0 100%; }

/* Design / Transitions / Insert / ...: the newer library ribbon uses shadow DOM, so size it via --office-* custom properties on the outer elements. */
pptx-ui-ribbon-command[size="large"] { --office-command-large-icon: 16px; --office-command-large-height: 40px; --office-command-large-min-width: 40px; --office-command-large-max-width: 72px; --office-font-size-sm: 11px; --office-line-height-tight: 12px; }
pptx-ui-ribbon-group { --office-ribbon-group-height: 56px; --office-ribbon-group-padding: 2px 4px 0; --office-ribbon-caption-size: 10px; --office-ribbon-caption-line-height: 14px; --office-ribbon-caption-padding: 0 6px; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group { min-height: 0 !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] button.preset { width: 52px !important; height: 50px !important; min-width: 0 !important; padding: 3px 1px 0 !important; font-size: 10px !important; line-height: 11px !important; gap: 2px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] button.preset svg { width: 24px !important; height: 16px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] button.tile { height: 24px !important; min-width: 40px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] button.tile svg { width: 24px !important; height: 16px !important; }
/* Dialogs (Browse Themes, ...) are drawn inside the editor body, which sits below the ribbon; lift it while one is open so the ribbon no longer covers the dialog header and its close button. */
[data-pptx-editor-chrome] [data-pptx-chrome="body"]:has(.fixed.inset-0) { z-index: 40 !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="body"] .fixed.inset-0 > .bg-background { background-color: var(--pptx-background, #ffffff) !important; opacity: 1 !important; }
/* Compact sizes for every tab (v5). Preset/gallery rules apply to Animations only. */
/* ===== Compact ribbon v5 (append after RIBBON_COMPACT_CSS). Scoped to pptx-ui-ribbon-group / -command so Home is untouched. ===== */
/* 1. Library size tokens. Outer rules beat each element's own :host defaults; tokens inherit into shadow DOM. */
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-command {
  --office-command-large-height: 41px;
  --office-command-large-min-width: 40px;
  --office-command-large-max-width: 72px;
  --office-command-large-icon: 16px;
  --office-command-tall-height: 41px;
  --office-command-tall-min-width: 40px;
  --office-command-tall-icon: 16px;
  --office-command-small-icon: 12px;
  --office-font-size-sm: 11px;
  --office-line-height-tight: 11px;
  --office-control-height: 20px;
  --office-target-size: 20px;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group {
  --office-command-large-height: 41px;
  --office-command-large-min-width: 40px;
  --office-command-large-max-width: 72px;
  --office-command-large-icon: 16px;
  --office-collapsed-group-min-width: 40px;
  --office-ribbon-group-height: 56px;
  --office-ribbon-group-padding: 2px 3px 0;
  --office-ribbon-caption-size: 10px;
  --office-ribbon-caption-line-height: 12px;
  --office-ribbon-caption-padding: 1px 2px 0;
  --office-ribbon-separator-inset: 4px;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-toggle,
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-slide-show-options {
  --office-ribbon-row-height: 14px;
  line-height: 14px;
}
/* 2. Stacked one-row commands (3-4 per column): 13px rows, 1px gaps, so a stack is at most 41px. */
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group .stack { gap: 1px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group .stack pptx-ui-ribbon-command {
  --office-control-height: 13px; --office-target-size: 13px; --office-command-small-icon: 10px; --office-font-size-sm: 10px;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group .stack button,
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group .stack .trigger {
  height: 13px !important; min-height: 13px !important; padding: 0 3px !important; font-size: 10px !important; line-height: 12px !important;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group .stack button svg:not(.chev) { width: 10px !important; height: 10px !important; }
/* 3. Top-level large light-DOM commands and menu triggers: 41px box, same as the shadow large commands. */
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group button[data-size="large"]:not(.stack *),
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group .menu > .trigger.large:not(.stack *) {
  height: 41px !important; min-height: 41px !important;
}
/* 4. Galleries: the library pins .gallery to 62px and .preset to a 20px icon-over-label tile. */
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group[data-ribbon-group^="animations"] .gallery { height: 42px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group[data-ribbon-group^="animations"] .gallery .column { gap: 0 !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group[data-ribbon-group^="animations"] button.preset {
  flex-direction: row !important; justify-content: flex-start !important; align-items: center !important;
  height: 13px !important; min-height: 13px !important; min-width: 70px !important;
  padding: 0 4px !important; gap: 3px !important; font-size: 10px !important; line-height: 12px !important;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group[data-ribbon-group^="animations"] button.preset svg { width: 10px !important; height: 10px !important; flex: none; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group[data-ribbon-group^="animations"] button.preset .name {
  display: block !important; height: auto !important; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: start;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group[data-ribbon-group^="animations"] .gallery .more { height: 13px !important; min-height: 13px !important; }
/* 5. Timing duration field. */
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] [data-ribbon-group="animations.timing"] input { height: 20px !important; min-height: 20px !important; }
/* 6. Scroll, don't clip: keep horizontal scrolling but draw a thin scrollbar instead of the default strip. */
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] { scrollbar-width: thin; }
/* Design / Transitions / Animations: larger, readable icons and galleries. */
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group:is([data-ribbon-group^="design"],[data-ribbon-group^="transitions"],[data-ribbon-group^="animations"]) {
  --office-command-large-icon: 26px; --office-command-large-height: 62px; --office-command-large-min-width: 56px; --office-command-large-max-width: 92px;
  --office-font-size-sm: 12px; --office-line-height-tight: 14px;
  --office-ribbon-group-height: 90px; --office-ribbon-group-padding: 3px 5px 0; --office-ribbon-caption-size: 11px; --office-ribbon-caption-line-height: 14px;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group:is([data-ribbon-group^="design"],[data-ribbon-group^="transitions"],[data-ribbon-group^="animations"]) pptx-ui-ribbon-command[size="large"] {
  --office-command-large-icon: 26px; --office-command-large-height: 62px; --office-command-large-min-width: 56px; --office-command-large-max-width: 92px;
  --office-font-size-sm: 12px; --office-line-height-tight: 14px;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group:is([data-ribbon-group^="design"],[data-ribbon-group^="transitions"],[data-ribbon-group^="animations"]) .gallery { height: 78px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group:is([data-ribbon-group^="design"],[data-ribbon-group^="transitions"],[data-ribbon-group^="animations"]) button.preset {
  flex-direction: column !important; justify-content: flex-start !important; align-items: center !important;
  width: 66px !important; min-width: 66px !important; height: 70px !important; min-height: 70px !important;
  padding: 4px 2px 0 !important; gap: 3px !important; font-size: 11px !important; line-height: 13px !important;
}
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group:is([data-ribbon-group^="design"],[data-ribbon-group^="transitions"],[data-ribbon-group^="animations"]) button.preset svg.tile-icon { width: 42px !important; height: 28px !important; flex: none; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group:is([data-ribbon-group^="design"],[data-ribbon-group^="transitions"],[data-ribbon-group^="animations"]) button.preset .name { display: block !important; height: auto !important; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group:is([data-ribbon-group^="design"],[data-ribbon-group^="transitions"],[data-ribbon-group^="animations"]) button.tile { width: 96px !important; height: 60px !important; min-width: 96px !important; padding: 2px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group:is([data-ribbon-group^="design"],[data-ribbon-group^="transitions"],[data-ribbon-group^="animations"]) button.tile[data-gallery-item] svg:not(.chev) { width: 100% !important; height: 100% !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group[data-ribbon-group="design.variants"] button.tile { width: 70px !important; height: 46px !important; min-width: 70px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group[data-ribbon-group="design.variants"] .gallery { height: 60px !important; }
[data-pptx-editor-chrome] [data-pptx-chrome="ribbon-content"] pptx-ui-ribbon-group:is([data-ribbon-group^="design"],[data-ribbon-group^="transitions"],[data-ribbon-group^="animations"]) button.preset svg.tile-icon[data-ocs-icon] { width: 34px !important; height: 34px !important; }
`

// ---------------------------------------------------------------------------------------------
// Public API

const SlidesApp = {
  mount(el, bytes, options = {}) {
    if (!el) throw new TypeError("SlidesApp.mount: container required")
    if (root) SlidesApp.unmount()
    installHooks(window)
    container = el
    opts = options || {}
    tools = !!opts.tools
    const doc = el.ownerDocument
    styleEl = doc.createElement("style")
    styleEl.setAttribute("data-opencode-slides", "")
    styleEl.textContent = css + RIBBON_COMPACT_CSS
    doc.head.appendChild(styleEl)
    themeEl = doc.createElement("style")
    themeEl.setAttribute("data-opencode-slides-theme", "")
    doc.head.appendChild(themeEl)
    stopIcons?.()
    stopIcons = installAnimationIcons(doc)
    emitted = { slide: null, selection: "[]" }
    lastHistory = ""
    state = freshState(toBytes(bytes), opts.initialSlide ?? 0, opts.dark)
    root = createRoot(el)
    render()
  },

  load(bytes, { initialSlide } = {}) {
    if (!root || !state) throw new Error("SlidesApp: not mounted")
    const next = freshState(toBytes(bytes), initialSlide ?? state.active, state.dark)
    if (state.dirty) call("onDirty", false)
    state = next
    render()
  },

  async getContent() {
    const h = handle()
    if (!h || !state) throw new Error("SlidesApp: not mounted")
    const rev = state.editRev
    serializing = true
    try {
      const bytes = await h.getContent()
      state.contentRev = rev
      return bytes
    } finally {
      serializing = false
      quietUntil = Date.now() + 500
    }
  },

  markSaved() {
    if (!state) return
    state.savedRev = state.contentRev ?? state.editRev
    setDirty(state.editRev !== state.savedRev)
  },

  isDirty() {
    return !!state?.dirty
  },

  getSlideCount() {
    return handle()?.getSlideCount?.() ?? state?.slideCount ?? 0
  },

  getActiveSlide() {
    return state ? activeIndex() : 0
  },

  goTo(index) {
    handle()?.goTo(index)
  },

  getSelection() {
    return state ? state.selection.slice() : []
  },

  capture(indexes, { width = 1280 } = {}) {
    const list = indexes == null ? [SlidesApp.getActiveSlide()] : [...indexes]
    const run = captureChain.then(() => doCapture(list, width))
    captureChain = run.catch(() => {})
    return run
  },

  // ----- history -----
  undo() {
    if (!ready() || !handle().canUndo?.()) return false
    handle().undo()
    emitHistory()
    return true
  },

  redo() {
    if (!ready() || !handle().canRedo?.()) return false
    handle().redo()
    emitHistory()
    return true
  },

  canUndo() {
    return ready() && !!handle().canUndo?.()
  },

  canRedo() {
    return ready() && !!handle().canRedo?.()
  },

  // ----- slides -----
  // The handle updates after React commits, so these wait for a settle before reading state.
  // addSlide(): adds after the active slide and shows it. Resolves the new active index (-1 if not possible).
  async addSlide() {
    if (!ready()) return -1
    const i = activeIndex()
    handle().addSlide(i)
    await settle()
    if (activeIndex() !== i + 1) {
      handle()?.goTo(i + 1)
      await settle()
    }
    afterEdit()
    return activeIndex()
  },

  // Duplicates the active slide and shows the copy. Resolves the copy's index (-1 if not possible).
  async duplicateSlide() {
    if (!ready()) return -1
    const i = activeIndex()
    handle().duplicateSlides([i])
    await settle()
    if (activeIndex() !== i + 1) {
      handle()?.goTo(i + 1)
      await settle()
    }
    afterEdit()
    return activeIndex()
  },

  // Deletes the active slide. Resolves false when it is the only slide.
  async deleteSlide() {
    if (!ready() || SlidesApp.getSlideCount() <= 1) return false
    handle().deleteSlides([activeIndex()])
    await settle()
    afterEdit()
    return true
  },

  // ----- insert (onto the active slide, selects the new element, returns its id) -----
  insertText() {
    if (!ready()) return undefined
    const { width: W, height: H } = slideSize()
    const width = 400
    const height = 80
    const id = handle().addElement({
      id: "text",
      type: "text",
      name: "TextBox",
      x: (W - width) / 2,
      y: (H - height) / 2,
      width,
      height,
      text: "Text",
      textSegments: [{ text: "Text", style: { fontSize: 32, color: "#000000" } }],
      textStyle: { fontSize: 32, color: "#000000", align: "left", vAlign: "top" },
    })
    afterEdit()
    return id
  },

  insertShape(kind) {
    if (!ready()) return undefined
    const spec = SHAPES[kind]
    if (!spec) return undefined
    const { width: W, height: H } = slideSize()
    const id = handle().addElement({
      id: "shape",
      type: "shape",
      name: spec.name,
      shapeType: spec.shapeType,
      x: (W - spec.width) / 2,
      y: (H - spec.height) / 2,
      width: spec.width,
      height: spec.height,
      shapeStyle: spec.fill
        ? { fillMode: "solid", fillColor: "#2E86DE", strokeColor: "#1B4F72", strokeWidth: 2 }
        : { fillMode: "none", strokeColor: "#1B4F72", strokeWidth: 2 },
    })
    afterEdit()
    return id
  },

  // bytes: Uint8Array/ArrayBuffer of a PNG/JPEG/GIF; mime e.g. "image/png". Max 60% of slide width.
  async insertImage(bytes, mime = "image/png") {
    if (!ready()) return undefined
    const { width: W, height: H } = slideSize()
    const blob = new Blob([toBytes(bytes)], { type: mime })
    const el = await createImageElementFromFile(blob, { width: W * 0.6, height: H })
    if (!ready() || !el) return undefined
    // The factory fits the picture inside a 60%-wide box at the top-left; centre it on the slide.
    el.x = (W - el.width) / 2
    el.y = (H - el.height) / 2
    const id = handle().addElement(el)
    afterEdit()
    return id
  },

  // Deletes the selected elements. Returns false when nothing is selected.
  deleteSelection() {
    if (!ready()) return false
    const ids = handle().getSelectedElementIds?.() ?? []
    if (!ids.length) return false
    handle().deleteElements(ids)
    afterEdit()
    return true
  },

  // Applies a patch to the selected elements (one undo step).
  // patch: { bold?, italic?, underline?: bool, fontSizeDelta?: number (pt), fontSize?: number (pt),
  //          color?: "#rrggbb" (text), fill?: "#rrggbb" (shapes), align?: "left"|"center"|"right" }
  // Resolves true when something was changed, false when the selection does not support it.
  async format(patch = {}) {
    if (!ready()) return false
    const h = handle()
    const ids = h.getSelectedElementIds?.() ?? []
    if (!ids.length) return false
    const slideIndex = activeIndex()
    const slide = h.getSlide(slideIndex)
    if (!slide) return false
    const updates = []
    for (const id of ids) {
      const el = findElement(h, id, slideIndex)
      const p = el && formatPatch(el, patch)
      if (p) updates.push({ slideId: slide.id, elementId: String(id), patch: p })
    }
    if (!updates.length) return false
    try {
      await handle().updateElements(updates, { label: "Format" })
    } catch (err) {
      console.error("[SlidesApp] format failed", err)
      return false
    }
    afterEdit()
    return true
  },

  // PowerPoint-style toggle of bold/italic/underline on the selection: if the first selected element
  // already has it, switch it off for all, otherwise on.
  async toggleFormat(key) {
    if (!ready() || !["bold", "italic", "underline"].includes(key)) return false
    const h = handle()
    const first = (h.getSelectedElementIds?.() ?? [])[0]
    const el = first != null ? findElement(h, first, activeIndex()) : null
    if (!el) return false
    const on = !!(el.textStyle?.[key] ?? el.textSegments?.[0]?.style?.[key])
    return SlidesApp.format({ [key]: !on })
  },

  // ----- export -----
  // PNG bytes of the given slides (zero-based index, or "all"; 1280 px wide).
  async exportPng(which = "all") {
    const count = SlidesApp.getSlideCount()
    const indexes = which === "all" ? [...Array(count).keys()] : [which]
    const urls = await SlidesApp.capture(indexes, { width: 1280 })
    return urls.map((url, k) => ({ name: `slide-${indexes[k] + 1}.png`, bytes: dataUrlToBytes(url) }))
  },

  // PDF bytes with one page per slide (1600 px renders, page = slide aspect).
  async exportPdf() {
    const count = SlidesApp.getSlideCount()
    const indexes = [...Array(count).keys()]
    const urls = await SlidesApp.capture(indexes, { width: 1600 })
    let doc = null
    for (const url of urls) {
      const bytes = dataUrlToBytes(url)
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const w = dv.getUint32(16) * 0.75 // PNG IHDR width/height -> pt
      const h = dv.getUint32(20) * 0.75
      const orientation = w >= h ? "landscape" : "portrait"
      if (!doc) doc = new jsPDF({ orientation, unit: "pt", format: [w, h], compress: true })
      else doc.addPage([w, h], orientation)
      doc.addImage(url, "PNG", 0, 0, w, h)
    }
    if (!doc) throw new Error("no slides to export")
    return new Uint8Array(doc.output("arraybuffer"))
  },

  // ----- chrome -----
  // Shows the viewer's full editor chrome (ribbon, panels) until closeMenu(). `tab` is accepted for
  // forward compatibility; the library exposes no tab-selection call, so it is currently ignored.
  openMenu(tab) {
    if (!root) return false
    void tab
    if (!tools) {
      tools = true
      render()
    }
    call("onMenu", true)
    return true
  },

  closeMenu() {
    if (!root) return false
    if (tools) {
      tools = false
      render()
    }
    call("onMenu", false)
    return true
  },

  // Starts the slideshow from the active slide. Returns false when not reachable.
  present() {
    if (!ready()) return false
    try {
      handle().setMode("present")
      return true
    } catch {
      return false
    }
  },

  setTools(on) {
    tools = !!on
    render()
  },

  setDark(dark) {
    if (!state) return
    state.dark = !!dark
    render()
  },

  unmount() {
    try {
      root?.unmount()
    } catch {}
    stopIcons?.()
    stopIcons = null
    styleEl?.remove()
    themeEl?.remove()
    root = container = styleEl = themeEl = state = null
    opts = {}
  },
}

// Debug escape hatch (not part of the contract): the live PowerPointViewer handle.
SlidesApp._handle = () => ref.current

window.SlidesApp = SlidesApp
