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
      <div className="container">
        <div className="center">
          <div className="value">Loading…</div>
        </div>
        <Style />
      </div>
    );
  }

  if (!selectedItemId || !dateColumnId) {
    return (
      <div className="container">
        <div className="center">
          <div className="value">—</div>
          <div className="hint">
            Open widget Settings to select item &amp; date column.
          </div>
        </div>
        <Style />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="center">
          <div className="value">Error</div>
        </div>
        <Style />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="center">
        <div className="value">{displayText || "—"}</div>
      </div>
      <Style />
    </div>
  );
}

function Style() {
  return (
    <style>{`
      /* ✅ 外層：完全不捲動 → 永遠不會出現 scrollbar */
      .container {
        position: relative;
        height: 100%;
        min-height: 140px;
        overflow: hidden;           /* ✅ 關掉 scroll */
        padding: 10px;              /* 留白避免貼邊 */
        font-family: system-ui;
      }

      /* ✅ 中央定位：不受尺寸變化影響 */
      .center {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        text-align: center;
        pointer-events: none;
      }

      /*
        ✅ 字體自動縮放：
        - clamp(min, preferred, max)
        - preferred 用 vw（跟 widget 寬度變動）
        - 你可以調整中間的 6.5vw 讓它更大/更小
      */
      .value {
        font-size: clamp(18px, 5.8vw, 36px);  /* ✅ 自動縮放避免溢出 */
        font-weight: 600;                      /* ✅ 不要太粗 */
        letter-spacing: 0.4px;
        line-height: 1.1;
        color: #111;
        white-space: nowrap;                   /* ✅ 一行顯示，避免換行撐高 */
        max-width: calc(100% - 20px);          /* ✅ 不讓文字碰到邊 */
        overflow: hidden;
        text-overflow: ellipsis;               /* ✅ 極端狀況用省略號 */
      }

      .hint {
        margin-top: 8px;
        font-size: 12px;
        opacity: 0.7;
        color: #111;
      }

      @media (prefers-color-scheme: dark) {
        .value, .hint { color: #fff; }
      }
    `}</style>
  );
}