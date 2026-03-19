import { useEffect, useState } from "react";
import { fetchFormulaDisplayValue } from "../api/mondayApi.js";

export function useFormulaKpi(itemId, formulaColumnId) {
  const [value, setValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    if (!itemId || !formulaColumnId) {
      setValue(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchFormulaDisplayValue(itemId, formulaColumnId)
      .then((v) => mounted && setValue(v))
      .catch((e) => mounted && setError(String(e)))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [itemId, formulaColumnId]);

  return { value, loading, error };
}