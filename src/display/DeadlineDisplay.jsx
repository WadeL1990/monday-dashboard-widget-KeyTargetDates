import React, { useEffect, useState } from "react";
import { useInstanceStorage } from "../hooks/useInstanceStorage";
import { useItemDeadline } from "../hooks/useItemDeadline";

export default function DeadlineDisplay() {
  const storage = useInstanceStorage();

  const [selectedItemId, setSelectedItemId] = useState(null);
  const [dateColumnId, setDateColumnId] = useState(null);
  const [loadingStorage, setLoadingStorage] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [itemId, colId] = await Promise.all([
        storage.getSelectedItemId(),
        storage.getDateColumnId(),
      ]);
      if (!mounted) return;
      setSelectedItemId(itemId ? String(itemId) : null);
      setDateColumnId(colId ? String(colId) : null);
      setLoadingStorage(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const { deadlineText, loading, error } = useItemDeadline(selectedItemId, dateColumnId);

  // Numbers widget 風格：置中大字
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
  };

  if (loadingStorage) {
    return <div style={containerStyle}>Loading…</div>;
  }

  if (!selectedItemId || !dateColumnId) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", opacity: 0.75 }}>
          <div style={bigStyle}>—</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>
            Open widget Settings to select item & date column.
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div style={containerStyle}>Error: {error}</div>;
  }

  if (loading) {
    return <div style={containerStyle}>Loading deadline…</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={bigStyle}>{deadlineText || "—"}</div>
    </div>
  );
}