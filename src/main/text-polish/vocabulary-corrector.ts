function matchCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase()
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement.toLowerCase()
}

/**
 * Applies user-defined vocabulary corrections word-by-word, preserving
 * the original capitalisation pattern of the matched word.
 */
export function applyVocabulary(text: string, entries: Record<string, string>): string {
  if (Object.keys(entries).length === 0) return text
  return text.replace(/\b[\w']+\b/g, (word) => {
    const correction = entries[word.toLowerCase()]
    return correction ? matchCase(word, correction) : word
  })
}
