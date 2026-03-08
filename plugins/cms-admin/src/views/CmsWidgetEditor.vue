<template>
  <div class="widget-editor">
    <div class="widget-editor__header">
      <h2>{{ isNew ? 'New Widget' : 'Edit Widget' }}</h2>
      <div class="widget-editor__actions">
        <router-link
          to="/admin/cms/widgets"
          class="btn btn--ghost"
        >
          Cancel
        </router-link>
        <button
          class="btn btn--danger"
          :disabled="isNew || store.loading"
          @click="remove"
        >
          Delete
        </button>
        <button
          class="btn btn--primary"
          :disabled="store.loading"
          @click="save"
        >
          Save
        </button>
      </div>
    </div>

    <div
      v-if="store.error"
      class="widget-editor__error"
    >
      {{ store.error }}
    </div>

    <div class="widget-editor__body">
      <!-- Meta fields -->
      <div class="meta-fields">
        <div class="field-group">
          <label class="field-label">Name *</label>
          <input
            v-model="form.name"
            class="field-input"
            type="text"
            @blur="autoSlug"
          >
        </div>
        <div class="field-group">
          <label class="field-label">Slug *</label>
          <input
            v-model="form.slug"
            class="field-input field-input--mono"
            type="text"
          >
        </div>
        <div class="field-group">
          <label class="field-label">Type *</label>
          <select
            v-model="form.widget_type"
            class="field-input"
            :disabled="!isNew"
          >
            <option value="html">
              HTML
            </option>
            <option value="menu">
              Menu
            </option>
            <option value="slideshow">
              Slideshow
            </option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Sort Order</label>
          <input
            v-model.number="form.sort_order"
            class="field-input field-input--sm"
            type="number"
            min="0"
          >
        </div>
        <div class="field-group checkbox-group">
          <label class="field-label">
            <input
              v-model="form.is_active"
              type="checkbox"
            > Active
          </label>
        </div>
      </div>

      <!-- Type-specific editor -->
      <div class="type-editor">
        <!-- HTML widget: CodeMirror HTML + CSS editors + Preview -->
        <template v-if="form.widget_type === 'html'">
          <div class="html-widget-editors">
            <div class="editor-pane">
              <div class="editor-pane__tabs">
                <button
                  v-for="tab in ['HTML', 'CSS', 'Preview']"
                  :key="tab"
                  type="button"
                  :class="['pane-tab', { active: activeHtmlTab === tab }]"
                  @click="onWidgetTabChange(tab as 'HTML' | 'CSS' | 'Preview')"
                >
                  {{ tab }}
                </button>
              </div>
              <div v-show="activeHtmlTab === 'HTML'">
                <div class="editor-toolbar">
                  <button
                    type="button"
                    class="toolbar-btn"
                    title="Insert image from library"
                    @click="htmlImagePickerOpen = true"
                  >
                    + Image
                  </button>
                </div>
                <CodeMirrorEditor
                  ref="htmlEditorRef"
                  v-model="htmlContent"
                  lang="html"
                  min-height="380px"
                />
              </div>
              <div v-show="activeHtmlTab === 'CSS'">
                <CodeMirrorEditor
                  v-model="cssContent"
                  lang="css"
                  min-height="380px"
                />
                <p class="editor-pane__hint">
                  Style the widget's structural classes here (e.g. <code>.features__grid</code>,
                  <code>.feature-card</code>). These styles are injected with the widget on the page.
                </p>
              </div>
              <div v-show="activeHtmlTab === 'Preview'">
                <iframe
                  ref="widgetPreviewFrame"
                  class="widget-preview-iframe"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- Menu widget: tree editor -->
        <template v-else-if="form.widget_type === 'menu'">
          <label class="field-label">Menu Items</label>
          <CmsMenuTreeEditor v-model="menuItems" />
        </template>

        <!-- Slideshow widget: image list -->
        <template v-else-if="form.widget_type === 'slideshow'">
          <label class="field-label">Slideshow Images</label>
          <div class="slideshow-list">
            <div
              v-if="!slideshowImages.length"
              class="slideshow-empty"
            >
              No images added.
            </div>
            <div
              v-for="(img, idx) in slideshowImages"
              :key="idx"
              class="slideshow-item"
            >
              <img
                :src="img.url"
                :alt="img.alt"
                class="slideshow-thumb"
              >
              <div class="slideshow-item__meta">
                <input
                  v-model="img.alt"
                  class="field-input field-input--sm"
                  type="text"
                  placeholder="Alt text"
                >
                <input
                  v-model="img.caption"
                  class="field-input field-input--sm"
                  type="text"
                  placeholder="Caption"
                >
              </div>
              <button
                type="button"
                class="btn btn--xs btn--danger"
                @click="slideshowImages.splice(idx, 1)"
              >
                ×
              </button>
            </div>
            <button
              type="button"
              class="btn btn--sm"
              @click="imagePickerOpen = true"
            >
              + Add Image
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Image picker (slideshow) -->
    <CmsImagePicker
      v-if="imagePickerOpen"
      @select="onImageSelected"
      @close="imagePickerOpen = false"
    />

    <!-- Image picker (HTML editor insert) -->
    <CmsImagePicker
      v-if="htmlImagePickerOpen"
      @select="onHtmlImageSelected"
      @close="htmlImagePickerOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCmsAdminStore } from '../stores/useCmsAdminStore';
