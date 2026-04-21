/**
 * Joins ordered transcript segments into a single string, deduplicating
 * overlapping words at segment boundaries (whisper sometimes repeats the
 * last word(s) of a previous segment at the start of the next).
 */
export function assembleTranscript(segments: string[]): string {
  const trimmed = segments.map(s => s.trim()).filter(s => s.length > 0)
  if (trimmed.length === 0) return ''
  if (trimmed.length === 1) return trimmed[0]

  return trimmed.reduce((acc, segment) => {
    const accWords = acc.split(/\s+/)
    const segWords = segment.split(/\s+/)

    // Check for overlap of up to 3 words at the boundary
    let overlap = 0
    for (let n = Math.min(3, accWords.length, segWords.length); n >= 1; n--) {
      const tail = accWords.slice(-n).join(' ').toLowerCase().replace(/[.,!?;:]+$/, '')
      const head = segWords.slice(0, n).join(' ').toLowerCase().replace(/[.,!?;:]+$/, '')
      if (tail === head) {
        overlap = n
        break
      }
    }

    const remainder = segWords.slice(overlap).join(' ')
    return remainder ? `${acc} ${remainder}` : acc
  })
}
