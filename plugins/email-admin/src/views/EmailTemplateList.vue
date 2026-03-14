<template>
  <div class="email-template-list">
    <div class="list-header">
      <h1>Email Templates</h1>
    </div>

    <div v-if="store.loading" class="loading">Loading…</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <div v-else-if="store.templates.length === 0" class="empty">
      No templates found. Run <code>seed_email_templates</code> to create defaults.
    </div>
    <table v-else class="templates-table">
      <thead>
        <tr>
          <th>Event Type</th>
          <th>Subject</th>
          <th>Active</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tpl in store.templates" :key="tpl.id">
          <td class="event-type">{{ tpl.event_type }}</td>
          <td>{{ tpl.subject }}</td>
          <td>
            <span :class="['badge', tpl.is_active ? 'badge-active' : 'badge-inactive']">
              {{ tpl.is_active ? 'Active' : 'Inactive' }}
            </span>
          </td>
          <td>{{ formatDate(tpl.updated_at) }}</td>
          <td>
            <router-link :to="`/admin/email/templates/${tpl.id}/edit`" class="btn-edit">
              Edit
            </router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useEmailStore } from '../stores/useEmailStore'

const store = useEmailStore()

onMounted(() => {
  store.fetchTemplates()
})

function formatDate(iso: string): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}
</script>

<style scoped>
.email-template-list {
  padding: 24px;
}
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}
.templates-table {
  width: 100%;
  border-collapse: collapse;
}
.templates-table th,
.templates-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid #eee;
}
.templates-table th {
  font-weight: 600;
  background: #fafafa;
}
.event-type {
  font-family: monospace;
  font-size: 13px;
  color: #555;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.badge-active {
  background: #d4f0dc;
  color: #1e7e34;
}
.badge-inactive {
  background: #f0d4d4;
  color: #7e1e1e;
}
.btn-edit {
  color: #3498db;
  text-decoration: none;
  font-size: 14px;
}
.btn-edit:hover {
  text-decoration: underline;
}
.loading,
.empty,
.error {
  padding: 32px;
  text-align: center;
  color: #888;
}
.error {
  color: #e74c3c;
}
</style>
