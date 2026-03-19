import React, { useEffect, useMemo, useState } from "react";
import { useMondayContext } from "../hooks/useMondayContext";
import { useInstanceStorage } from "../hooks/useInstanceStorage";
import { fetchBoardColumns, fetchBoardItems } from "../api/mondayApi";

export default function SettingsPanel() {
  const { boardId } = useMondayContext();
  const storage = useInstanceStorage();

  const [columns, setColumns] = useState([]);
  const [items, setItems] = useState([]);

  const [dateColumnId, setDateColumnId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");

  const dateColumns = useMemo(
    () => columns.filter((c) => c.type === "date"),
    [columns]
  );

  useEffect(() => {
    let mounted = true;
    if (!boardId) return;

    (async () => {
      const [cols, its, savedCol, savedItem] = await Promise.all([
        fetchBoardColumns(boardId),
        fetchBoardItems(boardId, 200),
        storage.getDateColumnId(),
        storage.getSelectedItemId(),
      ]);

      if (!mounted) return;

      setColumns(cols);
      setItems(its);
      if (savedCol) setDateColumnId(String(savedCol));
      if (savedItem) setSelectedItemId(String(savedItem));
    })();

    return () => {
      mounted = false;
    };
  }, [boardId]);

  const saveDateColumn = async (val) => {
    setDateColumnId(val);
    await storage.setDateColumnId(val || null);
  };

  const saveItem = async (val) => {
    setSelectedItemId(val);
    await storage.setSelectedItemId(val || null);
  };

  return (
    <div style={{ padding: 12, fontFamily: "system-ui" }}>
      <h3 style={{ margin: "0 0 12px" }}>Widget Settings</h3>

      {!boardId && (
        <div style={{ color: "#b00020" }}>
          No board in context. Please connect at least one board to this dashboard widget.
        </div>
      )}

      <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Date column</span>
          <select value={dateColumnId} onChange={(e) => saveDateColumn(e.target.value)}>
            <option value="">Select date column…</option>
            {dateColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.id})
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Deadline item</span>
          <select value={selectedItemId} onChange={(e) => saveItem(e.target.value)}>
            <option value="">Select item…</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </label>

        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.4 }}>
          After selecting both, exit Settings to see the deadline in the widget.
        </div>
      </div>
    </div>
  );
}