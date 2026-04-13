/**
 * YouTube Comment Blocker - コンテンツスクリプト
 * YouTubeのコメント欄にブロックボタンを追加し、
 * ブロックしたユーザーや特定キーワードを含むコメントを非表示にします
 */

// ストレージキー
const STORAGE_KEY_BLOCKED_USERS = 'ytcb_blocked_users';
const STORAGE_KEY_BLOCKED_KEYWORDS = 'ytcb_blocked_keywords';

// ブロックリストをメモリにキャッシュ
let blockedUsers = new Set();
let blockedKeywords = [];

/**
 * Chromeのストレージからブロックリストを読み込む
 */
async function loadBlockLists() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_BLOCKED_USERS, STORAGE_KEY_BLOCKED_KEYWORDS], (result) => {
      blockedUsers = new Set(result[STORAGE_KEY_BLOCKED_USERS] || []);
      blockedKeywords = result[STORAGE_KEY_BLOCKED_KEYWORDS] || [];
      resolve();
    });
  });
}

/**
 * ユーザーをブロックリストに追加して保存
 * @param {string} userName - ブロックするユーザー名
 */
async function addBlockedUser(userName) {
  blockedUsers.add(userName);
  chrome.storage.local.set({ [STORAGE_KEY_BLOCKED_USERS]: [...blockedUsers] });
  applyBlockFilters();
}

/**
 * ユーザーをブロックリストから削除
 * @param {string} userName - ブロック解除するユーザー名
 */
async function removeBlockedUser(userName) {
  blockedUsers.delete(userName);
  chrome.storage.local.set({ [STORAGE_KEY_BLOCKED_USERS]: [...blockedUsers] });
  applyBlockFilters();
}

/**
 * コメントがブロック対象かどうか判定する
 * @param {Element} commentEl - コメント要素
 * @returns {boolean}
 */
function shouldBlockComment(commentEl) {
  // ユーザー名の取得
  const authorEl = commentEl.querySelector('#author-text');
  let authorName = "";
  if (authorEl) {
    authorName = authorEl.textContent.trim();
    // 完全一致ブロック
    if (blockedUsers.has(authorName)) return true;
  }

  // コメント本文・ユーザー名のキーワードチェック（部分一致）
  const contentEl = commentEl.querySelector('#content-text');
  if (blockedKeywords.length > 0) {
    const text = contentEl ? contentEl.textContent.toLowerCase() : "";
    const authorLower = authorName.toLowerCase();

    for (const kw of blockedKeywords) {
      if (!kw) continue;
      const kwLower = kw.toLowerCase();
      // 本文、またはユーザー名にキーワードが含まれていればブロック
      if (text.includes(kwLower) || authorLower.includes(kwLower)) return true;
    }
  }

  return false;
}

/**
 * ブロックボタンをコメント要素に追加する
 * @param {Element} commentEl - コメント要素
 */
function addBlockButton(commentEl) {
  // すでにボタンがある場合はスキップ
  if (commentEl.querySelector('.ytcb-block-btn')) return;

  const actionMenu = commentEl.querySelector('#action-menu, #reply-action-menu');
  if (!actionMenu) return;

  const authorEl = commentEl.querySelector('#author-text');
  if (!authorEl) return;

  const authorName = authorEl.textContent.trim();
  const isBlocked = blockedUsers.has(authorName);

  // ブロックボタンを作成
  const blockBtn = document.createElement('button');
  blockBtn.className = 'ytcb-block-btn';
  blockBtn.title = isBlocked ? `"${authorName}" のブロックを解除` : `"${authorName}" をブロック`;
  blockBtn.textContent = isBlocked ? '🔓' : '🚫';
  blockBtn.setAttribute('data-author', authorName);

  blockBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const name = blockBtn.getAttribute('data-author');
    if (blockedUsers.has(name)) {
      await removeBlockedUser(name);
      blockBtn.textContent = '🚫';
      blockBtn.title = `"${name}" をブロック`;
    } else {
      await addBlockedUser(name);
      // コメント自体は applyBlockFilters() で非表示になる
    }
  });

  actionMenu.appendChild(blockBtn);
}

/**
 * ブロックフィルターを全コメントに適用する
 */
function applyBlockFilters() {
  // ytd-comment-renderer: メインコメント
  // ytd-comment-replies-renderer 内の ytd-comment-renderer: 返信コメント
  document.querySelectorAll('ytd-comment-renderer, ytd-comment-view-model').forEach((commentEl) => {
    if (shouldBlockComment(commentEl)) {
      commentEl.classList.add('ytcb-hidden');
    } else {
      commentEl.classList.remove('ytcb-hidden');
      addBlockButton(commentEl);
    }
  });
}

/**
 * MutationObserver でDOMの変化を監視してコメントに都度処理を適用する
 */
function observeComments() {
  const observer = new MutationObserver(() => {
    applyBlockFilters();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * ストレージの変更をリアルタイムで反映する
 */
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes[STORAGE_KEY_BLOCKED_USERS]) {
    blockedUsers = new Set(changes[STORAGE_KEY_BLOCKED_USERS].newValue || []);
  }
  if (changes[STORAGE_KEY_BLOCKED_KEYWORDS]) {
    blockedKeywords = changes[STORAGE_KEY_BLOCKED_KEYWORDS].newValue || [];
  }
  applyBlockFilters();
});

// 初期化
(async () => {
  await loadBlockLists();
  applyBlockFilters();
  observeComments();
})();
