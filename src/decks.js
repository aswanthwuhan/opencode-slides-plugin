// Finds .pptx files a tool call touched, so the Slides panel can show a deck while the model builds it.
// Node built-ins only; no calls at module top level.
import { statSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"

const MAX_TEXT = 400_000
const MAX_BACK = 300 // longest path tail we try before ".pptx"

// Every string inside a tool call's input/result (bounded).
export function collectStrings(value, out = [], budget = { left: MAX_TEXT }, depth = 0) {
  if (budget.left <= 0 || depth > 8 || value == null) return out
  if (typeof value === "string") {
    const s = value.length > budget.left ? value.slice(0, budget.left) : value
    budget.left -= s.length
    out.push(s)
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out, budget, depth + 1)
  } else if (typeof value === "object") {
    for (const k of Object.keys(value)) {
      // Skip image payloads (data URLs) — they are large and never contain paths.
      if (k === "uri" || k === "url") continue
      collectStrings(value[k], out, budget, depth + 1)
    }
  }
  return out
}

const isFile = (p) => {
  try {
    return statSync(p).isFile() ? statSync(p) : null
  } catch {
    return null
  }
}

/**
 * Existing .pptx paths mentioned in `texts` (absolute, or relative to `cwd`), longest match per
 * mention. Paths may contain spaces, so each mention is tried from every plausible start.
 * @returns {{ path: string, mtimeMs: number }[]}
 */
export function findDecks(texts, cwd) {
  const found = new Map()
  for (const text of texts) {
    const re = /\.pptx\b/gi
    let m
    while ((m = re.exec(text))) {
      const end = m.index + m[0].length
      const from = Math.max(0, end - MAX_BACK)
      // Candidate starts: line start, after quotes/brackets/`=`/whitespace, or a drive letter.
      let best = null
      for (let i = from; i < m.index; i++) {
        const prev = i === 0 ? "\n" : text[i - 1]
        const atBoundary = /[\s"'`=(\[{<,;>]/.test(prev) || i === from
        if (!atBoundary && !/[A-Za-z]/.test(text[i])) continue
        let cand = text.slice(i, end).trim().replace(/\\\\/g, "\\")
        if (!cand || /[\r\n"<>|*?]/.test(cand)) continue
        if (/^[A-Za-z]:[\\/]/.test(cand) === false && /:/.test(cand)) continue
        const full = isAbsolute(cand) ? cand : cwd ? resolve(cwd, cand) : null
        if (!full) continue
        const st = isFile(full)
        if (st) {
          best = { path: full, mtimeMs: st.mtimeMs }
          break // the earliest start that exists is the longest path
        }
      }
      if (best) found.set(best.path.toLowerCase(), best)
    }
  }
  return [...found.values()]
}
