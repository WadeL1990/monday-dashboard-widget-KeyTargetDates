import { useEffect, useMemo, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

/**
 * 你的 settings schema（你提供的）：
 * {
 *   settings: {
 *     text: "",
 *     columnsPerBoard: {},
 *     dropdown: null
 *   }
 * }
 */
function normalizeSettings(res) {
  const data = res?.data ?? res ?? {};
  const settings =
    data?.settings && typeof data.settings === "object" ? data.settings : data;

  const text =
    typeof settings.text === "string" ? settings.text.trim() : "";

  const columnsPerBoard =
    settings.columnsPerBoard && typeof settings.columnsPerBoard === "object"
      ? settings.columnsPerBoard
      : {};

  // dropdown：日期格式（你新增的 dropdown 設定欄位）
  // 若尚未選，預設 YMD
  const dateFormat =
    typeof settings.dropdown === "string" && settings.dropdown.trim() !== ""
      ? settings.dropdown.trim()
      : "YMD";

  // 從 columnsPerBoard 取第一個 boardId 的第一個 columnId
  let dateColumnId = null;
  const boardIds = Object.keys(columnsPerBoard);
  if (boardIds.length > 0) {
    const firstBoardId = boardIds[0];
    const cols = columnsPerBoard[firstBoardId];
    if (Array.isArray(cols) && cols.length > 0) {
      dateColumnId = String(cols[0]);
    }
  }

  const selectedItemId = text !== "" ? text : null;

  return {
    selectedItemId,
    dateColumnId,
    dateFormat,
    settingsRaw: settings,
    columnsPerBoard,
  };
}

export function useMondaySettings() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初次讀取
    monday.get("settings").then((res) => {
      setRaw(res);
      setLoading(false);

      // debug（可留著，也可之後刪）
      window.__WIDGET_DEBUG__ = window.__WIDGET_DEBUG__ || {};
      window.__WIDGET_DEBUG__.settings_get = res?.data ?? res;
    });

    // 監聽 settings 變更（官方支援）[1](https://developer.monday.com/apps/docs/mondaylisten)
    const unsubscribe = monday.listen("settings", (res) => {
      setRaw(res);

      window.__WIDGET_DEBUG__ = window.__WIDGET_DEBUG__ || {};
      window.__WIDGET_DEBUG__.settings_listen = res?.data ?? res;
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  return useMemo(() => {
    const parsed = normalizeSettings(raw);
    return { ...parsed, loading };
  }, [raw, loading]);
}