import { randomUUID } from 'crypto'
import type { JsonStore } from './json-store'
import type { HistoryItem } from '../../shared/types'

const MAX_ITEMS = 100

export class HistoryStore {
  constructor(private readonly store: JsonStore<{ items: HistoryItem[] }>) {}

  add(text: string): HistoryItem {
    const item: HistoryItem = {
      id: randomUUID(),
      text,
      timestamp: new Date().toISOString(),
    }
    const current = this.store.get('items')
    this.store.set('items', [item, ...current].slice(0, MAX_ITEMS))
    return item
  }

  getAll(): HistoryItem[] {
    return this.store.get('items')
  }

  clear(): void {
    this.store.set('items', [])
  }
}
