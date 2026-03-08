<template>
  <div class="layout-editor">
    <div class="layout-editor__header">
      <h2>{{ isNew ? 'New Layout' : 'Edit Layout' }}</h2>
      <div class="layout-editor__actions">
        <router-link
          to="/admin/cms/layouts"
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
      class="layout-editor__error"
    >
      {{ store.error }}
    </div>

    <div class="layout-editor__body">
      <!-- Meta fields -->
      <div class="meta-section card">
        <h3 class="section-title">
          General
        </h3>
        <div class="meta-grid">
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
            <label class="field-label">Description</label>
            <input
              v-model="form.description"
              class="field-input"
              type="text"
            >
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
            <label class="field-label"><input
              v-model="form.is_active"
              type="checkbox"
            > Active</label>
          </div>
        </div>
      </div>

      <!-- Areas builder -->
      <div class="areas-section card">
        <div class="section-header">
          <h3 class="section-title">
            Areas
          </h3>
          <button
            type="button"
            class="btn btn--sm"
            @click="addArea"
          >
            + Add Area
          </button>
        </div>
        <div
          v-if="!form.areas.length"
          class="empty-hint"
        >
          No areas defined. Add at least one area.
        </div>
        <div
          v-for="(area, idx) in form.areas"
          :key="idx"
          class="area-row"
        >
          <div
            class="field-group"
            style="flex:1"
          >
            <label class="field-label">Area Name</label>
            <input
              v-model="area.name"
              class="field-input field-input--mono"
              type="text"
              placeholder="e.g. header"
            >
          </div>
          <div
            class="field-group"
            style="flex:1"
          >
            <label class="field-label">Type</label>
            <select
              v-model="area.type"
              class="field-input"
            >
              <option
                v-for="t in AREA_TYPES"
                :key="t"
                :value="t"
              >
                {{ t }}
              </option>
            </select>
          </div>
          <div
            class="field-group"
            style="flex:1"
          >
            <label class="field-label">Label</label>
            <input
              v-model="area.label"
              class="field-input"
              type="text"
              placeholder="Display label"
            >
          </div>
          <button
            type="button"
            class="btn btn--danger btn--xs area-remove"
            @click="form.areas.splice(idx, 1)"
          >
            ×
          </button>
        </div>
        <div
          v-if="areaError"
          class="field-error"
        >
          {{ areaError }}
        </div>
      </div>

      <!-- Widget Assignments (only available after first save) -->
      <div
        v-if="!isNew"
        class="assignments-section card"
      >
        <div class="section-header">
          <h3 class="section-title">
            Widget Assignments
          </h3>
          <button
            type="button"
            class="btn btn--sm"
            @click="saveAssignments"
          >
            Save Assignments
          </button>
        </div>
        <p class="hint">
          Assign widgets to non-content areas. <em>Content</em>-type areas render the page's TipTap content.
        </p>
        <div
          v-if="assignableAreas.length === 0"
          class="empty-hint"
        >
          No assignable areas (content-type areas cannot have widgets).
        </div>
        <div
          v-for="area in assignableAreas"
          :key="area.name"
          class="assignment-row"
        >
          <span class="area-chip-lg">{{ area.name }} <em>({{ area.type }})</em></span>
          <div class="assignment-widget">
            <span
              v-if="assignmentFor(area.name)"
              class="assigned-widget"
            >
              {{ assignmentFor(area.name)!.widget_id }}
              <button
                type="button"
                class="btn btn--xs btn--danger"
                @click="clearAssignment(area.name)"
              >×</button>
            </span>
            <button
              v-else
              type="button"
              class="btn btn--sm"
              @click="openPicker(area.name)"
            >
              + Assign Widget
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Widget picker modal -->
    <CmsWidgetPicker
      v-if="pickerArea !== null"
      @select="onWidgetSelected"
      @close="pickerArea = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCmsAdminStore } from '../stores/useCmsAdminStore';
import type { CmsAreaDefinition, CmsLayoutWidgetAssignment, CmsWidget } from '../stores/useCmsAdminStore';
import CmsWidgetPicker from '../components/CmsWidgetPicker.vue';

const AREA_TYPES = ['header', 'footer', 'hero', 'slideshow', 'content', 'three-column', 'two-column', 'cta-bar'];

const route = useRoute();
const router = useRouter();
const store = useCmsAdminStore();

const id = route.params.id as string | undefined;
const isNew = !id;

const form = ref({
  name: '',
  slug: '',
  description: '',
  sort_order: 0,
  is_active: true,
  areas: [] as CmsAreaDefinition[],
});

const assignments = ref<CmsLayoutWidgetAssignment[]>([]);
const areaError = ref('');
const pickerArea = ref<string | null>(null);

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function autoSlug() {
  if (!form.value.slug) form.value.slug = slugify(form.value.name);
}

