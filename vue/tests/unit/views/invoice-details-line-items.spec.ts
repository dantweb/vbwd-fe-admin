/**
 * Tests for invoice line item click navigation.
 *
 * Key design: the backend returns TWO id fields per line item:
 *   item_id         — the purchase record UUID (subscription, token_bundle_purchase, addon_sub)
 *   catalog_item_id — the catalog entity UUID (tarif_plan, token_bundle, addon)
 *
 * itemLink() MUST use catalog_item_id for SUBSCRIPTION and TOKEN_BUNDLE navigation,
 * NOT item_id. Using item_id returns 404 because the plan endpoint expects a plan UUID.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Pinia } from 'pinia'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: { id: 'inv-1' } }),
  RouterLink: { template: '<a><slot /></a>', props: ['to'] },
}))

// Reference implementation of itemLink (matches InvoiceDetails.vue)
function itemLink(item: {
  type?: string
  item_id?: string
  catalog_item_id?: string
}): string | null {
  switch (item.type?.toUpperCase()) {
    case 'SUBSCRIPTION':
      return item.catalog_item_id ? `/admin/plans/${item.catalog_item_id}/edit` : null
    case 'TOKEN_BUNDLE':
      return item.catalog_item_id
        ? `/admin/settings/token-bundles/${item.catalog_item_id}`
        : null
    case 'ADD_ON':
      return '/admin/add-ons'
    default:
      return null
  }
}

// Mock store
const mockFetchInvoice = vi.fn()
let mockInvoice: Record<string, unknown> | null = null

vi.mock('@/stores/invoices', () => ({
  useInvoicesStore: () => ({
    get selectedInvoice() { return mockInvoice },
    loading: false,
    error: null,
    fetchInvoice: mockFetchInvoice,
    resendInvoice: vi.fn(),
    voidInvoice: vi.fn(),
    markPaid: vi.fn(),
    refundInvoice: vi.fn(),
    duplicateInvoice: vi.fn(),
  }),
}))

import InvoiceDetails from '../../../src/views/InvoiceDetails.vue'

const mockLineItemBase = {
  id: 'item-1',
  description: 'Pro Plan - Monthly',
  quantity: 1,
  unit_price: 29.99,
  amount: 29.99,
}

function mountView() {
  return mount(InvoiceDetails, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>', props: ['to'] } },
      mocks: { $t: (k: string) => k },
    },
  })
}

describe('itemLink logic — uses catalog_item_id not item_id', () => {
  it('SUBSCRIPTION uses catalog_item_id (plan UUID) → /admin/plans/:planId/edit', () => {
    expect(itemLink({
      type: 'SUBSCRIPTION',
      item_id: 'subscription-uuid-111',
      catalog_item_id: 'plan-uuid-999',
    })).toBe('/admin/plans/plan-uuid-999/edit')
  })

  it('SUBSCRIPTION without catalog_item_id → null (not clickable)', () => {
    expect(itemLink({ type: 'SUBSCRIPTION', item_id: 'subscription-uuid-111' })).toBeNull()
  })

  it('lowercase subscription → same result (case insensitive)', () => {
    expect(itemLink({
      type: 'subscription',
      item_id: 'subscription-uuid-111',
      catalog_item_id: 'plan-uuid-999',
    })).toBe('/admin/plans/plan-uuid-999/edit')
  })

  it('TOKEN_BUNDLE uses catalog_item_id (bundle UUID)', () => {
    expect(itemLink({
      type: 'TOKEN_BUNDLE',
      item_id: 'purchase-uuid-222',
      catalog_item_id: 'bundle-uuid-888',
    })).toBe('/admin/settings/token-bundles/bundle-uuid-888')
  })

  it('TOKEN_BUNDLE without catalog_item_id → null', () => {
    expect(itemLink({ type: 'TOKEN_BUNDLE', item_id: 'purchase-uuid-222' })).toBeNull()
  })

  it('ADD_ON → /admin/add-ons (no ID needed)', () => {
    expect(itemLink({ type: 'ADD_ON', item_id: 'addon-sub-333' })).toBe('/admin/add-ons')
  })

  it('add_on lowercase → same path', () => {
    expect(itemLink({ type: 'add_on', item_id: 'addon-sub-333' })).toBe('/admin/add-ons')
  })

  it('unknown type → null', () => {
    expect(itemLink({ type: 'UNKNOWN', catalog_item_id: 'some-id' })).toBeNull()
  })
})

describe('InvoiceDetails row click — uses catalog_item_id', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    mockInvoice = null
  })

  it('clicking SUBSCRIPTION row navigates to plan edit using catalog_item_id', async () => {
    mockInvoice = {
      id: 'inv-1',
      invoice_number: 'INV-001',
      status: 'PAID',
      amount: 29.99,
      currency: 'USD',
      created_at: '2026-01-01',
      user_email: 'test@example.com',
      user_name: 'Test User',
      line_items: [
        {
          ...mockLineItemBase,
          type: 'SUBSCRIPTION',
          item_id: 'subscription-uuid-111',
          catalog_item_id: 'plan-uuid-999',
        },
      ],
    }
    mockFetchInvoice.mockResolvedValue(undefined)

    const wrapper = mountView()
    await flushPromises()

    const row = wrapper.find('[data-testid="line-items"] tbody tr')
    expect(row.exists()).toBe(true)
    await row.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/admin/plans/plan-uuid-999/edit')
    // Must NOT navigate using the subscription UUID
    expect(mockPush).not.toHaveBeenCalledWith('/admin/plans/subscription-uuid-111/edit')
  })

  it('row without catalog_item_id does not trigger navigation', async () => {
    mockInvoice = {
      id: 'inv-1',
      invoice_number: 'INV-002',
      status: 'PAID',
      amount: 29.99,
      currency: 'USD',
      created_at: '2026-01-01',
      user_email: 'test@example.com',
      user_name: 'Test User',
      line_items: [
        {
          ...mockLineItemBase,
          type: 'SUBSCRIPTION',
          item_id: 'subscription-uuid-111',
          // catalog_item_id absent — plan could not be resolved
        },
      ],
    }
    mockFetchInvoice.mockResolvedValue(undefined)

    const wrapper = mountView()
    await flushPromises()

    const row = wrapper.find('[data-testid="line-items"] tbody tr')
    await row.trigger('click')

    expect(mockPush).not.toHaveBeenCalled()
  })
})
