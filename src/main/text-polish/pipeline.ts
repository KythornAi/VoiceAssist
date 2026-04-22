import { assembleTranscript } from './transcript-assembler'
import { type TextPolisher, type PolishOptions } from './text-polish'
import { applyVocabulary } from './vocabulary-corrector'
import { applyFormat } from './format-formatter'
import type { FormatMode } from '../../shared/types'

export class TranscriptPipeline {
  constructor(
    private readonly polisher: TextPolisher,
    private readonly getVocabEntries: () => Record<string, string>,
    private readonly getPolishOptions: () => PolishOptions = () => ({}),
  ) {}

  process(rawSegments: string[], formatMode: FormatMode = 'note'): string {
    const assembled = assembleTranscript(rawSegments)
    if (!assembled) return ''
    const polished = this.polisher.polish(assembled, this.getPolishOptions())
    const corrected = applyVocabulary(polished, this.getVocabEntries())
    return applyFormat(corrected, formatMode)
  }
}
