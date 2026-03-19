import React from "react";
import { useMondaySettings } from "../hooks/useMondaySettings.js";
import { useItemDeadline } from "../hooks/useItemDeadline.js";

export default function DeadlineDisplay() {
  const { selectedItemId, dateColumnId, loading: loadingSettings } = useMondaySettings();
  const { deadlineText, loading: loadingData, error } = useItemDeadline(selectedItemId, dateColumnId);

  const containerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    minHeight: 140,
    padding: 12,
    fontFamily: "system-ui"
  };

  const bigStyle = {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: 0.5,
    textAlign: "center"
  };

  if (loadingSettings) {
    return <div style={containerStyle}>Loading…</div>;
  }

  // 尚未設定：提示使用者去右側 settings 填 itemId + date column
  if (!selectedItemId || !dateColumnId) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", opacity: 0.8 }}>
          <div style={bigStyle}>—</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>
            Open widget Settings to select item &amp; date column.
          </div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
            itemId 請從 item 的更新頁 URL 取得：<br />
            <code>.../pulses/&lt;itemId&gt;</code> [1](https://www.youtube.com/watch?v=FUhBSZ63uB8)
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div style={containerStyle}>Error: {error}</div>;
  }

  if (loadingData) {
    return <div style={containerStyle}>Loading deadline…</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={bigStyle}>{deadlineText || "—"}</div>
    </div>
  );
}