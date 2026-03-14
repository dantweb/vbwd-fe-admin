import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

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
      templates.value = await api.get<EmailTemplate[]>('/admin/email/templates')
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load templates'
    } finally {
      loading.value = false
    }
  }

  async function fetchTemplate(id: string): Promise<EmailTemplate | null> {
    try {
      return await api.get<EmailTemplate>(`/admin/email/templates/${id}`)
    } catch {
      return null
    }
  }

  async function saveTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    try {
      const saved = await api.put<EmailTemplate>(`/admin/email/templates/${id}`, data)
      const idx = templates.value.findIndex(t => t.id === id)
      if (idx !== -1) templates.value[idx] = saved
      return saved
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Save failed'
      return null
    }
  }

  async function fetchEventTypes(): Promise<void> {
    try {
      eventTypes.value = await api.get<EventTypeInfo[]>('/admin/email/event-types')
    } catch {
      // non-fatal
    }
  }

  async function renderPreview(
    eventType: string,
    context: Record<string, unknown>
  ): Promise<{ subject: string; html_body: string; text_body: string } | null> {
    try {
      return await api.post<{ subject: string; html_body: string; text_body: string }>(
        '/admin/email/templates/preview',
        { event_type: eventType, context }
      )
    } catch {
      return null
    }
  }

  async function createTemplate(data: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    try {
      const created = await api.post<EmailTemplate>('/admin/email/templates', data)
      templates.value.push(created)
      return created
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Create failed'
      return null
    }
  }

  async function deleteTemplate(id: string): Promise<boolean> {
    try {
      await api.delete(`/admin/email/templates/${id}`)
      templates.value = templates.value.filter(t => t.id !== id)
      return true
    } catch {
      return false
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
    createTemplate,
    saveTemplate,
    deleteTemplate,
    fetchEventTypes,
    renderPreview,
    sendTest,
  }
})
