# VBWD fe-admin — Styling Guide

## For Developers

### Where styles come from

| Source | What it contains |
|---|---|
| `vbwd-fe-core/src/styles/variables.css` | All design tokens (`--vbwd-*`) |
| `vbwd-fe-core/src/components/ui/` | Button, Input, Card, Table, Modal, Badge, etc. |
| `vue/src/layouts/AdminLayout.vue` | Mobile header + burger, main layout wrapper |
| `vue/src/layouts/AdminSidebar.vue` | Collapsible nav groups, user menu footer |
| `vue/src/layouts/AdminTopbar.vue` | Page title bar |
| View `.vue` files (`<style scoped>`) | Page-specific styles only |

Full token reference → `vbwd-fe-core/docs/styling.md`

---

### Importing the design system

`vue/src/main.ts`:
```typescript
import 'vbwd-view-component/styles';
```

---

### Layout (Sidebar + Burger)

`AdminLayout.vue` manages:
- Fixed 250px sidebar on desktop (`margin-left: 250px` on main)
- Slide-in sidebar with dark overlay on `≤ 1024px`
- Full-width sidebar on `≤ 768px`
- Mobile header (60px fixed, dark): burger + "VBWD Admin" title

`AdminSidebar.vue` receives a `showMobile` prop and emits `close`:
```vue
<!-- AdminLayout.vue wires them together -->
<AdminSidebar :show-mobile="showMobileMenu" @close="closeMobileMenu" />
```

All nav `<router-link>` elements call `closeNav()` (which emits `close`) so navigating a page collapses the sidebar on mobile automatically.

---

### Nav section groups

Admin nav uses collapsible sections. Each section has:
- A `<button class="nav-section-header">` with `:class="{ expanded, 'has-active' }"`
- A `<div v-show="expanded" class="nav-submenu">` with indented `<router-link>` items

Adding a new nav group:
```vue
<!-- AdminSidebar.vue -->
<div class="nav-section">
  <button
    class="nav-section-header"
    :class="{ expanded: myExpanded, 'has-active': isMyActive }"
    @click="myExpanded = !myExpanded"
  >
    <span>My Section</span>
    <span class="expand-arrow">{{ myExpanded ? '▼' : '▶' }}</span>
  </button>
  <div v-show="myExpanded" class="nav-submenu">
    <router-link to="/admin/my-page" class="nav-item nav-subitem" @click="closeNav">
      My Page
    </router-link>
  </div>
</div>
```

Plugin-registered sections are handled automatically via `extensionRegistry.getNavSections()`.

---

### Writing page styles

Use `var(--vbwd-*)` tokens. Example admin view pattern:

```css
.my-admin-view {
  /* no max-width restriction — admin fills available space */
}

.data-table-wrap {
  background: var(--vbwd-card-bg, #fff);
  border-radius: var(--vbwd-radius-lg);
  box-shadow: var(--vbwd-shadow-sm);
  overflow: hidden;
}

@media (max-width: 768px) {
  /* Tables must scroll horizontally */
  .table-scroll { overflow-x: auto; }
  table { min-width: 600px; }

  /* Toolbars stack */
  .toolbar { flex-direction: column; gap: 10px; }
  .toolbar input, .toolbar select { width: 100%; }

  /* Reduce card padding */
  .card { padding: 16px; }

  /* Action buttons full-width */
  .page-actions { flex-direction: column; }
  .page-actions .btn { width: 100%; }
}
```

---

### Admin-specific token overrides

Add to `vue/src/assets/global.css` (or equivalent):

```css
/* Admin uses a darker/cooler sidebar than user app */
:root {
  --vbwd-sidebar-bg: #2c3e50;
  --vbwd-page-bg: #f5f5f5;
}

/* Dark mode for admin */
.dark {
  --vbwd-sidebar-bg: #1a252f;
  --vbwd-page-bg: #0f172a;
  --vbwd-card-bg: #1e293b;
}
```

---

### Plugin admin views

Plugin admin views registered via `extensionRegistry` follow the same rules:
- `var(--vbwd-*)` for all colors
- `@media (max-width: 768px)` responsive block required
- Nav sections added via `extensionRegistry.registerNavSection()`
- Settings items added via `extensionRegistry.registerSettingsItem()`

---

## For Administrators — Appearance

The VBWD admin panel respects your device's preferred color scheme by default.

**To change the theme manually:**
1. Click your email address at the bottom-left of the sidebar
2. Select **Profile**
3. Find the **Appearance** section
4. Choose **Light**, **Dark**, or **System**

Changes take effect immediately and are saved to your profile.

**On mobile:** tap the ☰ burger icon (top-left) to open the navigation menu. All admin pages are optimized for smartphones and tablets — tables scroll horizontally, toolbars collapse vertically.
