import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

/**
 * 取得單一 item 的 column_values，再從中取出指定 columnId 的 text。
 * Date column 的 text 通常會回傳已格式化字串（例如 2026-03-30）。
 */
export async function fetchItemColumnText(itemId, columnId) {
  const query = `
    query ($itemId: ID!) {
      items(ids: [$itemId]) {
        column_values { id text }
      }
    }
  `;

  const res = await monday.api(query, { variables: { itemId } });
  const cvs = res?.data?.items?.[0]?.column_values ?? [];
  const hit = cvs.find((c) => c.id === columnId);
  return hit?.text ?? null;
}