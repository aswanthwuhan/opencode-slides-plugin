// Distinct icons for the Animations gallery. The library draws one generic glyph per category (a star for
// every entrance/emphasis/exit effect, an arrow for every motion path); this swaps in a picture that
// resembles each effect, matched on the tile's title. 20x20 viewBox, stroke-drawn.

const sq = '<rect x="3" y="4.5" width="14" height="11" rx="1.2"/>'
const arrow = '<path d="M3 10h12M11 6l4 4-4 4"/>'
const rot = (deg, inner) => `<g transform="rotate(${deg} 10 10)">${inner}</g>`
const dots = (pts, r = 1) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`).join("")
const bolt = '<path d="M11.5 2 5 11h4.5l-1 7L15 9h-4.5z"/>'
const mag = (sign) =>
  `<circle cx="8.5" cy="8.5" r="5"/><path d="M12.3 12.3 17 17"/><path d="M6.3 8.5h4.4${sign === "+" ? "M8.5 6.3v4.4" : ""}"/>`
const fadeLines = (rev) => {
  const op = rev ? [0.25, 0.55, 1] : [1, 0.55, 0.25]
  return (
    sq +
    [7.5, 10, 12.5].map((y, i) => `<path d="M5.5 ${y}h9" stroke-opacity="${op[i]}" stroke-width="2"/>`).join("")
  )
}
const wipe = (side) =>
  sq +
  `<path d="${side === "l" ? "M3 4.5h7v11H3z" : "M10 4.5h7v11h-7z"}" fill="currentColor" fill-opacity=".35" stroke="none"/>` +
  `<path d="${side === "l" ? "M12.5 10h3M14 8.5l1.5 1.5-1.5 1.5" : "M4.5 10h3M6 8.5 4.5 10 6 11.5"}"/>`
const nested = (out) =>
  '<rect x="6.5" y="6.5" width="7" height="7"/>' +
  (out
    ? '<path d="M3 3l3 3M17 3l-3 3M3 17l3-3M17 17l-3-3"/>'
    : '<path d="M3.5 3.5 6 6M16.5 3.5 14 6M3.5 16.5 6 14M16.5 16.5 14 14"/><rect x="3" y="3" width="14" height="14" stroke-dasharray="2 2" stroke-opacity=".5"/>')
const bounce = '<path d="M3 4c1.8 9 4 12 7 12s5.2-3 7-12"/><path d="M3 17.5h14"/>'

export const ANIM_ICONS = {
  // Entrance
  Appear: '<path d="M10 2.5v4M10 13.5v4M2.5 10h4M13.5 10h4M5 5l2.2 2.2M12.8 12.8 15 15M15 5l-2.2 2.2M7.2 12.8 5 15"/>' + dots([[10, 10]], 1.6),
  "Fade In": fadeLines(false),
  "Fly In": '<path d="M2 10h7M6.5 7 9.5 10l-3 3"/><rect x="12" y="5" width="6" height="10" rx="1"/>',
  "Zoom In": mag("+"),
  "Bounce In": bounce,
  "Wipe In": wipe("l"),
  "Split In": sq + '<path d="M10 4.5v11M7.2 8 5.2 10l2 2M12.8 8l2 2-2 2"/>',
  "Dissolve In": dots([[5, 5], [10, 4.5], [15, 5.5], [7.5, 8.5], [13, 9], [4.5, 11.5], [10, 12], [15.5, 13], [7, 15.5], [12.5, 16]], 1.2),
  "Float In": '<path d="M10 15.5V5.5M6 9.5l4-4 4 4"/><path d="M3.5 17.5q2.2-2 4.2 0t4.2 0 4.2 0"/>',
  "Grow & Turn": '<rect x="3" y="11" width="5" height="5"/><path d="M11 4.5l5.5 2-2 5.5-5.5-2z"/><path d="M8.5 9.5 10 11"/>',
  // Emphasis
  Spin: '<path d="M16.5 10a6.5 6.5 0 1 1-2-4.7"/><path d="M16.5 3v4.5H12"/>',
  Pulse: '<path d="M2 10.5h4l2-5.5 3.5 11 2-5.5H18"/>',
  "Color Wave": '<path d="M2 8q2-3.5 4 0t4 0 4 0 4 0"/><path d="M2 12.5q2-3.5 4 0t4 0 4 0 4 0" stroke-opacity=".55"/><path d="M2 17q2-3.5 4 0t4 0 4 0 4 0" stroke-opacity=".3"/>',
  Bounce: bounce,
  Flash: bolt,
  "Grow / Shrink": '<rect x="3" y="3" width="14" height="14" stroke-opacity=".45"/><rect x="7" y="7" width="6" height="6"/><path d="M3.5 3.5 7 7M16.5 3.5 13 7M3.5 16.5 7 13M16.5 16.5 13 13"/>',
  Teeter: '<path d="M4 9.5l12-3 1 5-12 3z"/><path d="M10 17l1.5-3.5h-3z"/>',
  Wave: '<path d="M2 12q2-7 4 0t4 0 4 0 4 0"/>',
  "Bold Flash": '<g stroke-width="2.6">' + bolt + "</g>",
  // Exit
  "Fade Out": fadeLines(true),
  "Fly Out": '<rect x="2" y="5" width="6" height="10" rx="1"/><path d="M11 10h7M15.5 7 18.5 10l-3 3"/>',
  "Zoom Out": mag("-"),
  "Bounce Out": '<path d="M3 14c1.8-9 4-12 7-12s5.2 3 7 12"/><path d="M3 17.5h14"/>',
  "Wipe Out": wipe("r"),
  "Shrink Out": nested(false),
  "Dissolve Out": dots([[5, 5.5], [14.5, 6], [10, 10], [5.5, 14.5], [15, 14]], 1.2),
  Disappear: '<rect x="3" y="4.5" width="14" height="11" rx="1.2" stroke-dasharray="2 2"/><path d="M7 8.5l6 3M13 8.5l-6 3"/>',
  // Motion paths (all drawn with an arrowhead at the end)
  Right: arrow,
  Left: rot(180, arrow),
  Down: rot(90, arrow),
  Up: rot(-90, arrow),
  "Diagonal Up Right": rot(-45, arrow),
  "Diagonal Down Right": rot(45, arrow),
  "Diagonal Up Left": rot(-135, arrow),
  "Diagonal Down Left": rot(135, arrow),
  "Arc Up": '<path d="M3 15q7-14 14 0M13.5 12.5 17 15l-1 4"/>',
  "Arc Down": '<path d="M3 5q7 14 14 0M13.5 7.5 17 5l-1-4"/>',
  "Arc Right": '<path d="M5 3q14 7 0 14M7.5 13.5 5 17l-4-1"/>',
  "Arc Left": '<path d="M15 3Q1 10 15 17M12.5 13.5 15 17l4-1"/>',
  "Turn Up": '<path d="M4 17V9h10M11 6l3 3-3 3"/>',
  "Turn Down": '<path d="M4 3v8h10M11 8l3 3-3 3"/>',
  "Turn Right": '<path d="M3 16h8V6M8 9l3-3 3 3"/>',
  "Turn Left": '<path d="M17 16H9V6M6 9l3-3 3 3"/>',
  "S Curve": '<path d="M3 15c8 0 6-10 14-10M14 3l3 2-2.5 3"/>',
  Zigzag: '<path d="M3 15l4-8 3 8 3-8 4 8M14 12l3 3-4 1"/>',
  Circle: '<circle cx="10" cy="10" r="6.5"/><path d="M10 3.5l2.5 2M10 3.5l2.5-2"/>',
  Square: '<rect x="4" y="4" width="12" height="12"/><path d="M14 2l2.5 2L14 6"/>',
  Triangle: '<path d="M10 3.5 17 16H3z"/><path d="M9 2l2 1.5L9.5 5.5"/>',
  Diamond: '<path d="M10 2.5 17.5 10 10 17.5 2.5 10z"/><path d="M8.5 1.5l2 1.5-1.5 2"/>',
  Hexagon: '<path d="M6 3h8l4 7-4 7H6l-4-7z"/><path d="M8 1.5l2 1.5-2 1.5"/>',
  "Loop de Loop": '<path d="M3 15c3 0 4-3 4-6a3.5 3.5 0 1 1 3.5 3.5C8 12.5 12 15 17 15M14.5 12.5 17 15l-3 1.5"/>',
  "Figure 8": '<path d="M10 10c-2-3.5-3-4.5-5-4.5a4.2 4.2 0 0 0 0 8.4c2 0 3-1 5-4.4 2-3.5 3-4.5 5-4.5a4.2 4.2 0 0 1 0 8.4c-2 0-3-1-5-4.4z"/>',
  Spiral: '<path d="M10 10m0-1.5a1.5 1.5 0 1 1-1.5 1.5 3.5 3.5 0 1 1 3.5 3.5 5.5 5.5 0 1 1-5.5-5.5 7.5 7.5 0 1 1 7.5 7.5"/>',
}

const WRAP = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'

// Keeps swapping the glyphs in as the gallery renders / re-renders.
export function installAnimationIcons(doc) {
  const apply = () => {
    for (const btn of doc.querySelectorAll("button.preset")) {
      const svg = btn.querySelector("svg.tile-icon")
      const key = (btn.getAttribute("title") || "").trim()
      const body = ANIM_ICONS[key]
      if (!svg || !body || svg.dataset.ocsIcon === key) continue
      svg.innerHTML = `<g ${WRAP}>${body}</g>`
      svg.dataset.ocsIcon = key
    }
  }
  const mo = new doc.defaultView.MutationObserver(() => apply())
  mo.observe(doc.body, { childList: true, subtree: true })
  apply()
  return () => mo.disconnect()
}
