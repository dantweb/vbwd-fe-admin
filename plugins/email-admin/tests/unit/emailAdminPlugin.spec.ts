/**
 * Tests that the email-admin plugin integrates correctly with the
 * pluginLoader discovery mechanism (plugins.json + default export pattern).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// The plugin must use default export so pluginLoader can find it
// via `pluginModule.default` (see vue/src/utils/pluginLoader.ts line 104)
describe('emailAdminPlugin — pluginLoader integration contract', () => {
  it('exports a default export (required by pluginLoader.ts)', async () => {
    const module = await import('../../index')
    expect(module.default).toBeDefined()
  })

  it('default export has required IPlugin interface', async () => {
    const { default: plugin } = await import('../../index')
    expect(typeof plugin.name).toBe('string')
    expect(plugin.name).toBe('email-admin')
    expect(typeof plugin.install).toBe('function')
    expect(typeof plugin.activate).toBe('function')
    expect(typeof plugin.deactivate).toBe('function')
  })

  it('also exports named emailAdminPlugin (optional but conventional)', async () => {
    const module = await import('../../index')
    expect(module.emailAdminPlugin).toBeDefined()
    expect(module.emailAdminPlugin.name).toBe('email-admin')
  })
})

describe('emailAdminPlugin — install()', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('calls sdk.addTranslations with email namespace', async () => {
    const { default: plugin } = await import('../../index')
    const mockSdk = {
      addTranslations: vi.fn(),
      addRoute: vi.fn(),
    }
    // extensionRegistry.register is a side effect — stub it
    vi.mock('../../../../vue/src/plugins/extensionRegistry', () => ({
      extensionRegistry: { register: vi.fn(), unregister: vi.fn() },
    }))

    plugin.install!(mockSdk as never)

    expect(mockSdk.addTranslations).toHaveBeenCalledWith('en', expect.objectContaining({ email: expect.any(Object) }))
  })

  it('registers two routes: list + edit', async () => {
    const { default: plugin } = await import('../../index')
    const routes: { path: string; name: string }[] = []
    const mockSdk = {
      addTranslations: vi.fn(),
      addRoute: vi.fn((r) => routes.push(r)),
    }
    plugin.install!(mockSdk as never)

    const paths = routes.map(r => r.path)
    expect(paths).toContain('email/templates')
    expect(paths).toContain('email/templates/:id/edit')
  })

  it('registers Messaging nav section via extensionRegistry', async () => {
    const { extensionRegistry } = await import('../../../../vue/src/plugins/extensionRegistry')
    const registerSpy = vi.spyOn(extensionRegistry, 'register')
    const { default: plugin } = await import('../../index')
    const mockSdk = { addTranslations: vi.fn(), addRoute: vi.fn() }

    plugin.install!(mockSdk as never)

    expect(registerSpy).toHaveBeenCalledWith('email-admin', expect.objectContaining({ navSections: expect.any(Array) }))
  })
})

describe('emailAdminPlugin — activate() / deactivate()', () => {
  it('activate() re-registers nav sections', async () => {
    const { extensionRegistry } = await import('../../../../vue/src/plugins/extensionRegistry')
    const registerSpy = vi.spyOn(extensionRegistry, 'register')
    const { default: plugin } = await import('../../index')

    plugin.activate?.()

    expect(registerSpy).toHaveBeenCalledWith('email-admin', expect.any(Object))
  })

  it('deactivate() unregisters from extensionRegistry', async () => {
    const { extensionRegistry } = await import('../../../../vue/src/plugins/extensionRegistry')
    const unregisterSpy = vi.spyOn(extensionRegistry, 'unregister')
    const { default: plugin } = await import('../../index')

    plugin.deactivate?.()

    expect(unregisterSpy).toHaveBeenCalledWith('email-admin')
  })
})
