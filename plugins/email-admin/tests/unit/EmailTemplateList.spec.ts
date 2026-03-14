import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EmailTemplateList from '../../src/views/EmailTemplateList.vue'

vi.mock('../../src/stores/useEmailStore', () => ({
  useEmailStore: vi.fn(),
}))

import { useEmailStore } from '../../src/stores/useEmailStore'

const mockRouterLink = {
  template: '<a><slot /></a>',
  props: ['to'],
}

function mountList(storeOverrides = {}) {
  const store = {
    templates: [],
    loading: false,
    error: null,
    fetchTemplates: vi.fn(),
    ...storeOverrides,
  }
  vi.mocked(useEmailStore).mockReturnValue(store as never)

  return mount(EmailTemplateList, {
    global: {
      stubs: { RouterLink: mockRouterLink },
    },
  })
}

describe('EmailTemplateList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('calls fetchTemplates on mount', () => {
    const store = { templates: [], loading: false, error: null, fetchTemplates: vi.fn() }
    vi.mocked(useEmailStore).mockReturnValue(store as never)
    mount(EmailTemplateList, { global: { stubs: { RouterLink: mockRouterLink } } })
    expect(store.fetchTemplates).toHaveBeenCalledOnce()
  })

  it('shows loading state', () => {
    const wrapper = mountList({ loading: true })
    expect(wrapper.text()).toContain('Loading')
  })

  it('shows error state', () => {
    const wrapper = mountList({ error: 'Network error' })
    expect(wrapper.text()).toContain('Network error')
  })

  it('shows empty state when no templates', () => {
    const wrapper = mountList({ templates: [] })
    expect(wrapper.text()).toContain('No templates found')
  })

  it('renders template rows', () => {
    const wrapper = mountList({
      templates: [
        {
          id: 'abc',
          event_type: 'subscription.activated',
          subject: 'Hello {{ user_name }}',
          is_active: true,
          updated_at: '2026-03-14T10:00:00',
        },
      ],
    })
    expect(wrapper.text()).toContain('subscription.activated')
    expect(wrapper.text()).toContain('Hello {{ user_name }}')
    expect(wrapper.text()).toContain('Active')
  })

  it('shows inactive badge for inactive template', () => {
    const wrapper = mountList({
      templates: [
        {
          id: 'xyz',
          event_type: 'user.registered',
          subject: 'Welcome',
          is_active: false,
          updated_at: '2026-03-14T10:00:00',
        },
      ],
    })
    expect(wrapper.text()).toContain('Inactive')
  })
})
