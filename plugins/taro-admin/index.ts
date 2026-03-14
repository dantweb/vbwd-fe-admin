/**
 * Taro Admin Plugin
 *
 * Admin-side plugin that provides Taro admin extensions.
 * Completely independent from the user-side Taro plugin.
 */

import type { IPlugin } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import taroAdminExtension from './extension';

export const taroAdminPlugin: IPlugin = {
  name: 'taro-admin',
  version: '1.0.0',
  description: 'Admin extension for Taro',

  install() {
    // Register Taro admin extensions
    extensionRegistry.register('taro', taroAdminExtension);
  },

  activate() {
    extensionRegistry.register('taro', taroAdminExtension);
  },

  deactivate() {
    extensionRegistry.unregister('taro');
  },
};

export default taroAdminPlugin;
