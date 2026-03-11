<template>
  <div class="ghrm-software-tab">
    <div
      v-if="loading"
      class="ghrm-loading"
    >
      Loading software package data...
    </div>

    <div
      v-else-if="error"
      class="ghrm-error"
    >
      {{ error }}
    </div>

    <template v-else>
      <!-- GitHub Repo -->
      <div class="ghrm-field-row">
        <div class="ghrm-field">
          <label class="ghrm-label">GitHub Owner *</label>
          <input
            v-model="form.github_owner"
            class="ghrm-input"
            type="text"
            placeholder="e.g. myorg"
            data-testid="ghrm-github-owner"
          >
        </div>
        <div class="ghrm-field">
          <label class="ghrm-label">GitHub Repo *</label>
          <input
            v-model="form.github_repo"
            class="ghrm-input"
            type="text"
            placeholder="e.g. my-plugin"
            data-testid="ghrm-github-repo"
          >
        </div>
      </div>

      <!-- Author -->
      <div class="ghrm-field">
        <label class="ghrm-label">Author / Maintainer</label>
        <input
          v-model="form.author_name"
          class="ghrm-input"
          type="text"
          placeholder="Author or organisation name"
          data-testid="ghrm-author-name"
        >
      </div>

      <!-- Icon URL -->
      <div class="ghrm-field">
        <label class="ghrm-label">Software Icon URL</label>
        <input
          v-model="form.icon_url"
          class="ghrm-input"
          type="text"
          placeholder="/uploads/icon.png or https://..."
          data-testid="ghrm-icon-url"
        >
        <img
          v-if="form.icon_url"
          :src="form.icon_url"
          class="ghrm-icon-preview"
          alt="Software icon preview"
        >
      </div>

      <!-- Save button -->
      <div class="ghrm-actions">
        <button
          type="button"
          class="ghrm-btn ghrm-btn--primary"
          :disabled="saving"
          data-testid="ghrm-save-btn"
          @click="save"
        >
          {{ saving ? 'Saving...' : (pkg ? 'Update Software Package' : 'Create Software Package') }}
        </button>
      </div>

      <!-- Sync API Key (read-only, only after package is created) -->
      <template v-if="pkg">
        <div class="ghrm-divider" />

        <div class="ghrm-field">
          <label class="ghrm-label">Sync API Key</label>
          <p class="ghrm-hint">
            Add this as a GitHub Actions secret named <code>VBWD_SYNC_KEY</code> in your repo.
            The action should call:
            <code>curl "{{ apiBase }}/api/v1/ghrm/sync?package={{ pkg.slug }}&amp;key=$VBWD_SYNC_KEY"</code>
          </p>
          <div class="ghrm-key-row">
            <input
              :value="pkg.sync_api_key"
              class="ghrm-input ghrm-input--mono"
              readonly
              data-testid="ghrm-sync-api-key"
            >
            <button
              type="button"
              class="ghrm-btn"
              data-testid="ghrm-copy-key-btn"
              @click="copyKey"
            >
              {{ keyCopied ? 'Copied!' : 'Copy' }}
            </button>
            <button
              type="button"
              class="ghrm-btn ghrm-btn--warn"
              :disabled="rotatingKey"
              data-testid="ghrm-rotate-key-btn"
              @click="rotateKey"
            >
              {{ rotatingKey ? 'Rotating...' : 'Regenerate' }}
            </button>
          </div>
        </div>

        <!-- Last synced + Sync Now -->
        <div class="ghrm-field">
          <label class="ghrm-label">Last Synced</label>
          <div class="ghrm-sync-row">
            <span
              class="ghrm-sync-time"
              data-testid="ghrm-last-synced"
            >
              {{ lastSyncedLabel }}
            </span>
            <button
              type="button"
              class="ghrm-btn"
              :disabled="syncing"
              data-testid="ghrm-sync-now-btn"
              @click="syncNow"
            >
              {{ syncing ? 'Syncing...' : 'Sync Now' }}
            </button>
          </div>
          <p
            v-if="syncSuccess"
            class="ghrm-success"
          >
            Sync completed successfully.
          </p>
          <p
            v-if="syncError"
            class="ghrm-error-inline"
          >
            {{ syncError }}
          </p>
        </div>
      </template>

      <p
        v-if="saveError"
        class="ghrm-error-inline"
      >
        {{ saveError }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface GhrmPackage {
  id: string;
  slug: string;
  name: string;
  author_name: string | null;
  icon_url: string | null;
  github_owner: string;
  github_repo: string;
  sync_api_key: string;
  last_synced_at: string | null;
}

const props = defineProps<{
  planId: string;
  assignedCategories: { id: string; slug: string; name: string }[];
}>();

const loading = ref(false);
const saving = ref(false);
const syncing = ref(false);
const rotatingKey = ref(false);
const keyCopied = ref(false);
const error = ref<string | null>(null);
const saveError = ref<string | null>(null);
const syncSuccess = ref(false);
const syncError = ref<string | null>(null);

const pkg = ref<GhrmPackage | null>(null);

const form = ref({
  github_owner: '',
  github_repo: '',
  author_name: '',
  icon_url: '',
});

const apiBase = computed(() => window.location.origin);

const lastSyncedLabel = computed(() => {
  if (!pkg.value?.last_synced_at) return 'Never';
  return new Date(pkg.value.last_synced_at).toLocaleString();
});

async function loadPackage(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const resp = await fetch(`/api/v1/admin/ghrm/packages?tariff_plan_id=${props.planId}`, {
      headers: authHeaders(),
    });
    if (resp.ok) {
      const data = await resp.json();
      const found = (data.items || []).find((p: GhrmPackage) => p.id);
      if (found) {
        pkg.value = found;
        form.value = {
          github_owner: found.github_owner || '',
          github_repo: found.github_repo || '',
          author_name: found.author_name || '',
          icon_url: found.icon_url || '',
        };
      }
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  saving.value = true;
  saveError.value = null;
  try {
    const body = {
      tariff_plan_id: props.planId,
      name: props.assignedCategories[0]?.name || form.value.github_repo,
      slug: form.value.github_repo.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      github_owner: form.value.github_owner,
      github_repo: form.value.github_repo,
      author_name: form.value.author_name || null,
      icon_url: form.value.icon_url || null,
    };
    let resp: Response;
    if (pkg.value) {
      resp = await fetch(`/api/v1/admin/ghrm/packages/${pkg.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
    } else {
      resp = await fetch('/api/v1/admin/ghrm/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
    }
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Save failed');
    }
    pkg.value = await resp.json();
  } catch (e) {
    saveError.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}

async function rotateKey(): Promise<void> {
  if (!pkg.value) return;
  rotatingKey.value = true;
  try {
    const resp = await fetch(`/api/v1/admin/ghrm/packages/${pkg.value.id}/rotate-key`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (resp.ok) {
      const data = await resp.json();
      pkg.value = { ...pkg.value, sync_api_key: data.sync_api_key };
    }
  } finally {
    rotatingKey.value = false;
  }
}

async function syncNow(): Promise<void> {
  if (!pkg.value) return;
  syncing.value = true;
  syncSuccess.value = false;
  syncError.value = null;
  try {
    const resp = await fetch(`/api/v1/admin/ghrm/packages/${pkg.value.id}/sync`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (resp.ok) {
      syncSuccess.value = true;
      setTimeout(() => { syncSuccess.value = false; }, 3000);
    } else {
      const err = await resp.json();
      syncError.value = err.error || 'Sync failed';
    }
  } catch (e) {
    syncError.value = (e as Error).message;
  } finally {
    syncing.value = false;
  }
}

async function copyKey(): Promise<void> {
  if (!pkg.value) return;
  await navigator.clipboard.writeText(pkg.value.sync_api_key);
  keyCopied.value = true;
  setTimeout(() => { keyCopied.value = false; }, 2000);
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

onMounted(loadPackage);
</script>

<style scoped>
.ghrm-software-tab {
  font-size: 14px;
}

.ghrm-field {
  margin-bottom: 18px;
}

.ghrm-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 18px;
}

.ghrm-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
  font-size: 13px;
}

.ghrm-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.ghrm-input--mono {
  font-family: monospace;
  font-size: 12px;
  flex: 1;
}

.ghrm-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.ghrm-icon-preview {
  margin-top: 8px;
  width: 48px;
  height: 48px;
  object-fit: contain;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}

.ghrm-btn {
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #f9fafb;
  color: #374151;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.15s;
}

.ghrm-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.ghrm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghrm-btn--primary {
  background: #3498db;
  color: #fff;
  border-color: #2980b9;
}

.ghrm-btn--primary:hover:not(:disabled) {
  background: #2980b9;
}

.ghrm-btn--warn {
  background: #e74c3c;
  color: #fff;
  border-color: #c0392b;
}

.ghrm-btn--warn:hover:not(:disabled) {
  background: #c0392b;
}

.ghrm-actions {
  margin-top: 8px;
}

.ghrm-divider {
  border: none;
  border-top: 1px solid #e9ecef;
  margin: 24px 0;
}

.ghrm-key-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ghrm-sync-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ghrm-sync-time {
  color: #6b7280;
  font-size: 13px;
}

.ghrm-hint {
  color: #6b7280;
  font-size: 12px;
  margin: 4px 0 8px;
  line-height: 1.5;
}

.ghrm-hint code {
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.ghrm-success {
  color: #059669;
  font-size: 13px;
  margin-top: 4px;
}

.ghrm-error {
  color: #dc2626;
  padding: 12px;
  background: #fef2f2;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

.ghrm-error-inline {
  color: #dc2626;
  font-size: 13px;
  margin-top: 6px;
}

.ghrm-loading {
  color: #6b7280;
  font-size: 13px;
}
</style>
