import { assembleTranscript } from './transcript-assembler'
import { type TextPolisher, type PolishOptions } from './text-polish'
import { applyVocabulary } from './vocabulary-corrector'

export class TranscriptPipeline {
  constructor(
    private readonly polisher: TextPolisher,
    private readonly getVocabEntries: () => Record<string, string>,
    private readonly polishOptions?: PolishOptions,
  ) {}

  process(rawSegments: string[]): string {
    const assembled = assembleTranscript(rawSegments)
    if (!assembled) return ''
    const polished = this.polisher.polish(assembled, this.polishOptions)
    return applyVocabulary(polished, this.getVocabEntries())
  }
}
