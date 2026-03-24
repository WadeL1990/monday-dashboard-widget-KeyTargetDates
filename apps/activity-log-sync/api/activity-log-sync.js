/**
 * Vercel Serverless Function
 * Path: /api/activity-log-sync
 *
 * Purpose:
 * - Receive monday webhook or monday automation-block action execution payload
 * - Fetch board activity logs for a specific item + column
 * - Append a formatted line into a Text/LongText column as an audit trail
 * - Store last processed activity_log id in a Text column to dedupe
 *
 * Notes:
 * - ALWAYS return 200 to monday, and report problems via runtimeErrorDescription
 *   (Returning 4xx/5xx often becomes "resource not being found" with no useful message) [5](https://vercel.com/docs/builds/configure-a-build)[6](https://www.reddit.com/r/flask/comments/14oqr32/folder_structure_mismatch_when_deployed_to_vercel/)
 * - Handle monday webhook "challenge" handshake by echoing it back. [1](https://github.com/vercel/vercel/issues/13090)[2](https://pocketcmds.com/skills/vercel/vercel-monorepo-setup)
 */

export default async function handler(req, res) {
  try {
    // Allow quick manual check in browser
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, service: "activity-log-sync" });
    }

    if (req.method !== "POST") {
      return ok(res, null, "Method not allowed (POST only).");
    }

    const body = req.body ?? {};

    // monday webhook URL verification: echo back the challenge exactly [1](https://github.com/vercel/vercel/issues/13090)[2](https://pocketcmds.com/skills/vercel/vercel-monorepo-setup)
    if (body && typeof body === "object" && body.challenge) {
      return res.status(200).json({ challenge: body.challenge });
    }

    const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
    if (!MONDAY_TOKEN) {
      return ok(res, null, "Missing MONDAY_TOKEN env var.");
    }

    // 1) Normalize payload (supports both:
    //    - Automation Block action payload: { payload: { ... } }
    //    - Board webhook payload: { event: { ... } } [1](https://github.com/vercel/vercel/issues/13090)
    const normalized = normalizeIncoming(body);

    const boardId = normalized.boardId;
    const itemId = normalized.itemId;
    const changedColumnId = normalized.changedColumnId;

    // In automation-block action mode, these should come from action input fields.
    // In webhook mode, you can fallback to env defaults.
    const logColumnId =
      normalized.logColumnId || process.env.DEFAULT_LOG_COLUMN_ID || "";
    const lastIdColumnId =
      normalized.lastIdColumnId || process.env.DEFAULT_LAST_ID_COLUMN_ID || "";

    if (!boardId || !itemId || !changedColumnId) {
      return ok(
        res,
        null,
        `Missing required identifiers. Got boardId=${String(boardId)} itemId=${String(
          itemId
        )} changedColumnId=${String(changedColumnId)}`
      );
    }

    if (!logColumnId || !lastIdColumnId) {
      return ok(
        res,
        null,
        `Missing logColumnId/lastIdColumnId. Provide via action input fields (preferred) or set DEFAULT_LOG_COLUMN_ID & DEFAULT_LAST_ID_COLUMN_ID env vars.`
      );
    }

    // 2) Read current stored log text + last processed activity id
    const { currentLog, lastSeenId } = await getCurrentLogState(
      MONDAY_TOKEN,
      itemId,
      logColumnId,
      lastIdColumnId
    );

    // 3) Query activity logs for this board+item+column in a recent time window [3](https://developer.monday.com/apps/docs/dynamic-mapping)[4](https://developer-community.monday.com/product-updates/action-required-migrate-your-app-s-legacy-automation-features-by-april-30-2026-5129)
    const windowMin = Number(process.env.TIME_WINDOW_MINUTES || "10");
    const now = new Date();
    const to = now.toISOString();
    const from = new Date(now.getTime() - windowMin * 60 * 1000).toISOString();

    const activityLogs = await fetchActivityLogs(MONDAY_TOKEN, {
      boardId,
      from,
      to,
      itemId,
      columnId: changedColumnId,
      limit: 25,
    });

    if (!activityLogs.length) {
      // Not an error: sometimes logs arrive slightly delayed
      return ok(res, { ok: true, note: "No activity logs found in time window." });
    }

    // 4) Choose a "new" activity log entry (dedupe)
    const next = pickNextUnseen(activityLogs, lastSeenId);
    if (!next) {
      return ok(res, { ok: true, note: "No new logs (deduped)." });
    }

    // 5) Format one log line (best-effort parsing: data schema varies by event) [7](https://smart-templates-for-monday.helpscoutdocs.com/article/94-map-the-columns)
    const line = formatLogLine({
      now,
      changedColumnId,
      activity: next,
    });

    // 6) Append newest entry on top
    const newLogText = currentLog ? `${line}\n${currentLog}` : line;

    // 7) Write back both columns in one mutation (keys MUST be column IDs) [8](https://simpledaysolutions.com/the-proper-use-of-views-in-monday-com-managing-columns/)
    await writeBackLog(MONDAY_TOKEN, {
      boardId,
      itemId,
      logColumnId,
      lastIdColumnId,
      logText: newLogText,
      lastActivityId: String(next.id),
    });

    return ok(res, { ok: true, written: line, activityId: next.id });
  } catch (err) {
    // Never return 4xx/5xx to monday automations; return 200 with an explanation
    return ok(res, null, `Unhandled error: ${err?.message || String(err)}`);
  }
}

