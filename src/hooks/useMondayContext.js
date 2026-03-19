import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

export function useMondayContext() {
  const [loading, setLoading] = useState(true);
  const [isSettings, setIsSettings] = useState(false);
  const [boardId, setBoardId] = useState(null);

  useEffect(() => {
    // ✅ 先抓一次初始 context
    monday.get("context").then((res) => {
      const ctx = res.data ?? res;
      setIsSettings(ctx?.mode === "settings");
      setBoardId(ctx?.boardId ?? null);
      setLoading(false);
    });

    // ✅ 關鍵：監聽 mode 切換
    monday.listen("context", (res) => {
      const ctx = res.data ?? res;
      setIsSettings(ctx?.mode === "settings");
      setBoardId(ctx?.boardId ?? null);
    });
  }, []);

  return { loading, isSettings, boardId };
}
``