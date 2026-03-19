import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

export function useMondayContext() {
  const [loading, setLoading] = useState(true);
  const [isSettings, setIsSettings] = useState(false);
  const [boardId, setBoardId] = useState(null);

  useEffect(() => {
    let mounted = true;

    monday
      .get("context")
      .then((res) => {
        const ctx = res?.data ?? res;
        if (!mounted) return;

        setIsSettings(ctx?.mode === "settings");
        // Dashboard widget context 常見會有 boardId 或 boardIds（依你的環境而定）
        const bid = ctx?.boardId ?? (Array.isArray(ctx?.boardIds) ? ctx.boardIds[0] : null);
        setBoardId(bid ? Number(bid) : null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { loading, isSettings, boardId };
}