// ---------------------- helpers ----------------------

function ok(res, data, runtimeErrorDescription) {
  // monday automations expect 200; provide runtimeErrorDescription for visibility
  const body = data || { ok: true };
  if (runtimeErrorDescription) body.runtimeErrorDescription = runtimeErrorDescription;
  return res.status(200).json(body);
}

function normalizeIncoming(body) {
  // Automation Block action execution often wraps data under body.payload
  const p = body?.payload;

  // Board Webhooks integration uses body.event [1](https://github.com/vercel/vercel/issues/13090)
  const e = body?.event;

  // Try to normalize best-effort
  // - boardId could be in payload.context, payload.inputFields, payload.inboundFieldValues, event.boardId
  // - itemId could be payload.inputFields.itemId, payload.context.itemId, event.pulseId / event.itemId
  // - changedColumnId could be payload.inputFields.columnId/triggerColumnId, event.columnId
  const boardId =
    pickAny([
      p?.context?.boardId,
      p?.inputFields?.boardId?.value,
      p?.inputFields?.boardId,
      p?.inboundFieldValues?.boardId?.value,
      p?.inboundFieldValues?.boardId,
      e?.boardId,
      e?.board_id,
    ]) || "";

  const itemId =
    pickAny([
      p?.context?.itemId,
      p?.inputFields?.itemId?.value,
      p?.inputFields?.itemId,
      p?.inboundFieldValues?.itemId?.value,
      p?.inboundFieldValues?.itemId,
      e?.pulseId,
      e?.pulse_id,
      e?.itemId,
      e?.item_id,
    ]) || "";

  const changedColumnId =
    pickAny([
      p?.inputFields?.triggerColumnId?.value,
      p?.inputFields?.triggerColumnId,
      p?.inputFields?.columnId?.value,
      p?.inputFields?.columnId,
      e?.columnId,
      e?.column_id,
    ]) || "";

  // Action input fields (recommended): let user choose in monday UI
  const logColumnId =
    pickAny([
      p?.inputFields?.logTargetColumnId?.value,
      p?.inputFields?.logTargetColumnId,
      p?.inputFields?.logColumnId?.value,
      p?.inputFields?.logColumnId,
    ]) || "";

  const lastIdColumnId =
    pickAny([
      p?.inputFields?.lastIdColumnId?.value,
      p?.inputFields?.lastIdColumnId,
      p?.inputFields?.lastActivityIdColumnId?.value,
      p?.inputFields?.lastActivityIdColumnId,
    ]) || "";

  return {
    boardId: String(boardId),
    itemId: String(itemId),
    changedColumnId: String(changedColumnId),
    logColumnId: String(logColumnId),
    lastIdColumnId: String(lastIdColumnId),
  };
}

