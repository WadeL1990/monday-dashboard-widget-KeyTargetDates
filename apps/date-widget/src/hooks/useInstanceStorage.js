import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

const KEY_SELECTED_ITEM = "selectedItemId";
const KEY_DATE_COLUMN = "dateColumnId";

export function useInstanceStorage() {
  const getSelectedItemId = async () => {
    const res = await monday.storage.instance.getItem(KEY_SELECTED_ITEM);
    return res?.data?.value ?? res?.value ?? null;
  };

  const setSelectedItemId = async (itemId) => {
    await monday.storage.instance.setItem(KEY_SELECTED_ITEM, itemId ? String(itemId) : null);
  };

  const getDateColumnId = async () => {
    const res = await monday.storage.instance.getItem(KEY_DATE_COLUMN);
    return res?.data?.value ?? res?.value ?? null;
  };

  const setDateColumnId = async (columnId) => {
    await monday.storage.instance.setItem(KEY_DATE_COLUMN, columnId ? String(columnId) : null);
  };

  return {
    getSelectedItemId,
    setSelectedItemId,
    getDateColumnId,
    setDateColumnId,
  };
}