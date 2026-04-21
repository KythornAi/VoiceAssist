import { assembleTranscript } from './transcript-assembler'
import { type TextPolisher, type PolishOptions } from './text-polish'
import { applyVocabulary } from './vocabulary-corrector'

export class TranscriptPipeline {
  constructor(
    private readonly polisher: TextPolisher,
    private readonly getVocabEntries: () => Record<string, string>,
    private readonly getPolishOptions: () => PolishOptions = () => ({}),
  ) {}

  process(rawSegments: string[]): string {
    const assembled = assembleTranscript(rawSegments)
    if (!assembled) return ''
    const polished = this.polisher.polish(assembled, this.getPolishOptions())
    return applyVocabulary(polished, this.getVocabEntries())
  }
}
