/**
 * 寫回 Notion 的「🌠 許願列表」。
 *
 * 重點：email 不寫進 Notion。個資只留在 Sheet（寄信用），
 * Notion 那頁是可以公開的，列表上看得到許願內容與進度，看不到是誰許的。
 */

const NOTION_API = 'https://api.notion.com/v1';

/** 建立一筆許願，回傳 Notion page id */
function createNotionWish(wish, wishId) {
  const title = buildTitle(wish.pain);

  const payload = {
    parent: { database_id: CONFIG.notionDatabaseId },
    icon: { type: 'emoji', emoji: '🌠' },
    properties: {
      '許願標題': titleProp(title),
      '狀態': selectProp('許願中'),
      '痛點': textProp(wish.pain),
      '想如何解決': textProp(wish.solution),
      '期望功能': textProp(wish.features),
      '呈現效果': textProp(wish.presentation),
      '許願時間': dateProp(wish.submittedAt),
    },
    children: [
      heading('原始許願內容'),
      calloutBlock(`${wishId}　·　送出於 ${formatDate(wish.submittedAt)}`),
      heading('你的痛點'),
      paragraph(wish.pain),
      heading('你想如何解決'),
      paragraph(wish.solution),
      heading('有什麼功能'),
      paragraph(wish.features),
      heading('呈現效果'),
      paragraph(wish.presentation),
      divider(),
      heading('AI 可行性分析'),
      paragraph('（待分析。分析結果會填進上方屬性，並在這裡補完整說明。）'),
    ],
  };

  const response = UrlFetchApp.fetch(NOTION_API + '/pages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + CONFIG.notionToken,
      'Notion-Version': CONFIG.notionVersion,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error(`Notion API ${code}：${text.slice(0, 300)}`);
  }

  return JSON.parse(text).id;
}

/**
 * 更新既有許願（狀態、進度、分析結果都走這裡）。
 * 就地更新同一列，不新增重複列——所以需要 Sheet 存著 notionPageId。
 */
function updateNotionWish(pageId, properties) {
  const response = UrlFetchApp.fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + CONFIG.notionToken,
      'Notion-Version': CONFIG.notionVersion,
    },
    payload: JSON.stringify({ properties: properties }),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Notion API ${code}：${response.getContentText().slice(0, 300)}`);
  }
  return JSON.parse(response.getContentText());
}

/** 標題先用痛點前 24 字頂著，等分析時再換成一句話摘要 */
function buildTitle(pain) {
  const flat = pain.replace(/\s+/g, ' ').trim();
  return flat.length > 24 ? flat.slice(0, 24) + '…' : flat;
}

function formatDate(isoString) {
  return Utilities.formatDate(new Date(isoString), 'Asia/Taipei', 'yyyy-MM-dd HH:mm');
}

// ---- Notion 屬性與區塊的組裝小工具 ----
// Notion API 的 rich_text 單段上限 2000 字，表單已限 1000，這裡仍切一刀防呆。

function chunk(text) {
  return String(text).slice(0, 2000);
}

function titleProp(value) {
  return { title: [{ type: 'text', text: { content: chunk(value) } }] };
}

function textProp(value) {
  return { rich_text: [{ type: 'text', text: { content: chunk(value) } }] };
}

function selectProp(name) {
  return { select: { name: name } };
}

function dateProp(isoString) {
  return { date: { start: isoString } };
}

function numberProp(value) {
  return { number: value };
}

function checkboxProp(value) {
  return { checkbox: Boolean(value) };
}

function urlProp(value) {
  return { url: value || null };
}

function heading(text) {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: { rich_text: [{ type: 'text', text: { content: text } }] },
  };
}

function paragraph(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: chunk(text) } }] },
  };
}

function calloutBlock(text) {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji: '🗓️' },
      color: 'gray_background',
      rich_text: [{ type: 'text', text: { content: chunk(text) } }],
    },
  };
}

function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}
