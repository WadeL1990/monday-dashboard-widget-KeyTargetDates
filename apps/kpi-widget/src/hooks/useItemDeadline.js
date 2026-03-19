import { useEffect, useState } from "react";
import { fetchItemColumnText } from "../api/mondayApi.js";

export function useItemDeadline(itemId, dateColumnId) {
  const [deadlineText, setDeadlineText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    if (!itemId || !dateColumnId) {
      setDeadlineText(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchItemColumnText(itemId, dateColumnId)
      .then((text) => {
        if (!mounted) return;
        setDeadlineText(text ?? null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(String(e));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [itemId, dateColumnId]);

  return { deadlineText, loading, error };
}