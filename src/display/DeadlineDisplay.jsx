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
    return <div className="container">Loading…</div>;
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
    return <div className="container">Error</div>;
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

/**
 * 把 CSS 抽成元件，避免 JSX 太亂
 */
function Style() {
  return (
    <style>{`
      /* ===== 外層：負責 scroll，不負責置中 ===== */
      .container {
        position: relative;
        height: 100%;
        min-height: 140px;
        overflow: auto;
        font-family: system-ui;
      }

      /* ===== 內層：永遠視覺正中央 ===== */
      .center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: none; /* 防止誤點 */
      }

      /* ===== 主數字樣式 ===== */
      .value {
        font-size: 36px;
        font-weight: 600; /* ✅ 不再那麼粗 */
        letter-spacing: 0.4px;
        color: #111;
        white-space: nowrap;
      }

      .hint {
        margin-top: 8px;
        font-size: 12px;
        opacity: 0.7;
        color: #111;
      }

      /* ===== 深色模式 ===== */
      @media (prefers-color-scheme: dark) {
        .value,
        .hint {
          color: #ffffff;
        }
      }

      /* ===== Scrollbar：細 + 灰 + 低存在感 ===== */

      /* Chrome / Edge / Safari */
      .container::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      .container::-webkit-scrollbar-track {
        background: transparent;
      }

      .container::-webkit-scrollbar-thumb {
        background-color: rgba(120, 120, 120, 0.25);
        border-radius: 6px;
      }

      .container:hover::-webkit-scrollbar-thumb {
        background-color: rgba(120, 120, 120, 0.45);
      }

      /* Firefox */
      .container {
        scrollbar-width: thin;
        scrollbar-color: rgba(120, 120, 120, 0.35) transparent;
      }

      .container:hover {
        scrollbar-color: rgba(120, 120, 120, 0.55) transparent;
      }
    `}</style>
  );
}