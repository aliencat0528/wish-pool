/**
 * 寄信。用 GmailApp 而非 MailApp，因為 GmailApp 從你的 Gmail 帳號寄出，
 * 有正常的 SPF/DKIM，比較不會進垃圾郵件匣。
 *
 * 配額：個人 Gmail 帳號每天 100 封。許願池的量級遠低於此，
 * 但如果哪天爆量，這裡會是第一個撞牆的地方。
 */

/** 收到許願後的確認信 */
function sendConfirmationMail(wish, wishId) {
  const subject = `[${wishId}] 收到你的許願了 🌠`;

  const body = [
    '嗨，',
    '',
    `你的許願已經收到，編號 ${wishId}。`,
    '',
    '你填的內容：',
    '',
    `【你的痛點】`,
    wish.pain,
    '',
    `【你想如何解決】`,
    wish.solution,
    '',
    `【有什麼功能】`,
    wish.features,
    '',
    `【呈現效果】`,
    wish.presentation,
    '',
    '─────────────',
    '',
    '接下來會發生的事：',
    '1. 我會做一次可行性分析（技術難點、建議做法、要先砍掉什麼）',
    '2. 分析結果會更新到公開的許願列表',
    '3. 如果決定開發，完成後會再寄一封信給你，附上連結與反饋表單',
    '4. 如果不做，也會回信告訴你原因——不會就這樣沒下文',
    '',
    `許願列表：${CONFIG.listUrl}`,
    '',
    '先說清楚：這是免費的小工具開發，我挑做得動也想做的題目，',
    '所以不保證每個許願都會開發。等待中的許願不是承諾。',
    '',
    '你的 email 只用來回信，不會出現在公開頁面上。',
    '',
    `— ${CONFIG.senderName}`,
  ].join('\n');

  GmailApp.sendEmail(wish.email, subject, body, { name: CONFIG.senderName });
}

/**
 * 開發完成通知信。
 * 目前手動觸發：在編輯器裡改好參數後執行，或之後接進狀態變更流程。
 */
function sendCompletionMail(email, wishId, wishTitle, demoUrl, feedbackUrl) {
  const subject = `[${wishId}] 做好了 — ${wishTitle}`;

  const body = [
    '嗨，',
    '',
    `你許的「${wishTitle}」做好了。`,
    '',
    `看看成果：${demoUrl}`,
    '',
    '請試用看看，然後告訴我：',
    '- 有沒有解決到你原本的痛點？',
    '- 哪裡不好用、哪裡跟你想的不一樣？',
    '- 還缺什麼？',
    '',
    `反饋表單：${feedbackUrl}`,
    '',
    '你的反饋會進到這個專案的下一版待辦——這不是客套，',
    '許願池的設計本來就是「做完 → 收反饋 → 進下一版」。',
    '',
    `— ${CONFIG.senderName}`,
  ].join('\n');

  GmailApp.sendEmail(email, subject, body, { name: CONFIG.senderName });
}

/**
 * 婉拒信。不可行也要說明原因，不靜默略過——這是對許願者的基本尊重，
 * 也是這個專案跟「丟進黑洞的意見信箱」的差別。
 */
function sendDeclineMail(email, wishId, wishTitle, reason) {
  const subject = `[${wishId}] 關於你許的「${wishTitle}」`;

  const body = [
    '嗨，',
    '',
    `謝謝你許的「${wishTitle}」。我看過了，這次不會開發，原因是：`,
    '',
    reason,
    '',
    '這不代表你的想法不好——多半是規模、資料來源或我的能力範圍的問題。',
    '如果之後條件變了，我會回頭看這一筆。',
    '',
    '也歡迎換個角度再許一次，把範圍縮小可能就做得動了。',
    '',
    `許願列表：${CONFIG.listUrl}`,
    '',
    `— ${CONFIG.senderName}`,
  ].join('\n');

  GmailApp.sendEmail(email, subject, body, { name: CONFIG.senderName });
}
