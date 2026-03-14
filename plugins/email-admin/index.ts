/**
 * Email Admin Plugin
 *
 * Provides transactional email template management in the admin backoffice:
 * - List all event-keyed templates
 * - Edit HTML/plain-text bodies (CodeMirror-style textarea editors)
 * - Preview rendered output with example data
 * - Send test emails to any address
 */

import type { IPlugin, IPlatformSDK } from 'vbwd-view-component'
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry'
import en from './locales/en.json'

const SETTINGS_ITEMS = [
  { label: 'Email Templates', to: '/admin/email/templates' },
]

export const emailAdminPlugin: IPlugin = {
  name: 'email-admin',
  version: '1.0.0',
  description: 'Transactional email template editor',

  install(sdk: IPlatformSDK) {
    sdk.addTranslations('en', { email: (en as Record<string, unknown>)['email'] })

    extensionRegistry.register('email-admin', { settingsItems: SETTINGS_ITEMS })

    sdk.addRoute({
      path: 'email/templates',
      name: 'email-templates',
      component: () => import('./src/views/EmailTemplateList.vue'),
    })

    sdk.addRoute({
      path: 'email/templates/new',
      name: 'email-template-new',
      component: () => import('./src/views/EmailTemplateEdit.vue'),
    })

    sdk.addRoute({
      path: 'email/templates/:id/edit',
      name: 'email-template-edit',
      component: () => import('./src/views/EmailTemplateEdit.vue'),
    })
  },

  activate() {
    extensionRegistry.register('email-admin', { settingsItems: SETTINGS_ITEMS })
  },

  deactivate() {
    extensionRegistry.unregister('email-admin')
  },
}

export default emailAdminPlugin
