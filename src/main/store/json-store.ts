import { app } from 'electron'
import { dirname, join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'

export class JsonStore<T extends Record<string, unknown>> {
  private readonly filepath: string
  private data: Partial<T>

  constructor(filename: string, private readonly defaults: Readonly<T>) {
    this.filepath = join(app.getPath('userData'), filename)
    this.data = this.load()
  }

  private load(): Partial<T> {
    try {
      return JSON.parse(readFileSync(this.filepath, 'utf8')) as Partial<T>
    } catch {
      return {}
    }
  }

  private save(): void {
    mkdirSync(dirname(this.filepath), { recursive: true })
    writeFileSync(this.filepath, JSON.stringify(this.data, null, 2), 'utf8')
  }

  get<K extends keyof T>(key: K): T[K] {
    return (key in this.data ? this.data[key] : this.defaults[key]) as T[K]
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.data = { ...this.data, [key]: value }
    this.save()
  }

  getAll(): T {
    return { ...this.defaults, ...this.data }
  }
}