function pickAny(arr) {
  for (const v of arr) {
    if (v === 0) return v;
    if (v === false) return v;
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

async function mondayQuery(token, query, variables) {
  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  return await r.json();
}

async function getCurrentLogState(token, itemId, logColumnId, lastIdColumnId) {
  const q = `
    query ($itemId: ID!) {
      items(ids: [$itemId]) {
        column_values { id text }
      }
    }
  `;
  const r = await mondayQuery(token, q, { itemId: String(itemId) });
  const cvs = r?.data?.items?.[0]?.column_values ?? [];

  const currentLog = (cvs.find((c) => c.id === logColumnId)?.text || "").trim();
  const lastSeenId = (cvs.find((c) => c.id === lastIdColumnId)?.text || "").trim();

  return { currentLog, lastSeenId };
}

async function fetchActivityLogs(token, { boardId, from, to, itemId, columnId, limit }) {
  const q = `
    query ($boardId: [ID!], $from: DateTime!, $to: DateTime!, $itemIds: [ID!], $colIds: [String!], $limit: Int!) {
      boards(ids: $boardId) {
        activity_logs(from: $from, to: $to, limit: $limit, item_ids: $itemIds, column_ids: $colIds) {
          id
          event
          data
        }
      }
    }
  `;
  const r = await mondayQuery(token, q, {
    boardId: [String(boardId)],
    from,
    to,
    itemIds: [String(itemId)],
    colIds: [String(columnId)],
    limit: Number(limit || 25),
  });

  return r?.data?.boards?.[0]?.activity_logs ?? [];
}

function pickNextUnseen(logs, lastSeenId) {
  if (!logs.length) return null;
  if (!lastSeenId) return logs[0];

  // Find first log that doesn't match lastSeenId
  const found = logs.find((l) => String(l.id) !== String(lastSeenId));
  return found || null;
}

function formatLogLine({ now, changedColumnId, activity }) {
  const ts = formatTs(now);
  const eventName = activity?.event || "unknown_event";
  const raw = activity?.data ?? "";

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  // Best effort: schema varies; if missing, include raw snippet [7](https://smart-templates-for-monday.helpscoutdocs.com/article/94-map-the-columns)
  const who =
    (parsed && pickAny([parsed.user_name, parsed.user, parsed.userId, parsed.user_id])) ||
    "unknown";

  const oldVal =
    (parsed && pickAny([parsed.previous_value, parsed.old_value, parsed.previousValue])) || "";
  const newVal =
    (parsed && pickAny([parsed.value, parsed.new_value, parsed.newValue])) || "";

  const detail =
    oldVal || newVal
      ? `${changedColumnId}: ${oldVal} → ${newVal}`.trim()
      : `${changedColumnId}: ${eventName} | ${safeSnippet(raw)}`;

  return `${ts} | ${who} | ${detail}`;
}

function formatTs(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function safeSnippet(v) {
  const s = String(v ?? "");
  return s.length > 350 ? s.slice(0, 350) + "…" : s;
}

async function writeBackLog(
  token,
  { boardId, itemId, logColumnId, lastIdColumnId, logText, lastActivityId }
) {
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $values: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $values) {
        id
      }
    }
  `;

  const valuesObj = {};
  valuesObj[logColumnId] = logText;
  valuesObj[lastIdColumnId] = lastActivityId;

  await mondayQuery(token, mutation, {
    boardId: String(boardId),
    itemId: String(itemId),
    values: JSON.stringify(valuesObj),
  });
}