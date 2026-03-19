import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

/**
 * 讀取 formula column 的計算結果（display_value）
 * 需要 Platform API 版本 2025-01+ 才支援 [1](https://support.monday.com/hc/en-us/articles/360000225709-Where-to-find-board-ID-item-ID-and-column-ID)
 */
export async function fetchFormulaDisplayValue(itemId, formulaColumnId) {
  const query = `
    query ($itemId: ID!) {
      items(ids: [$itemId]) {
        column_values {
          id
          ... on FormulaValue {
            display_value
          }
        }
      }
    }
  `;
  const res = await monday.api(query, { variables: { itemId } });
  const cvs = res?.data?.items?.[0]?.column_values ?? [];
  const hit = cvs.find((c) => c.id === formulaColumnId);
  return hit?.display_value ?? null; // e.g. "63.4"
}
