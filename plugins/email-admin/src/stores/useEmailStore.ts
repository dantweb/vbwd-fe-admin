import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../../../vue/src/api/index'

export interface EmailTemplate {
  id: string
  event_type: string
  subject: string
  html_body: string
  text_body: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EventTypeInfo {
  event_type: string
  description: string
  variables: Record<string, { type: string; description: string; example: unknown }>
}

export const useEmailStore = defineStore('email', () => {
  const templates = ref<EmailTemplate[]>([])
  const eventTypes = ref<EventTypeInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTemplates(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<EmailTemplate[]>('/admin/email/templates')
      templates.value = res.data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load templates'
    } finally {
      loading.value = false
    }
  }

  async function fetchTemplate(id: string): Promise<EmailTemplate | null> {
    try {
      const res = await api.get<EmailTemplate>(`/admin/email/templates/${id}`)
      return res.data
    } catch {
      return null
    }
  }

  async function saveTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    try {
      const res = await api.put<EmailTemplate>(`/admin/email/templates/${id}`, data)
      const idx = templates.value.findIndex(t => t.id === id)
      if (idx !== -1) templates.value[idx] = res.data
      return res.data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Save failed'
      return null
    }
  }

  async function fetchEventTypes(): Promise<void> {
    try {
      const res = await api.get<EventTypeInfo[]>('/admin/email/event-types')
      eventTypes.value = res.data
    } catch {
      // non-fatal
    }
  }

  async function renderPreview(
    eventType: string,
    context: Record<string, unknown>
  ): Promise<{ subject: string; html_body: string; text_body: string } | null> {
    try {
      const res = await api.post<{ subject: string; html_body: string; text_body: string }>(
        '/admin/email/templates/preview',
        { event_type: eventType, context }
      )
      return res.data
    } catch {
      return null
    }
  }

  async function sendTest(eventType: string, toAddress: string): Promise<boolean> {
    try {
      await api.post('/admin/email/test-send', {
        event_type: eventType,
        to_address: toAddress,
      })
      return true
    } catch {
      return false
    }
  }

  return {
    templates,
    eventTypes,
    loading,
    error,
    fetchTemplates,
    fetchTemplate,
    saveTemplate,
    fetchEventTypes,
    renderPreview,
    sendTest,
  }
})
