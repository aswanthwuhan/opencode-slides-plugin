// Turns a panel send request into the text + image files of one session prompt.

const clip = (text, max) => {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim()
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat
}

const target = (comment) => {
  const shape = comment.shape
  if (!shape) return `Slide ${comment.slide}, whole slide`
  const text = clip(shape.text, 160)
  const id = shape.shapeId ?? shape.id
  return `Slide ${comment.slide}, ${id ? `shape id ${id} ` : ""}"${shape.name}" (${shape.type ?? shape.kind}${text ? `, text: "${text}"` : ""})`
}

/**
 * @param {{ deck: string, mode: "comments" | "review", note?: string,
 *   comments: { slide: number, shape: object | null, text: string }[],
 *   images: { slide: number, uri: string }[] }} request
 * @returns {{ text: string, files: { uri: string, name: string }[] }}
 */
export function buildPrompt(request) {
  const images = [...request.images].filter((image) => image.uri).sort((a, b) => a.slide - b.slide)
  const slides = images.map((image) => image.slide)
  const files = images.map((image) => ({ uri: image.uri, name: `slide-${image.slide}.png` }))
  const attached = slides.length
    ? `Attached are images of slide${slides.length > 1 ? "s" : ""} ${slides.join(", ")}, in that order, as currently rendered.`
    : "No slide images are attached."
  const note = request.note?.trim()
  const lines = []

  if (request.mode === "review") {
    lines.push(
      `Please review the PowerPoint deck at: ${request.deck}`,
      attached,
      "",
      note ||
        "Look at each slide image and list concrete problems per slide: text overflow or clipping, overlaps, alignment, readability (font size, contrast), inconsistent styling, and content issues. Do not edit the file unless I ask.",
    )
  } else {
    lines.push(`Please update the PowerPoint deck at: ${request.deck}`, attached, "", "Requested changes:")
    request.comments.forEach((comment, i) => lines.push(`${i + 1}. ${target(comment)}: ${comment.text.trim()}`))
    if (note) lines.push("", `Note: ${note}`)
    lines.push(
      "",
      "How to edit: change the .pptx in place (for example with python-pptx). Shape ids are the slide-local `shape_id` values; slide numbers are 1-based in presentation order. Keep everything I did not mention unchanged and save to the same path. Afterwards call the `slide_screenshot` tool on the changed slides to check the result, then briefly list what you changed per comment.",
    )
  }

  return { text: lines.join("\n"), files }
}
