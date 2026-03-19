import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

export async function fetchBoardColumns(boardId) {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns { id title type }
      }
    }
  `;
  const res = await monday.api(query, { variables: { boardId } });
  return res?.data?.boards?.[0]?.columns ?? [];
}

export async function fetchBoardItems(boardId, limit = 200) {
  const query = `
    query ($boardId: ID!, $limit: Int) {
      boards(ids: [$boardId]) {
        items_page(limit: $limit) {
          items { id name }
        }
      }
    }
  `;
  const res = await monday.api(query, { variables: { boardId, limit } });
  return res?.data?.boards?.[0]?.items_page?.items ?? [];
}

/**
 * 取單一 item 某 column 的 text（date column 的 text 通常是 YYYY-MM-DD 或本地化格式）
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