/**
 * 作品許願池 — 表單行為。
 *
 * 送出走 fetch + Content-Type: text/plain。
 * 這不是筆誤：GAS Web App 不會回應 CORS preflight，若送 application/json
 * 瀏覽器會先發 OPTIONS，然後整個請求就掛在那裡。text/plain 屬於「簡單請求」
 * 不觸發 preflight，GAS 端再自己 JSON.parse(e.postData.contents)。
 */
(function () {
  'use strict';

  const config = window.WISH_POOL_CONFIG || {};
  const form = document.getElementById('wish-form');
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  const donePanel = document.getElementById('done-panel');
  const wishIdEl = document.getElementById('wish-id');
  const againBtn = document.getElementById('again-btn');
  const listLink = document.getElementById('list-link');

  const FIELDS = [
    { name: 'pain', label: '你的痛點', min: 10 },
    { name: 'solution', label: '你想如何解決', min: 5 },
    { name: 'features', label: '有什麼功能', min: 5 },
    { name: 'presentation', label: '呈現效果', min: 5 },
  ];

  const COOLDOWN_MS = 60 * 1000;
  const LAST_SENT_KEY = 'wishPool.lastSentAt';

  if (config.LIST_URL && listLink) listLink.href = config.LIST_URL;

  // ---- 字數計數 ----
  FIELDS.forEach(({ name }) => {
    const el = form.elements[name];
    const counter = form.querySelector(`[data-count-for="${name}"]`);
    if (!el || !counter) return;
    const update = () => {
      counter.textContent = `${el.value.length} / ${el.maxLength}`;
    };
    el.addEventListener('input', update);
    update();
  });

  // ---- 驗證 ----
  function setError(name, message) {
    const el = form.elements[name];
    const slot = form.querySelector(`[data-error-for="${name}"]`);
    if (slot) slot.textContent = message || '';
    if (el) {
      if (message) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
  }

  function isValidEmail(value) {
    // 刻意寬鬆：真正的驗證是「這封信寄不寄得到」，那要靠回信確認。
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  function validate() {
    let firstBad = null;

    FIELDS.forEach(({ name, label, min }) => {
      const value = form.elements[name].value.trim();
      let msg = '';
      if (!value) msg = `請填寫「${label}」`;
      else if (value.length < min) msg = `再多寫一點——${label}至少 ${min} 個字`;
      setError(name, msg);
      if (msg && !firstBad) firstBad = name;
    });

    const email = form.elements.email.value.trim();
    let emailMsg = '';
    if (!email) emailMsg = '請填 email，不然沒辦法回信給你';
    else if (!isValidEmail(email)) emailMsg = 'email 格式看起來不太對';
    setError('email', emailMsg);
    if (emailMsg && !firstBad) firstBad = 'email';

    if (firstBad) {
      form.elements[firstBad].focus();
      return false;
    }
    return true;
  }

  function setStatus(message, tone) {
    statusEl.textContent = message || '';
    if (tone) statusEl.dataset.tone = tone;
    else delete statusEl.dataset.tone;
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.dataset.loading = String(loading);
    submitBtn.querySelector('.btn-label').textContent = loading ? '送出中…' : '送出許願';
  }

  // ---- 送出 ----
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    setStatus('');

    // 蜜罐有值＝機器人。裝作成功，不給它任何回饋去調整。
    if (form.elements.website.value) {
      form.hidden = true;
      donePanel.hidden = false;
      return;
    }

    if (!validate()) {
      setStatus('有欄位還沒填好', 'error');
      return;
    }

    const lastSent = Number(localStorage.getItem(LAST_SENT_KEY) || 0);
    if (Date.now() - lastSent < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
      setStatus(`剛剛才送出過，請等 ${wait} 秒再試`, 'error');
      return;
    }

    if (!config.GAS_ENDPOINT || config.GAS_ENDPOINT.startsWith('PASTE_')) {
      setStatus('表單還沒接上後端（GAS_ENDPOINT 未設定）', 'error');
      return;
    }

    const payload = {
      pain: form.elements.pain.value.trim(),
      solution: form.elements.solution.value.trim(),
      features: form.elements.features.value.trim(),
      presentation: form.elements.presentation.value.trim(),
      email: form.elements.email.value.trim(),
      submittedAt: new Date().toISOString(),
    };

    setLoading(true);
    try {
      const response = await fetch(config.GAS_ENDPOINT, {
        method: 'POST',
        // 見檔頭：text/plain 是為了避開 GAS 接不住的 CORS preflight
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || `伺服器回了 ${response.status}`);
      }

      localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
      wishIdEl.textContent = result.wishId || '（已收到）';
      form.hidden = true;
      donePanel.hidden = false;
      donePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 願望送出去了——交給 magic.js 放星塵。純裝飾，沒載入也不影響流程。
      window.dispatchEvent(new CustomEvent('wish:sent'));
    } catch (error) {
      setStatus(`送出失敗：${error.message}。可以再試一次，或直接寄信給我。`, 'error');
    } finally {
      setLoading(false);
    }
  });

  againBtn.addEventListener('click', function () {
    form.reset();
    FIELDS.forEach(({ name }) => setError(name, ''));
    setError('email', '');
    form.querySelectorAll('.count').forEach((el) => {
      const target = form.elements[el.dataset.countFor];
      if (target) el.textContent = `0 / ${target.maxLength}`;
    });
    donePanel.hidden = true;
    form.hidden = false;
    form.elements.pain.focus();
  });
})();
