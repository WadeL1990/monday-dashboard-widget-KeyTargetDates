import React, { useMemo } from "react";
import { useMondaySettings } from "../hooks/useMondaySettings.js";
import { useFormulaKpi } from "../hooks/useFormulaKpi.js";

export default function FormulaKpiDisplay() {
  const { selectedItemId, dateColumnId, loading } = useMondaySettings();

  // 注意：沿用你的 useMondaySettings 命名
  // 在 KPI widget 這裡，dateColumnId 實際上代表「使用者在 Columns 選到的欄位」
  const formulaColumnId = dateColumnId;

  const { value, loading: loadingKpi, error } = useFormulaKpi(
    selectedItemId,
    formulaColumnId
  );

  const display = useMemo(() => {
    if (!value) return "—";
    // 你要的超簡版：固定顯示 XX%
    return `${value}%`;
  }, [value]);

  if (loading || loadingKpi) {
    return (
      <>
        <div className="center">
          <div className="value">Loading…</div>
        </div>
        <Style />
      </>
    );
  }

  if (!selectedItemId || !formulaColumnId) {
    return (
      <>
        <div className="center">
          <div className="value">—</div>
          <div className="hint">
            Open widget Settings to select item &amp; formula column.
          </div>
        </div>
        <Style />
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="center">
          <div className="value">Error</div>
        </div>
        <Style />
      </>
    );
  }

  return (
    <>
      <div className="center">
        <div className="value">{display}</div>
      </div>
      <Style />
    </>
  );
}

function Style() {
  return (
    <style>{`
      html, body, #root {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden; /* 不要滾動條 */
        font-family: system-ui;
      }

      .center {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        text-align: center;
        pointer-events: none;
      }

      .value {
        font-size: clamp(18px, 6.5vw, 36px);
        font-weight: 600;
        letter-spacing: .4px;
        color: #111;
        white-space: nowrap;
      }

      .hint {
        margin-top: 8px;
        font-size: 12px;
        opacity: .7;
        color: #111;
      }

      @media (prefers-color-scheme: dark) {
        .value, .hint { color: #fff; }
      }
    `}</style>
  );
}