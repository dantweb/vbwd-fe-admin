<template>
  <div class="email-template-edit">
    <div class="edit-header">
      <router-link to="/admin/email/templates" class="back-link">← Email Templates</router-link>
      <h1 v-if="template">{{ template.event_type }}</h1>
    </div>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="!template" class="error">Template not found.</div>

    <template v-else>
      <div v-if="!template.is_active" class="inactive-warning">
        This template is inactive — no emails will be sent for this event.
      </div>

      <!-- Subject line + active toggle -->
      <div class="field-row">
        <div class="field field-subject">
          <label>Subject <span class="hint">(Jinja2 template)</span></label>
          <input v-model="form.subject" type="text" class="input-subject" />
        </div>
        <div class="field field-active">
          <label>Active</label>
          <input type="checkbox" v-model="form.is_active" />
        </div>
      </div>

      <!-- Tab editor -->
      <div class="tabs">
        <button
          v-for="tab in ['html', 'text', 'preview']"
          :key="tab"
          :class="['tab-btn', { active: activeTab === tab }]"
          @click="switchTab(tab)"
        >
          {{ tabLabel(tab) }}
        </button>
      </div>

      <div class="tab-content">
        <!-- HTML tab -->
        <div v-show="activeTab === 'html'" class="editor-wrap">
          <textarea
            v-model="form.html_body"
            class="code-editor"
            spellcheck="false"
            placeholder="Enter HTML template…"
          />
        </div>

        <!-- Plain text tab -->
        <div v-show="activeTab === 'text'" class="editor-wrap">
          <textarea
            v-model="form.text_body"
            class="code-editor code-editor--text"
            spellcheck="false"
            placeholder="Enter plain text template…"
          />
        </div>

        <!-- Preview tab -->
        <div v-show="activeTab === 'preview'" class="preview-wrap">
          <div class="preview-controls">
            <button class="btn btn-secondary" @click="loadPreview">Refresh Preview</button>
          </div>
          <div v-if="preview" class="preview-subject">
            <strong>Subject:</strong> {{ preview.subject }}
          </div>
          <iframe
            v-if="preview"
            :srcdoc="preview.html_body"
            class="preview-frame"
            sandbox="allow-same-origin"
          />
          <p v-else class="preview-hint">Click "Refresh Preview" to render with example data.</p>
        </div>
      </div>

      <!-- Variables reference -->
      <div v-if="eventInfo" class="variables-panel">
        <h3>Available Variables</h3>
        <table class="vars-table">
          <thead>
            <tr><th>Variable</th><th>Type</th><th>Example</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr v-for="(info, name) in eventInfo.variables" :key="name">
              <td class="var-name">{{ '{{ ' + name + ' }}' }}</td>
              <td>{{ info.type }}</td>
              <td>{{ info.example }}</td>
              <td>{{ info.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <span v-if="savedMsg" class="saved-msg">{{ savedMsg }}</span>

        <div class="test-send">
          <input v-model="testEmail" type="email" placeholder="test@example.com" class="input-email" />
          <button class="btn btn-secondary" :disabled="!testEmail" @click="sendTest">
            Send Test
          </button>
          <span v-if="testMsg" class="saved-msg">{{ testMsg }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useEmailStore } from '../stores/useEmailStore'

const route = useRoute()
const store = useEmailStore()

const loading = ref(true)
const saving = ref(false)
const savedMsg = ref('')
const testMsg = ref('')
const testEmail = ref('')
const activeTab = ref<'html' | 'text' | 'preview'>('html')
const preview = ref<{ subject: string; html_body: string; text_body: string } | null>(null)

interface FormData {
  subject: string
  html_body: string
  text_body: string
  is_active: boolean
}
const template = ref<import('../stores/useEmailStore').EmailTemplate | null>(null)
const form = ref<FormData>({ subject: '', html_body: '', text_body: '', is_active: true })

const eventInfo = computed(() =>
  store.eventTypes.find(e => e.event_type === template.value?.event_type)
)

onMounted(async () => {
  await store.fetchEventTypes()
  const id = route.params.id as string
  const tpl = await store.fetchTemplate(id)
  if (tpl) {
    template.value = tpl
    form.value = {
      subject: tpl.subject,
      html_body: tpl.html_body,
      text_body: tpl.text_body,
      is_active: tpl.is_active,
    }
  }
  loading.value = false
})

function tabLabel(tab: string): string {
  return { html: 'HTML', text: 'Plain Text', preview: 'Preview' }[tab] ?? tab
}

function switchTab(tab: string) {
  activeTab.value = tab as 'html' | 'text' | 'preview'
}

async function loadPreview() {
  if (!template.value) return
  const info = eventInfo.value
  const ctx = info
    ? Object.fromEntries(
        Object.entries(info.variables).map(([k, v]) => [k, v.example])
      )
    : {}
  preview.value = await store.renderPreview(template.value.event_type, ctx)
}

async function save() {
  if (!template.value) return
  saving.value = true
  savedMsg.value = ''
  const result = await store.saveTemplate(template.value.id, form.value)
  saving.value = false
  if (result) {
    template.value = result
    savedMsg.value = 'Saved'
    setTimeout(() => { savedMsg.value = '' }, 3000)
  }
}

async function sendTest() {
  if (!template.value || !testEmail.value) return
  testMsg.value = ''
  const ok = await store.sendTest(template.value.event_type, testEmail.value)
  testMsg.value = ok ? `Test sent to ${testEmail.value}` : 'Send failed'
  setTimeout(() => { testMsg.value = '' }, 4000)
}
</script>

<style scoped>
.email-template-edit {
  padding: 24px;
  max-width: 1000px;
}
.edit-header {
  margin-bottom: 20px;
}
.back-link {
  font-size: 13px;
  color: #3498db;
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
}
h1 {
  font-size: 1.3rem;
  font-weight: 600;
  font-family: monospace;
  margin: 0;
}
.inactive-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #856404;
}
.field-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: flex-end;
}
.field-subject { flex: 1; }
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
label {
  font-size: 13px;
  font-weight: 600;
  color: #444;
}
.hint {
  font-weight: 400;
  color: #999;
  font-size: 11px;
}
.input-subject {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
}
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #eee;
  margin-bottom: 0;
}
.tab-btn {
  padding: 8px 18px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}
.tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
  font-weight: 600;
}
.tab-content {
  border: 1px solid #eee;
  border-top: none;
  border-radius: 0 0 4px 4px;
  min-height: 300px;
}
.editor-wrap {
  padding: 0;
}
.code-editor {
  width: 100%;
  min-height: 320px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  padding: 14px;
  border: none;
  outline: none;
  resize: vertical;
  background: #1e1e2e;
  color: #cdd6f4;
  box-sizing: border-box;
}
.code-editor--text {
  background: #282c34;
  color: #abb2bf;
}
.preview-wrap {
  padding: 14px;
}
.preview-controls {
  margin-bottom: 10px;
}
.preview-subject {
  font-size: 14px;
  margin-bottom: 10px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
}
.preview-frame {
  width: 100%;
  height: 480px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.preview-hint {
  color: #888;
  font-size: 14px;
  text-align: center;
  padding: 40px;
}
.variables-panel {
  margin-top: 24px;
}
.variables-panel h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}
.vars-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.vars-table th,
.vars-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #eee;
  text-align: left;
}
.vars-table th { background: #fafafa; font-weight: 600; }
.var-name { font-family: monospace; color: #3498db; }
.actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  flex-wrap: wrap;
}
.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
.btn-primary {
  background: #3498db;
  color: white;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: #ecf0f1;
  color: #333;
}
.test-send {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.input-email {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 220px;
}
.saved-msg {
  font-size: 13px;
  color: #27ae60;
}
.loading, .error {
  padding: 32px;
  text-align: center;
  color: #888;
}
.error { color: #e74c3c; }
</style>
