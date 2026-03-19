import React, { useMemo } from "react";
import { useMondaySettings } from "../hooks/useMondaySettings.js";
import { useItemDeadline } from "../hooks/useItemDeadline.js";

function tryParseDate(deadlineText) {
  if (!deadlineText) return null;
  const d = new Date(deadlineText);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date, format) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const monthShort = date.toLocaleString("en-US", { month: "short" });

  switch (format) {
    case "MDY":
      return `${mm}-${dd}-${yyyy}`;
    case "MMM_D_Y":
      return `${monthShort}-${dd}-${yyyy}`;
    case "MD":
      return `${mm}-${dd}`;
    case "YMD":
    default:
      return `${yyyy}-${mm}-${dd}`;
  }
}

export default function DeadlineDisplay() {
  const { selectedItemId, dateColumnId, dateFormat, loading: loadingSettings } =
    useMondaySettings();

  const { deadlineText, loading: loadingData, error } = useItemDeadline(
    selectedItemId,
    dateColumnId
  );

  const displayText = useMemo(() => {
    const d = tryParseDate(deadlineText);
    if (!d) return deadlineText || "—";
    return formatDate(d, dateFormat);
  }, [deadlineText, dateFormat]);

  if (loadingSettings || loadingData) {
    return (
      <>
        <div className="center">
          <div className="value">Loading…</div>
        </div>
        <Style />
      </>
    );
  }

  if (!selectedItemId || !dateColumnId) {
    return (
      <>
        <div className="center">
          <div className="value">—</div>
          <div className="hint">
            Open widget Settings to select item &amp; date column.
          </div>
        </div>
        <Style />
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="center">
          <div className="value">Error</div>
        </div>
        <Style />
      </>
    );
  }

  return (
    <>
      <div className="center">
        <div className="value">{displayText || "—"}</div>
      </div>
      <Style />
    </>
  );
}

/**
 * ✅ 關鍵 CSS 都在這裡
 */
function Style() {
  return (
    <style>{`
      /* ===== 關鍵：整個 iframe document 都不能捲 ===== */
      html, body, #root {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;   /* ✅ 這行就是關鍵 */
      }

      body {
        font-family: system-ui;
      }

      /* ===== 內容永遠置中 ===== */
      .center {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        text-align: center;
        pointer-events: none;
      }

      /* ===== 主文字 ===== */
      .value {
        font-size: clamp(18px, 6.5vw, 36px);
        font-weight: 600;          /* ✅ 已降粗 */
        letter-spacing: 0.4px;
        line-height: 1.1;
        color: #111;
        white-space: nowrap;
        max-width: calc(100% - 24px);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .hint {
        margin-top: 8px;
        font-size: 12px;
        opacity: 0.7;
        color: #111;
      }

      @media (prefers-color-scheme: dark) {
        .value, .hint {
          color: #ffffff;
        }
      }
    `}</style>
  );
}
``