import type { CmsMenuItemData } from '../stores/useCmsAdminStore';
import CodeMirrorEditor from '../components/CodeMirrorEditor.vue';
import CmsMenuTreeEditor from '../components/CmsMenuTreeEditor.vue';
import CmsImagePicker from '../components/CmsImagePicker.vue';

const route = useRoute();
const router = useRouter();
const store = useCmsAdminStore();

const id = route.params.id as string | undefined;
const isNew = !id;
const imagePickerOpen = ref(false);
const htmlImagePickerOpen = ref(false);
const activeHtmlTab = ref<'HTML' | 'CSS' | 'Preview'>('HTML');
const widgetPreviewFrame = ref<HTMLIFrameElement | null>(null);
const htmlEditorRef = ref<InstanceType<typeof CodeMirrorEditor> | null>(null);

const form = ref({
  name: '',
  slug: '',
  widget_type: 'html' as 'html' | 'menu' | 'slideshow',
  sort_order: 0,
  is_active: true,
});

/** Decoded HTML content for the editor (plain text, not base64). */
const htmlContent = ref('');
/** CSS for this widget's structural classes. */
const cssContent = ref('');

const menuItems = ref<CmsMenuItemData[]>([]);
const slideshowImages = ref<{ url: string; alt: string; caption: string }[]>([]);

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function autoSlug() {
  if (!form.value.slug) form.value.slug = slugify(form.value.name);
}

