export function decodeSlotpath(text) {
  if (!text) return text
  return text.replace(/\$([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}
