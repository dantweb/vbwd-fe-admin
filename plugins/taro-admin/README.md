# Taro Admin Plugin (vbwd-fe-admin)

Taro tarot reading platform — admin extension for user detail pages.

## Purpose

Adds a "Taro Sessions" tab to the User Details page in the admin backoffice, showing session history, token usage, and arcana interpretation logs for each user.

## Backend Counterpart

`vbwd-backend/plugins/taro/`

## Extension Point

Registers a section in the User Details view via `extensionRegistry`:
- Component: `TaroAdminUserDetail.vue`
- Section label: "Taro Sessions"

## Testing

```bash
cd vbwd-fe-admin
./bin/pre-commit-check.sh --unit
```
