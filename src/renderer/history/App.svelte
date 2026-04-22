<script lang="ts">
  import { onMount } from 'svelte'
  import type { HistoryItem } from '../../shared/types'

  let items: HistoryItem[] = []
  let loading = true

  async function reload() {
    items = await window.api.getHistory()
    loading = false
  }

  onMount(() => {
    void reload()
    window.addEventListener('focus', reload)
    return () => window.removeEventListener('focus', reload)
  })

  async function clearAll() {
    if (!confirm('Clear all dictation history? This cannot be undone.')) return
    await window.api.clearHistory()
    items = []
  }

  async function copyItem(text: string, btn: HTMLButtonElement) {
    await navigator.clipboard.writeText(text)
    btn.textContent = 'Copied'
    setTimeout(() => { btn.textContent = 'Copy' }, 1500)
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
</script>

<div class="layout">
  <header>
    <h1>Dictation History</h1>
  </header>

  <div class="list">
    {#if loading}
      <div class="empty"><span class="icon">⏳</span><span>Loading...</span></div>
    {:else if items.length === 0}
      <div class="empty">
        <span class="icon">🎙</span>
        <span>No dictations yet.<br />Start dictating to see your history here.</span>
      </div>
    {:else}
      {#each items as item (item.id)}
        <div class="item">
          <p class="item-text">{item.text}</p>
          <div class="item-footer">
            <span class="item-date">{formatDate(item.timestamp)}</span>
            <button
              class="btn-copy"
              on:click={(e) => copyItem(item.text, e.currentTarget)}
            >Copy</button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <footer>
    <span class="count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
    <button class="btn-clear" on:click={clearAll} disabled={items.length === 0}>
      Clear All
    </button>
  </footer>
</div>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    font-size: 14px;
    color: var(--text, #e2e8f0);
    background: var(--bg, #0f172a);
  }

  header {
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--border, #1e293b);
    flex-shrink: 0;
  }

  h1 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text, #e2e8f0);
    margin: 0;
  }

  .list {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .item {
    background: var(--surface, #1e293b);
    border: 1px solid var(--border, #334155);
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s;
  }

  .item:hover {
    border-color: var(--accent, #3b82f6);
  }

  .item-text {
    font-size: 14px;
    line-height: 1.6;
    word-break: break-word;
    margin: 0;
    color: var(--text, #e2e8f0);
  }

  .item-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .item-date {
    font-size: 11px;
    color: var(--text-muted, #64748b);
  }

  .btn-copy {
    padding: 4px 12px;
    font-size: 12px;
    background: transparent;
    color: var(--accent, #3b82f6);
    border: 1px solid var(--accent, #3b82f6);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-copy:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-muted, #64748b);
    text-align: center;
    padding: 40px;
    min-height: 200px;
  }

  .icon {
    font-size: 40px;
    opacity: 0.5;
  }

  footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border, #1e293b);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .count {
    font-size: 12px;
    color: var(--text-muted, #64748b);
  }

  .btn-clear {
    padding: 6px 14px;
    font-size: 12px;
    background: transparent;
    color: var(--red, #ef4444);
    border: 1px solid var(--red, #ef4444);
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-clear:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
  }

  .btn-clear:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>
