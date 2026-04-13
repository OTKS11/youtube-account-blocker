/**
 * YouTube Comment Blocker - ポップアップスクリプト
 * ブロックリスト・キーワードフィルターの管理UI
 */

const STORAGE_KEY_BLOCKED_USERS = 'ytcb_blocked_users';
const STORAGE_KEY_BLOCKED_KEYWORDS = 'ytcb_blocked_keywords';

// --- タブ切り替え ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// --- ユーザーリスト描画 ---
function renderUsers(users) {
    const list = document.getElementById('list-users');
    document.getElementById('stat-users').textContent = users.length;
    if (users.length === 0) {
        list.innerHTML = '<p class="empty-msg">ブロック中のユーザーはいません</p>';
        return;
    }
    list.innerHTML = users.map(name => `
    <div class="list-item">
      <span class="list-item-text" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
      <button class="btn-remove" data-user="${escapeHtml(name)}" title="ブロック解除">✕</button>
    </div>
  `).join('');

    list.querySelectorAll('.btn-remove[data-user]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const result = await storageGet(STORAGE_KEY_BLOCKED_USERS);
            const updated = (result[STORAGE_KEY_BLOCKED_USERS] || []).filter(u => u !== btn.dataset.user);
            await storageSet({ [STORAGE_KEY_BLOCKED_USERS]: updated });
            renderUsers(updated);
        });
    });
}

// --- キーワードリスト描画 ---
function renderKeywords(keywords) {
    const list = document.getElementById('list-keywords');
    document.getElementById('stat-keywords').textContent = keywords.length;
    if (keywords.length === 0) {
        list.innerHTML = '<p class="empty-msg">フィルター中のキーワードはありません</p>';
        return;
    }
    list.innerHTML = keywords.map((kw, idx) => `
    <div class="list-item">
      <span class="list-item-text" title="${escapeHtml(kw)}">${escapeHtml(kw)}</span>
      <button class="btn-remove" data-idx="${idx}" title="削除">✕</button>
    </div>
  `).join('');

    list.querySelectorAll('.btn-remove[data-idx]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const result = await storageGet(STORAGE_KEY_BLOCKED_KEYWORDS);
            const updated = (result[STORAGE_KEY_BLOCKED_KEYWORDS] || []).filter((_, i) => i !== parseInt(btn.dataset.idx));
            await storageSet({ [STORAGE_KEY_BLOCKED_KEYWORDS]: updated });
            renderKeywords(updated);
        });
    });
}

// --- ユーザー追加 ---
async function addUser() {
    const input = document.getElementById('input-user');
    const name = input.value.trim();
    if (!name) return;
    const result = await storageGet(STORAGE_KEY_BLOCKED_USERS);
    const users = result[STORAGE_KEY_BLOCKED_USERS] || [];
    if (!users.includes(name)) {
        users.push(name);
        await storageSet({ [STORAGE_KEY_BLOCKED_USERS]: users });
        renderUsers(users);
    }
    input.value = '';
    input.focus();
}

// --- キーワード追加 ---
async function addKeyword() {
    const input = document.getElementById('input-keyword');
    const kw = input.value.trim();
    if (!kw) return;
    const result = await storageGet(STORAGE_KEY_BLOCKED_KEYWORDS);
    const keywords = result[STORAGE_KEY_BLOCKED_KEYWORDS] || [];
    if (!keywords.includes(kw)) {
        keywords.push(kw);
        await storageSet({ [STORAGE_KEY_BLOCKED_KEYWORDS]: keywords });
        renderKeywords(keywords);
    }
    input.value = '';
    input.focus();
}

// --- イベントリスナー ---
document.getElementById('btn-add-user').addEventListener('click', addUser);
document.getElementById('input-user').addEventListener('keydown', e => { if (e.key === 'Enter') addUser(); });

document.getElementById('btn-add-keyword').addEventListener('click', addKeyword);
document.getElementById('input-keyword').addEventListener('keydown', e => { if (e.key === 'Enter') addKeyword(); });

// --- ユーティリティ ---
function storageGet(key) {
    return new Promise(resolve => chrome.storage.local.get([key], resolve));
}

function storageSet(obj) {
    return new Promise(resolve => chrome.storage.local.set(obj, resolve));
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- 初期ロード ---
(async () => {
    const result = await storageGet(STORAGE_KEY_BLOCKED_USERS);
    const result2 = await storageGet(STORAGE_KEY_BLOCKED_KEYWORDS);
    renderUsers(result[STORAGE_KEY_BLOCKED_USERS] || []);
    renderKeywords(result2[STORAGE_KEY_BLOCKED_KEYWORDS] || []);
})();