function addArea() {
  form.value.areas.push({ name: '', type: 'content', label: '' });
}

// Non-content areas can get widget assignments
const assignableAreas = computed(() =>
  form.value.areas.filter(a => a.type !== 'content')
);

function assignmentFor(areaName: string) {
  return assignments.value.find(a => a.area_name === areaName) ?? null;
}

function clearAssignment(areaName: string) {
  assignments.value = assignments.value.filter(a => a.area_name !== areaName);
}

function openPicker(areaName: string) {
  pickerArea.value = areaName;
}

function onWidgetSelected(widget: CmsWidget) {
  const areaName = pickerArea.value!;
  const existing = assignments.value.findIndex(a => a.area_name === areaName);
  const entry: CmsLayoutWidgetAssignment = {
    widget_id: widget.id,
    area_name: areaName,
    sort_order: existing >= 0 ? assignments.value[existing].sort_order : assignments.value.length,
  };
  if (existing >= 0) assignments.value[existing] = entry;
  else assignments.value.push(entry);
  pickerArea.value = null;
}

async function saveAssignments() {
  if (!id) return;
  try {
    await store.setWidgetAssignments(id, assignments.value);
  } catch (e: any) {
    alert(e?.message ?? 'Failed to save assignments');
  }
}

async function save() {
  areaError.value = '';
  // Validate: no duplicate area names
  const names = form.value.areas.map(a => a.name.trim()).filter(Boolean);
  if (new Set(names).size !== names.length) {
    areaError.value = 'Area names must be unique.';
    return;
  }

  const payload: Record<string, unknown> = { ...form.value };
  if (id) payload.id = id;

  const saved = await store.saveLayout(payload as any);
  if (saved && isNew) {
    router.replace(`/admin/cms/layouts/${saved.id}/edit`);
  }
}

async function remove() {
  if (!id || !confirm('Delete this layout?')) return;
  await store.deleteLayout(id);
  router.push('/admin/cms/layouts');
}

onMounted(async () => {
  if (!isNew) {
    await store.fetchLayout(id!);
    const l = store.currentLayout;
    if (l) {
      form.value = {
        name: l.name,
        slug: l.slug,
        description: l.description ?? '',
        sort_order: l.sort_order,
        is_active: l.is_active,
        areas: l.areas ? [...l.areas] : [],
      };
      if (l.assignments) {
        assignments.value = l.assignments.map(a => ({ ...a }));
      }
    }
  }
});
</script>

<style scoped>
.layout-editor { padding: 1.5rem; }
.layout-editor__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem; }
.layout-editor__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.layout-editor__error { background: #fee2e2; color: #991b1b; padding: 0.6rem 1rem; border-radius: 4px; margin-bottom: 1rem; }
.layout-editor__body { display: flex; flex-direction: column; gap: 1.25rem; }

.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.25rem; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.section-title { margin: 0; font-size: 0.95rem; font-weight: 600; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 100px 100px; gap: 0 1rem; align-items: start; }
@media (max-width: 800px) { .meta-grid { grid-template-columns: 1fr 1fr; } }
.checkbox-group { padding-top: 1.5rem; }

.area-row { display: flex; align-items: flex-end; gap: 0.75rem; margin-bottom: 0.5rem; }
.area-remove { margin-bottom: 1rem; flex-shrink: 0; }
.empty-hint { color: #9ca3af; font-size: 0.875rem; padding: 0.5rem 0; }

.assignment-row { display: flex; align-items: center; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px solid #f3f4f6; }
.area-chip-lg { font-size: 0.85rem; padding: 3px 10px; border-radius: 12px; background: #dcfce7; color: #166534; white-space: nowrap; }
.assignment-widget { flex: 1; }
.assigned-widget { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-family: monospace; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }
.hint { font-size: 0.8rem; color: #6b7280; margin: 0 0 1rem; }

.field-group { margin-bottom: 1rem; }
.field-label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px; color: #374151; }
.field-input { width: 100%; padding: 0.45rem 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem; box-sizing: border-box; }
.field-input--mono { font-family: monospace; }
.field-input--sm { width: 80px; display: inline-block; }
.field-error { font-size: 0.8rem; color: #dc2626; margin-top: 4px; }

.btn { padding: 0.45rem 1rem; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; font-size: 0.875rem; text-decoration: none; }
.btn--ghost { color: #374151; display: inline-flex; align-items: center; }
.btn--primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.btn--danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.btn--sm { font-size: 0.8rem; padding: 0.35rem 0.65rem; }
.btn--xs { font-size: 0.75rem; padding: 0.2rem 0.5rem; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
