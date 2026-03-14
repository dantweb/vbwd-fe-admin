# Analytics Widget Plugin (vbwd-fe-admin)

Dashboard analytics widget showing key platform metrics.

## Purpose

Adds a summary analytics widget to the admin dashboard: active subscriptions, revenue this month, new signups, and token usage overview.

## Backend Counterpart

`vbwd-backend/plugins/analytics/` (if present) or core `/api/v1/admin/analytics` endpoint.

## Extension Point

Registers `AnalyticsWidget.vue` as a dashboard widget via the plugin system.

## Testing

```bash
cd vbwd-fe-admin
./bin/pre-commit-check.sh --unit
```