function updateWidgetPreview() {
  const frame = widgetPreviewFrame.value;
  if (!frame) return;
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>${cssContent.value}</style></head><body>${htmlContent.value}</body></html>`);
  doc.close();
}

async function onWidgetTabChange(tab: 'HTML' | 'CSS' | 'Preview') {
  activeHtmlTab.value = tab;
  if (tab === 'Preview') {
    await nextTick();
    updateWidgetPreview();
  }
}

function onImageSelected(url: string, alt: string) {
  if (form.value.widget_type === 'slideshow') {
    slideshowImages.value.push({ url, alt, caption: '' });
  }
  imagePickerOpen.value = false;
}

function onHtmlImageSelected(url: string, alt: string) {
  htmlEditorRef.value?.insertAtCursor(`<img src="${url}" alt="${alt}">`);
  htmlImagePickerOpen.value = false;
}

async function save() {
  const payload: Record<string, unknown> = { ...form.value };
  if (id) payload.id = id;

  if (form.value.widget_type === 'html') {
    // Encode HTML to base64; store CSS separately
    const b64 = btoa(unescape(encodeURIComponent(htmlContent.value)));
    payload.content_json = { content: b64 };
    payload.source_css = cssContent.value;
  } else if (form.value.widget_type === 'menu') {
    payload.content_json = null;
    payload.source_css = null;
  } else if (form.value.widget_type === 'slideshow') {
    payload.content_json = { images: slideshowImages.value };
    payload.source_css = null;
  }

  const saved = await store.saveWidget(payload as any);

  if (form.value.widget_type === 'menu') {
    const wid = saved?.id ?? id!;
    await store.replaceMenuTree(wid, menuItems.value as CmsMenuItemData[]);
  }

  if (saved && isNew) {
    router.replace(`/admin/cms/widgets/${saved.id}/edit`);
  }
}

async function remove() {
  if (!id || !confirm('Delete this widget? It cannot be deleted if assigned to a layout.')) return;
  try {
    await store.deleteWidget(id);
    router.push('/admin/cms/widgets');
  } catch (e: any) {
    alert(e?.message ?? 'Failed to delete widget');
  }
}

onMounted(async () => {
  if (!isNew) {
    await store.fetchWidget(id!);
    const w = store.currentWidget;
    if (w) {
      form.value = {
        name: w.name,
        slug: w.slug,
        widget_type: w.widget_type,
        sort_order: w.sort_order,
        is_active: w.is_active,
      };

      if (w.widget_type === 'html') {
        // Decode base64 HTML from content_json.content
        const b64 = (w.content_json as any)?.content ?? '';
        try {
          htmlContent.value = b64 ? decodeURIComponent(escape(atob(b64))) : '';
        } catch {
          htmlContent.value = b64; // fallback if not base64
        }
        cssContent.value = (w as any).source_css ?? '';
      }

      if (w.widget_type === 'menu' && w.menu_items) {
        menuItems.value = w.menu_items;
      }
      if (w.widget_type === 'slideshow' && w.content_json?.images) {
        slideshowImages.value = (w.content_json.images as any[]).map(i => ({
          url: i.url ?? '', alt: i.alt ?? '', caption: i.caption ?? '',
        }));
      }
    }
  }
});
</script>

<style scoped>
.widget-editor { padding: 1.5rem; }
.widget-editor__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem; }
.widget-editor__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.widget-editor__error { background: #fee2e2; color: #991b1b; padding: 0.6rem 1rem; border-radius: 4px; margin-bottom: 1rem; }
.widget-editor__body { display: flex; flex-direction: column; gap: 1.5rem; }

.meta-fields { display: grid; grid-template-columns: 1fr 1fr 140px 100px 100px; gap: 0 1rem; align-items: start; }
@media (max-width: 800px) { .meta-fields { grid-template-columns: 1fr 1fr; } }
.checkbox-group { padding-top: 1.5rem; }

.type-editor { min-height: 200px; }

/* Editor toolbar (above HTML CodeMirror) */
.editor-toolbar { display: flex; gap: 0.5rem; padding: 4px 8px; background: #1e2030; border-bottom: 1px solid #374151; }
.toolbar-btn { padding: 2px 10px; font-size: 0.78rem; background: #374151; color: #d1d5db; border: 1px solid #4b5563; border-radius: 3px; cursor: pointer; }
.toolbar-btn:hover { background: #4b5563; color: #f9fafb; }

/* HTML widget tab layout */
.widget-preview-iframe { width: 100%; height: 420px; border: none; border-radius: 0 0 6px 6px; background: #fff; }
.html-widget-editors { display: flex; flex-direction: column; gap: 0; }
.editor-pane__tabs { display: flex; gap: 0; border-bottom: 1px solid #374151; margin-bottom: 0; background: #1e2030; border-radius: 6px 6px 0 0; overflow: hidden; }
.pane-tab { padding: 0.5rem 1.25rem; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 0.85rem; color: #9ca3af; }
.pane-tab.active { color: #60a5fa; border-bottom-color: #60a5fa; background: #1a1a2e; }
.editor-pane__hint { margin-top: 0.5rem; font-size: 0.78rem; color: #6b7280; }
.editor-pane__hint code { background: #f3f4f6; border-radius: 3px; padding: 0 3px; font-family: monospace; }

/* Slideshow */
.slideshow-list { display: flex; flex-direction: column; gap: 0.75rem; }
.slideshow-empty { color: #9ca3af; font-size: 0.875rem; padding: 0.5rem; }
.slideshow-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; }
.slideshow-thumb { width: 80px; height: 56px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; }
.slideshow-item__meta { flex: 1; display: flex; flex-direction: column; gap: 4px; }

.field-group { margin-bottom: 1rem; }
.field-label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px; color: #374151; }
.field-input { width: 100%; padding: 0.45rem 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem; box-sizing: border-box; }
.field-input--mono { font-family: monospace; }
.field-input--sm { font-size: 0.8rem; padding: 0.3rem 0.5rem; }

.btn { padding: 0.45rem 1rem; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; font-size: 0.875rem; text-decoration: none; }
.btn--ghost { color: #374151; display: inline-flex; align-items: center; }
.btn--primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.btn--danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.btn--sm { font-size: 0.8rem; padding: 0.35rem 0.65rem; }
.btn--xs { font-size: 0.75rem; padding: 0.2rem 0.5rem; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
