import { useEffect, useMemo, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

/**
 * ⚠️ 若你在 Developer Center 設定的 key/name 不同，只改這裡：
 */
const SETTINGS_KEYS = {
  itemId: "itemId",        // Text field key
  dateColumn: "dateColumn" // Columns field key
};

function parseSettings(raw) {
  const data = raw?.data ?? raw ?? {};

  const itemIdRaw = data?.[SETTINGS_KEYS.itemId];
  const dateColRaw = data?.[SETTINGS_KEYS.dateColumn];

  // Text 欄位：通常就是字串
  const selectedItemId =
    itemIdRaw == null || String(itemIdRaw).trim() === ""
      ? null
      : String(itemIdRaw).trim();

  /**
   * Columns 欄位：回傳格式可能因平台/欄位而異，所以做容錯：
   * - "dateColId"
   * - ["dateColId"]
   * - { id: "dateColId" }
   * - { "<boardId>": ["dateColId"] }
   */
  let dateColumnId = null;
  if (typeof dateColRaw === "string") {
    dateColumnId = dateColRaw;
  } else if (Array.isArray(dateColRaw)) {
    dateColumnId = dateColRaw[0] ? String(dateColRaw[0]) : null;
  } else if (dateColRaw && typeof dateColRaw === "object") {
    if (dateColRaw.id) {
      dateColumnId = String(dateColRaw.id);
    } else {
      const firstKey = Object.keys(dateColRaw)[0];
      const maybeArr = firstKey ? dateColRaw[firstKey] : null;
      if (Array.isArray(maybeArr) && maybeArr[0]) dateColumnId = String(maybeArr[0]);
    }
  }

  return { selectedItemId, dateColumnId, raw: data };
}

export function useMondaySettings() {
  const [rawSettings, setRawSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初次取得
    monday.get("settings").then((res) => {
      setRawSettings(res);
      setLoading(false);
    });

    // 監聽右側面板變更（官方支援）[2](https://community.make.com/t/updating-connected-column-on-a-sub-item-on-monday-com/37216)
    const unsubscribe = monday.listen("settings", (res) => {
      setRawSettings(res);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const parsed = useMemo(() => parseSettings(rawSettings), [rawSettings]);
  return { ...parsed, loading };
}