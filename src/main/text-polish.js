import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Text Polish Pipeline
 * Cleans up dictated text: spelling correction, locale enforcement, grammar tidy,
 * filler word removal, repetition filtering.
 *
 * All free, all local, runs in <10ms per transcript.
 */

// ── Load dictionaries ──────────────────────────────────────────────
let ukUsPairs = {}
let usUkPairs = {}
let misspellings = {}

function loadDictionaries() {
    try {
        const pairsPath = path.join(__dirname, 'dictionaries', 'uk-us-pairs.json')
        const pairsData = JSON.parse(fs.readFileSync(pairsPath, 'utf8'))

        // US -> UK map (from the JSON as-is)
        usUkPairs = {}
        for (const [us, uk] of Object.entries(pairsData.pairs)) {
            usUkPairs[us.toLowerCase()] = uk
        }

        // UK -> US map (reversed)
        ukUsPairs = {}
        for (const [us, uk] of Object.entries(pairsData.pairs)) {
            ukUsPairs[uk.toLowerCase()] = us
        }

        const misspellPath = path.join(__dirname, 'dictionaries', 'common-misspellings.json')
        const misspellData = JSON.parse(fs.readFileSync(misspellPath, 'utf8'))
        misspellings = {}
        for (const [wrong, right] of Object.entries(misspellData.corrections)) {
            misspellings[wrong.toLowerCase()] = right
        }

        console.log(`[text-polish] Loaded ${Object.keys(usUkPairs).length} locale pairs, ${Object.keys(misspellings).length} misspelling corrections`)
    } catch (err) {
        console.error('[text-polish] Failed to load dictionaries:', err.message)
    }
}

// Load on import
loadDictionaries()

// ── Pipeline stages ────────────────────────────────────────────────

/**
 * Fix common misspellings. Locale-neutral (corrects to standard spelling,
 * locale conversion happens next).
 */
function fixMisspellings(text) {
    return text.replace(/\b[\w']+\b/g, (word) => {
        const lower = word.toLowerCase()
        const correction = misspellings[lower]
        if (!correction) return word

        // Preserve original capitalisation pattern
        return matchCase(word, correction)
    })
}

/**
 * Enforce UK or US spelling based on locale setting.
 */
function enforceLocale(text, locale) {
    const map = locale === 'uk' ? usUkPairs : ukUsPairs
    if (Object.keys(map).length === 0) return text

    return text.replace(/\b[\w]+\b/g, (word) => {
        const lower = word.toLowerCase()
        const replacement = map[lower]
        if (!replacement) return word
        return matchCase(word, replacement)
    })
}

/**
 * Basic grammar cleanup:
 * - Capitalise after full stops, question marks, exclamation marks
 * - Capitalise "I" when standalone
 * - Fix double spaces
 * - Fix space before punctuation
 * - Ensure sentence ends with punctuation
 */
function tidyGrammar(text) {
    // Fix double/triple spaces
    text = text.replace(/\s{2,}/g, ' ')

    // Remove space before punctuation
    text = text.replace(/\s+([.,!?;:])/g, '$1')

    // Capitalise after sentence-ending punctuation
    text = text.replace(/([.!?])\s+([a-z])/g, (_, punct, letter) => {
        return punct + ' ' + letter.toUpperCase()
    })

    // Capitalise first character
    if (text.length > 0 && /[a-z]/.test(text[0])) {
        text = text[0].toUpperCase() + text.slice(1)
    }

    // Capitalise standalone "i"
    text = text.replace(/\bi\b/g, 'I')
    // Fix "i'm", "i've", "i'll", "i'd" etc.
    text = text.replace(/\bi'([a-z])/g, "I'$1")

    // Add full stop at end if missing punctuation
    if (text.length > 0 && !/[.!?]$/.test(text.trim())) {
        text = text.trim() + '.'
    }

    return text.trim()
}

/**
 * Remove filler words (um, uh, ah, er, etc.)
 */
function removeFillers(text) {
    const fillers = /\b(um|uh|ah|er|hm|hmm|like|you know|sort of|kind of)\b([,\.]*\s*)/gi
    text = text.replace(fillers, '')
    text = text.replace(/\s+/g, ' ')
    text = text.replace(/ ,/g, ',')
    text = text.replace(/^[,.\s]+/, '')
    text = text.replace(/([.?!])\s*[,.]+/g, '$1')
    return text.trim()
}

/**
 * Filter repetitive sequences (Whisper hallucination guard).
 * Catches "word word word word word..." patterns.
 */
function filterRepetition(text) {
    if (text.length <= 20) return text

    const words = text.split(/\s+/)
    if (words.length <= 8) return text

    const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?;:]+$/, '')
    let repeats = 0
    for (let i = words.length - 1; i >= 0; i--) {
        const current = words[i].toLowerCase().replace(/[.,!?;:]+$/, '')
        if (current === lastWord) repeats++
        else break
    }

    if (repeats > 4) {
        const sequenceStartIdx = words.length - repeats
        const keptWords = words.slice(0, sequenceStartIdx + 1)
        return keptWords.join(' ') + '...'
    }

    return text
}

// ── Helper: match capitalisation pattern ───────────────────────────

function matchCase(original, replacement) {
    if (original === original.toUpperCase()) return replacement.toUpperCase()
    if (original[0] === original[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1)
    }
    return replacement.toLowerCase()
}

// ── Main pipeline ──────────────────────────────────────────────────

/**
 * Run the full text polish pipeline.
 *
 * @param {string} text - Raw transcript from Whisper
 * @param {object} options
 * @param {string} options.locale - 'uk' or 'us' (default: 'uk')
 * @param {boolean} options.fixSpelling - Enable misspelling correction (default: true)
 * @param {boolean} options.fixGrammar - Enable grammar cleanup (default: true)
 * @param {boolean} options.removeFillerWords - Enable filler removal (default: true)
 * @returns {string} Polished text
 */
export function polishText(text, options = {}) {
    const {
        locale = 'uk',
        fixSpelling = true,
        fixGrammar = true,
        removeFillerWords = true,
    } = options

    if (!text || !text.trim()) return ''

    let result = text.trim()

    // 1. Repetition filter (do first, before other processing)
    result = filterRepetition(result)

    // 2. Filler word removal
    if (removeFillerWords) {
        result = removeFillers(result)
    }

    // 3. Spelling correction
    if (fixSpelling) {
        result = fixMisspellings(result)
    }

    // 4. Locale enforcement (after misspelling fix, so we're working with correct base words)
    if (locale === 'uk' || locale === 'us') {
        result = enforceLocale(result, locale)
    }

    // 5. Grammar tidy (last, so capitalisation etc. applies to final text)
    if (fixGrammar) {
        result = tidyGrammar(result)
    }

    return result
}
