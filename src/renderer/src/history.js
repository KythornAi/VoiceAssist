export function renderHistory() {
  document.title = 'VoiceAssist — Dictation History'

  const style = document.createElement('style')
  style.textContent = `
    body { display: flex; flex-direction: column; height: 100vh; }
    header {
      padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    header h1 { font-size: 17px; }
    #list { flex: 1; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; }
    .item {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; padding: 12px 14px;
      display: flex; flex-direction: column; gap: 8px;
      transition: border-color 0.15s;
    }
    .item:hover { border-color: var(--accent); }
    .item-text { font-size: 14px; line-height: 1.6; word-break: break-word; }
    .item-footer { display: flex; align-items: center; justify-content: space-between; }
    .item-date  { font-size: 11px; color: var(--text-sub); }
    .btn-copy   { padding: 4px 10px; font-size: 12px; border-radius: 4px; }
    .empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 10px; color: var(--text-sub); text-align: center; padding: 40px;
    }
    .empty .icon { font-size: 48px; opacity: 0.4; }
    footer {
      padding: 14px 18px; border-top: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }
    #count { font-size: 13px; color: var(--text-sub); }
  `
  document.head.appendChild(style)

  document.body.innerHTML = `
    <header>
      <h1>📋 Dictation History</h1>
    </header>
    <div id="list"></div>
    <footer>
      <span id="count">0 items</span>
      <button id="btn-clear" class="danger">🗑️  Clear All</button>
    </footer>
  `

  const list = document.getElementById('list')
  const countEl = document.getElementById('count')
  const btnClear = document.getElementById('btn-clear')

  function fmt(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function render(items) {
    countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`

    if (!items.length) {
      list.innerHTML = `<div class="empty"><div class="icon">🎙️</div><div>No dictations yet.<br/>Start dictating to see your history here.</div></div>`
      return
    }

    list.innerHTML = items.map((item, i) => `
      <div class="item">
        <div class="item-text">${esc(item.text)}</div>
        <div class="item-footer">
          <span class="item-date">${fmt(item.timestamp)}</span>
          <button class="btn-copy" data-idx="${i}">📋 Copy</button>
        </div>
      </div>
    `).join('')

    list.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        window.api.copyToClipboard(items[Number(btn.dataset.idx)].text)
        btn.textContent = '✅ Copied!'
        setTimeout(() => { btn.textContent = '📋 Copy' }, 1500)
      })
    })
  }

  async function reload() {
    render(await window.api.getHistory())
  }

  reload()

  btnClear.addEventListener('click', async () => {
    if (confirm('Clear all dictation history? This cannot be undone.')) {
      await window.api.clearHistory(); reload()
    }
  })
}
