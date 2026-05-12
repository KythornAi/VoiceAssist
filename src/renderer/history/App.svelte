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
  :global(body) {
    margin: 0;
    padding: 0;
    background: #07080a;
  }

  .layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-feature-settings: "calt", "kern", "liga", "ss03";
    font-size: 14px;
    color: #cdcdcd;
    background: #07080a;
  }

  header {
    padding: 16px 20px 13px;
    border-bottom: 1px solid #242728;
    flex-shrink: 0;
  }

  h1 {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6a6b6c;
    margin: 0;
  }

  .list {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .list::-webkit-scrollbar {
    width: 4px;
  }

  .list::-webkit-scrollbar-track {
    background: transparent;
  }

  .list::-webkit-scrollbar-thumb {
    background: #242728;
    border-radius: 9999px;
  }

  .item {
    background: #0d0d0d;
    border: 1px solid #242728;
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 9px;
    transition: border-color 0.15s;
  }

  .item:hover {
    border-color: rgba(255,255,255,0.12);
  }

  .item-text {
    font-size: 13px;
    line-height: 1.6;
    word-break: break-word;
    margin: 0;
    color: #f4f4f6;
  }

  .item-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .item-date {
    font-size: 11px;
    color: #434345;
    letter-spacing: 0.02em;
  }

  .btn-copy {
    padding: 3px 10px;
    font-size: 12px;
    font-family: inherit;
    font-weight: 500;
    background: transparent;
    color: #9c9c9d;
    border: 1px solid #242728;
    border-radius: 5px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .btn-copy:hover {
    color: #f4f4f6;
    border-color: rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.05);
  }

  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #434345;
    text-align: center;
    padding: 40px;
    min-height: 200px;
    font-size: 13px;
    line-height: 1.6;
  }

  .icon {
    font-size: 32px;
    opacity: 0.4;
  }

  footer {
    padding: 11px 16px;
    border-top: 1px solid #242728;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .count {
    font-size: 12px;
    color: #434345;
  }

  .btn-clear {
    padding: 5px 12px;
    font-size: 12px;
    font-family: inherit;
    background: transparent;
    color: #ff6161;
    border: 1px solid rgba(255,97,97,0.35);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-clear:hover:not(:disabled) {
    background: rgba(255,97,97,0.08);
  }

  .btn-clear:disabled {
    opacity: 0.3;
    cursor: default;
  }
</style>
