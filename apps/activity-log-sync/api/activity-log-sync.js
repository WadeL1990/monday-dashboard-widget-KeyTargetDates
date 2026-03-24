/**
 * POST /api/activity-log-sync
 *
 * 期望收到的 body（JSON）：
 * {
 *   "boardId": "123",
 *   "itemId": "456",
 *   "columnId": "status",             // 你要追蹤的欄位 id
 *   "logColumnId": "long_text_log",   // 你要寫入紀錄的 Text/LongText 欄位 id
 *   "lastIdColumnId": "text_last_id"  // 用來去重的 Text 欄位 id
 * }
 *
 * 可選：
 * - "signature": "..." 或在 header 帶 x-als-signature 做驗證（見下方 verifySignature）
 */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const {
    boardId,
    itemId,
    columnId,
    logColumnId,
    lastIdColumnId
  } = req.body || {};

  if (!boardId || !itemId || !columnId || !logColumnId || !lastIdColumnId) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["boardId", "itemId", "columnId", "logColumnId", "lastIdColumnId"]
    });
  }

  const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
  if (!MONDAY_TOKEN) return res.status(500).json({ error: "Missing MONDAY_TOKEN env var" });

  // （可選）驗證 webhook 來源：如果你有設定 ALS_SECRET，就要求 header 帶 x-als-signature
  const ALS_SECRET = process.env.ALS_SECRET;
  if (ALS_SECRET) {
    const sig = req.headers["x-als-signature"];
    const ok = verifySignature(ALS_SECRET, sig, req.body);
    if (!ok) return res.status(401).json({ error: "Invalid signature" });
  }

  // 1) 取目前 item 的：
  //    - 現有紀錄文字（logColumnId）
  //    - 上次寫入的 activity log id（lastIdColumnId）
  const getItemQuery = `
    query ($itemId: ID!) {
      items(ids: [$itemId]) {
        column_values { id text }
      }
    }
  `;
  const itemRes = await mondayQuery(MONDAY_TOKEN, getItemQuery, { itemId: String(itemId) });
  const cvs = itemRes?.data?.items?.[0]?.column_values ?? [];

  const lastSeen = (cvs.find(c => c.id === lastIdColumnId)?.text || "").trim();
  const currentLog = cvs.find(c => c.id === logColumnId)?.text || "";

  // 2) 查 Activity Logs
  // 用 item_ids + column_ids + 近幾分鐘時間窗縮小範圍
  // Activity Logs 查詢範例：boards { activity_logs(from,to){id event data} } [1](https://community.monday.com/t/widget-view-edit-settings-permissions/101281)[2](https://getgorilla.app/products/board-to-website-widget/docs/advanced-features)
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // 最近 10 分鐘（更穩）

  const activityQuery = `
    query ($boardId: [ID!], $from: DateTime!, $to: DateTime!, $itemIds: [ID!], $colIds: [String!]) {
      boards(ids: $boardId) {
        activity_logs(from: $from, to: $to, limit: 25, item_ids: $itemIds, column_ids: $colIds) {
          id
          event
          data
        }
      }
    }
  `;
  const actRes = await mondayQuery(MONDAY_TOKEN, activityQuery, {
    boardId: [String(boardId)],
    from,
    to,
    itemIds: [String(itemId)],
    colIds: [String(columnId)]
  });

  const logs = actRes?.data?.boards?.[0]?.activity_logs ?? [];
  if (!logs.length) {
    return res.status(200).json({ ok: true, note: "No activity logs found in time window" });
  }

  // 3) 去重：找出第一筆未處理（用 Last Activity Log ID）
  // （排序不保證，所以用「找不同 id」的保守策略）
  const next = logs.find(l => String(l.id) !== String(lastSeen)) || null;
  if (!next) {
    return res.status(200).json({ ok: true, note: "No new logs (deduped)" });
  }

  // 4) 解析 activity data（不保證是 JSON，因此容錯）[4](https://monday-help.dsapps.dev/shared-documentation/what-role-based-restrictions-are-there-on-our-apps)
  let parsed = next.data;
  try { parsed = JSON.parse(next.data); } catch {}

  // 5) 組裝你要的文字（時間 / 變更者 / 舊新值）
  // 由於不同 event 的 data 不一定包含 user/old/new，取不到就 fallback
  const ts = formatTs(now);
  const who = pickFirst(parsed, ["user_name", "user", "userId", "user_id"]) || "unknown";
  const oldVal = pickFirst(parsed, ["previous_value", "old_value", "previousValue"]) || "";
  const newVal = pickFirst(parsed, ["value", "new_value", "newValue"]) || "";

  // 若抓不到舊新值，就把 event+raw data 記進去，至少「可追溯」
  const detail =
    (oldVal || newVal)
      ? `${columnId}: ${oldVal} → ${newVal}`.trim()
      : `${columnId}: ${next.event} | ${safeString(next.data)}`;

  const line = `${ts} | ${who} | ${detail}`;

  // 6) append：最新一筆放最上面
  const newLogText = currentLog ? `${line}\n${currentLog}` : line;

  // 7) 寫回 board item（一次寫兩欄：Log + LastActivityId）
  // change_multiple_column_values 需要 column_values 是 JSON 字串 [3](https://bing.com/search?q=monday+dashboard+KPI+widget+best+practices)
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $values: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $values) {
        id
      }
    }
  `;

  const valuesObj = {
    [logColumnId]: newLogText,
    [lastIdColumnId]: String(next.id)
  };

  await mondayQuery(MONDAY_TOKEN, mutation, {
    boardId: String(boardId),
    itemId: String(itemId),
    values: JSON.stringify(valuesObj)
  });

  return res.status(200).json({ ok: true, written: line, activityId: next.id });
}

// ---- helpers ----

async function mondayQuery(token, query, variables) {
  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Authorization": token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });
  return await r.json();
}

function formatTs(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pickFirst(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return null;
}

function safeString(v) {
  if (v == null) return "";
  const s = String(v);
  return s.length > 500 ? s.slice(0, 500) + "…" : s;
}

/**
 * 簡易簽章驗證（可選）
 * - 設定 ALS_SECRET 後，caller 必須送 header: x-als-signature
 * - signature = base64( HMAC_SHA256(secret, JSON.stringify(body)) )
 */
import crypto from "node:crypto";
function verifySignature(secret, signature, body) {
  if (!signature) return false;
  const payload = JSON.stringify(body ?? {});
  const h = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  return timingSafeEqual(h, String(signature));
}

function timingSafeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}