import { useEffect, useMemo, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

/**
 * 必須和 Developer Center → Settings fields 的 key 一模一樣
 */
const SETTINGS_KEYS = {
  itemId: "itemId",        // Text field
  dateColumn: "dateColumn" // Columns field
};

function parseSettings(raw) {
  const data = raw?.data ?? raw ?? {};

  /**
   * ✅ Text field 真正的值在 .value
   */
  const itemIdObj = data?.[SETTINGS_KEYS.itemId];
  const selectedItemId =
    itemIdObj && typeof itemIdObj === "object" && itemIdObj.value
      ? String(itemIdObj.value).trim()
      : null;

  /**
   * ✅ Columns field 的實際結構
   * 常見格式：
   * {
   *   boardId: "123",
   *   columnId: "date"
   * }
   */
  const dateColObj = data?.[SETTINGS_KEYS.dateColumn];
  const dateColumnId =
    dateColObj && typeof dateColObj === "object" && dateColObj.columnId
      ? String(dateColObj.columnId)
      : null;

  return {
    selectedItemId,
    dateColumnId,
    raw: data
  };
}

export function useMondaySettings() {
  const [rawSettings, setRawSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初次載入
    monday.get("settings").then((res) => {
      setRawSettings(res);
      setLoading(false);
    });

    // 監聽右側 Settings 面板變更（官方支援）
    const unsubscribe = monday.listen("settings", (res) => {
      setRawSettings(res);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  return useMemo(() => {
    const parsed = parseSettings(rawSettings);
    return { ...parsed, loading };
  }, [rawSettings, loading]);
}
``