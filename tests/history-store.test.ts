import { describe, it, expect, beforeEach } from 'vitest'
import { HistoryStore } from '../src/main/store/history-store'
import type { HistoryItem } from '../src/shared/types'
import type { JsonStore } from '../src/main/store/json-store'

function makeStore(): JsonStore<{ items: HistoryItem[] }> {
  let items: HistoryItem[] = []
  return {
    get: (key) => (key === 'items' ? items : []) as never,
    set: (_key, value) => { items = value as HistoryItem[] },
    getAll: () => ({ items }),
  } as unknown as JsonStore<{ items: HistoryItem[] }>
}

describe('HistoryStore', () => {
  let store: HistoryStore

  beforeEach(() => {
    store = new HistoryStore(makeStore())
  })

  it('starts empty', () => {
    expect(store.getAll()).toEqual([])
  })

  it('adds an item and returns it', () => {
    const item = store.add('hello world')
    expect(item.text).toBe('hello world')
    expect(item.id).toBeTruthy()
    expect(item.timestamp).toBeTruthy()
  })

  it('prepends items so newest is first', () => {
    store.add('first')
    store.add('second')
    const all = store.getAll()
    expect(all[0].text).toBe('second')
    expect(all[1].text).toBe('first')
  })

  it('persists items across getAll calls', () => {
    store.add('one')
    store.add('two')
    expect(store.getAll()).toHaveLength(2)
  })

  it('clears all items', () => {
    store.add('one')
    store.add('two')
    store.clear()
    expect(store.getAll()).toEqual([])
  })

  it('caps at 100 items', () => {
    for (let i = 0; i < 105; i++) {
      store.add(`item ${i}`)
    }
    expect(store.getAll()).toHaveLength(100)
  })

  it('keeps the newest items when cap is reached', () => {
    for (let i = 0; i < 101; i++) {
      store.add(`item ${i}`)
    }
    const all = store.getAll()
    expect(all[0].text).toBe('item 100')
    expect(all[99].text).toBe('item 1')
  })
})
