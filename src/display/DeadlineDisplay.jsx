import React, { useMemo } from "react";
import { useMondaySettings } from "../hooks/useMondaySettings.js";
import { useItemDeadline } from "../hooks/useItemDeadline.js";

function tryParseDate(deadlineText) {
  if (!deadlineText) return null;
  // deadlineText 通常是 YYYY-MM-DD（但也可能因設定而不同）
  // 先嘗試 Date() 解析；若失敗你之後可改用 column_values.value 取原始 date
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
    if (!d) return deadlineText || "—"; // 若 parse 失敗就原樣顯示，至少不空白
    return formatDate(d, dateFormat);
  }, [deadlineText, dateFormat]);

  const containerStyle = {
    height: "100%",
    minHeight: 140,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui",
    textAlign: "center",
    padding: 12,
  };

  if (loadingSettings || loadingData) {
    return <div style={containerStyle}>Loading…</div>;
  }

  if (!selectedItemId || !dateColumnId) {
    return (
      <div style={containerStyle}>
        <div className="value">—</div>
        <div className="hint">
          Open widget Settings to select item &amp; date column.
        </div>

        {/* debug：方便你確認 settings 是否進來 */}
        <div className="debug">
          <div>
            itemId (settings.text): <code>{selectedItemId ?? "null"}</code>
          </div>
          <div>
            dateColumnId (columnsPerBoard): <code>{dateColumnId ?? "null"}</code>
          </div>
          <div>
            dateFormat (settings.dropdown): <code>{dateFormat ?? "null"}</code>
          </div>
        </div>

        <style>{`
          .value { font-size: 36px; font-weight: 800; letter-spacing: .5px; color: #111; }
          .hint { margin-top: 8px; font-size: 12px; opacity: .7; color: #111; }
          .debug { margin-top: 10px; font-size: 12px; opacity: .75; color: #111; }
          @media (prefers-color-scheme: dark) {
            .value, .hint, .debug { color: #fff; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return <div style={containerStyle}>Error: {error}</div>;
  }

  return (
    <div style={containerStyle}>
      <div className="value">{displayText || "—"}</div>

      <style>{`
        .value { font-size: 36px; font-weight: 800; letter-spacing: .5px; color: #111; }
        @media (prefers-color-scheme: dark) {
          .value { color: #fff; }
        }
      `}</style>
    </div>
  );
}