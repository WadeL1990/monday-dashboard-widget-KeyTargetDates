# activity-log-sync (Vercel serverless)

A minimal webhook handler that:
1) Queries monday board activity_logs (id/event/data) for a given item+column
2) Formats the latest change into a single text line
3) Appends it into a Text/LongText column
4) Stores the last processed activity log id to dedupe

## Environment variables (Vercel Project)
- MONDAY_TOKEN (required)
- ALS_SECRET (optional) - enables signature verification (x-als-signature header)

## Endpoint
POST /api/activity-log-sync
Body:
{
  "boardId": "123",
  "itemId": "456",
  "columnId": "status",
  "logColumnId": "long_text_log",
  "lastIdColumnId": "text_last_id"
}

## Health check
GET /api/health