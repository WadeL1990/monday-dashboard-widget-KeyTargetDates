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
    fontFamily: "system-ui",
  };

  const bigStyle = {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: 0.5,
    textAlign: "center",
  };

  if (loadingSettings) return <div style={containerStyle}>Loading…</div>;

  if (!selectedItemId || !dateColumnId) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", opacity: 0.85 }}>
          <div style={bigStyle}>—</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>
            Open widget Settings to select item &amp; date column.
          </div>

          {/* ✅ Debug：你現在可以看到解析結果 */}
          <div style={{ fontSize: 12, marginTop: 10 }}>
            <div>
              parsed itemId (from settings.text):{" "}
              <code>{selectedItemId ? selectedItemId : "null"}</code>
            </div>
            <div>
              parsed dateColumnId (from settings.columnsPerBoard):{" "}
              <code>{dateColumnId ? dateColumnId : "null"}</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) return <div style={containerStyle}>Error: {error}</div>;
  if (loadingData) return <div style={containerStyle}>Loading deadline…</div>;

  return (
    <div style={containerStyle}>
      <div style={bigStyle}>{deadlineText || "—"}</div>
    </div>
  );
}