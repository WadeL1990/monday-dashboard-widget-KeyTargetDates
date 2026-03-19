import { useEffect, useMemo, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

function normalizeSettingsPayload(res) {
  // monday.get / monday.listen 回傳通常是 { data: ... }
  const data = res?.data ?? res ?? {};

  // 你在 Developer Center 看到的是 {"settings":{...}}，所以優先取 data.settings
  const settings = data?.settings && typeof data.settings === "object" ? data.settings : data;

  // Text field：你貼的規格是 settings.text 字串
  const text = typeof settings.text === "string" ? settings.text.trim() : "";

  // Columns field：你貼的規格是 settings.columnsPerBoard 物件
  const columnsPerBoard =
    settings.columnsPerBoard && typeof settings.columnsPerBoard === "object"
      ? settings.columnsPerBoard
      : {};

  // 從 columnsPerBoard 取出第一個 boardId 的第一個 columnId
  // （Dashboard 若只連一個 board，這就是你要的）
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
    settingsRaw: settings,
    columnsPerBoard,
  };
}

export function useMondaySettings() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初次取得 settings
    monday.get("settings").then((res) => {
      setRaw(res);
      setLoading(false);

      // debug：需要時可在 console 看
      window.__WIDGET_DEBUG__ = window.__WIDGET_DEBUG__ || {};
      window.__WIDGET_DEBUG__.settings_get = res?.data ?? res;
    });

    // 監聽 settings 變更（使用者在右側面板修改會觸發）[1](https://developer.monday.com/apps/docs/mondaylisten)
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
    const parsed = normalizeSettingsPayload(raw);
    return { ...parsed, loading };
  }, [raw, loading]);
}
