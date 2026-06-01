<template>
  <q-page padding class="column" style="max-height: calc(100vh - 50px)">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-icon name="smart_toy" size="md" color="primary" class="q-mr-sm" />
      <div class="text-h5">Assistant Fiscal IA</div>
      <q-chip v-if="activeModel" dense outline color="grey-7" size="sm" icon="memory" class="q-ml-sm">{{ activeModel }}</q-chip>
      <q-space />
      <!-- Export menu -->
      <q-btn-dropdown
        v-if="messages.length > 0"
        flat dense icon="download" label="Exporter" no-caps color="grey-7"
        class="q-mr-sm" size="sm"
      >
        <q-list dense>
          <q-item-label header class="text-caption">Exporter la conversation</q-item-label>
          <q-item clickable v-close-popup @click="exportAs('md')">
            <q-item-section avatar><q-icon name="code" color="blue-grey" /></q-item-section>
            <q-item-section><q-item-label>Markdown (.md)</q-item-label></q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="exportAs('pdf')">
            <q-item-section avatar><q-icon name="picture_as_pdf" color="red" /></q-item-section>
            <q-item-section><q-item-label>PDF</q-item-label></q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="exportAs('docx')">
            <q-item-section avatar><q-icon name="description" color="blue" /></q-item-section>
            <q-item-section><q-item-label>Word (.docx)</q-item-label></q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <q-btn flat dense icon="delete_sweep" label="Effacer" no-caps color="grey-7" @click="clearChat" :disable="messages.length === 0" />
    </div>

    <!-- Chat messages -->
    <q-scroll-area ref="scrollArea" class="col q-mb-md ai-scroll-area" style="border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa">
      <div class="q-pa-md" id="chat-export-zone">
        <!-- Welcome message -->
        <div v-if="messages.length === 0" class="text-center q-pa-xl text-grey-6">
          <q-icon name="smart_toy" size="64px" color="grey-4" />
          <div class="text-h6 q-mt-md">Assistant Fiscal WIMRUX®</div>
          <div class="text-body2 q-mt-sm">
            Posez vos questions sur la fiscalité burkinabè, les factures normalisées,<br />
            le calcul des taxes (TVA, PSVB), ou la réglementation DGI.
          </div>
          <div class="row justify-center q-gutter-sm q-mt-lg">
            <q-chip clickable outline color="primary" icon="help_outline" label="Quels sont les groupes de taxation ?" @click="sendSuggestion('Quels sont les 16 groupes de taxation A-P au Burkina Faso et leurs taux de TVA respectifs ?')" />
            <q-chip clickable outline color="primary" icon="help_outline" label="Exigences facture normalisée" @click="sendSuggestion('Quelles sont les exigences obligatoires pour une facture normalisée certifiée au Burkina Faso ?')" />
            <q-chip clickable outline color="primary" icon="help_outline" label="Timbre quittance" @click="sendSuggestion('Comment fonctionne le timbre de quittance au Burkina Faso ? Quand s\'applique-t-il ?')" />
          </div>
        </div>

        <!-- Messages -->
        <div v-for="(msg, idx) in messages" :key="idx" class="q-mb-md message-block" :data-role="msg.role">
          <!-- User message -->
          <div v-if="msg.role === 'user'" class="row justify-end">
            <div class="user-bubble column">
              <div class="text-caption text-weight-medium text-blue-1 q-mb-xs">Vous</div>
              <div>{{ msg.content }}</div>
              <div class="row justify-end q-mt-xs">
                <q-btn flat dense round size="xs" icon="content_copy" color="blue-1" @click="copyMessage(msg.content)">
                  <q-tooltip>Copier</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>

          <!-- Assistant message -->
          <div v-else class="row justify-start">
            <div class="assistant-bubble column">
              <div class="row items-center justify-between q-mb-xs">
                <div class="text-caption text-weight-medium text-grey-6">Assistant IA</div>
                <div class="row q-gutter-xs">
                  <q-btn flat dense round size="xs" icon="content_copy" color="grey-6" @click="copyMessage(msg.content)">
                    <q-tooltip>Copier le texte</q-tooltip>
                  </q-btn>
                </div>
              </div>
              <!-- Rendered HTML from markdown -->
              <div class="ai-markdown-body" v-html="renderMarkdown(msg.content)" />
              <div class="text-caption text-grey-5 q-mt-xs">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="row justify-start q-mb-md">
          <div class="assistant-bubble row items-center">
            <q-spinner-dots size="24px" color="primary" />
            <span class="text-grey-6 q-ml-sm text-caption">Réflexion en cours...</span>
          </div>
        </div>
      </div>
    </q-scroll-area>

    <!-- Input -->
    <div class="row q-gutter-sm items-end">
      <q-input
        v-model="userInput"
        outlined dense class="col"
        placeholder="Posez votre question fiscale..."
        @keyup.enter.exact="onSend"
        :disable="loading"
        autogrow :maxlength="2000"
        data-testid="ai-chat-input"
      >
        <template v-slot:prepend><q-icon name="chat" color="grey-5" /></template>
      </q-input>
      <q-btn color="primary" icon="send" :loading="loading" :disable="!userInput.trim()" @click="onSend" no-caps data-testid="ai-chat-send" />
    </div>

    <!-- Hidden PDF/export print zone -->
    <div id="print-zone" style="display:none" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { marked } from 'marked';
import { useQuasar } from 'quasar';
import { useAiAssistant } from 'src/composables/useAiAssistant';
import type { QScrollArea } from 'quasar';

const $q = useQuasar();
const { messages, loading, activeModel, sendMessage, clearChat } = useAiAssistant();
const userInput = ref('');
const scrollArea = ref<InstanceType<typeof QScrollArea> | null>(null);

// ─── Markdown → HTML ─────────────────────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text: string): string {
  try {
    return marked.parse(text) as string;
  } catch {
    return text;
  }
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Send ─────────────────────────────────────────────────────────────────────
async function onSend() {
  const msg = userInput.value.trim();
  if (!msg || loading.value) return;
  userInput.value = '';
  await sendMessage(msg);
  await nextTick();
  scrollArea.value?.setScrollPercentage('vertical', 1, 300);
}

async function sendSuggestion(text: string) {
  userInput.value = '';
  await sendMessage(text);
  await nextTick();
  scrollArea.value?.setScrollPercentage('vertical', 1, 300);
}

// ─── Copy ─────────────────────────────────────────────────────────────────────
async function copyMessage(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    $q.notify({ type: 'positive', message: 'Message copié !', timeout: 1500, position: 'bottom-right' });
  } catch {
    $q.notify({ type: 'negative', message: 'Impossible de copier', timeout: 1500 });
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────
function buildMarkdownContent(): string {
  const now = new Date().toLocaleString('fr-FR');
  const lines = [
    `# Conversation — Assistant Fiscal WIMRUX®`,
    `> Exportée le ${now}`,
    ``,
  ];
  for (const msg of messages.value) {
    if (msg.role === 'system') continue;
    const role = msg.role === 'user' ? '**Vous**' : '**Assistant IA**';
    const time = formatTime(msg.timestamp);
    lines.push(`### ${role} — ${time}`, msg.content, '');
  }
  return lines.join('\n');
}

function exportAs(format: 'md' | 'pdf' | 'docx') {
  if (format === 'md') exportMarkdown();
  else if (format === 'pdf') exportPdf();
  else if (format === 'docx') exportDocx();
}

function exportMarkdown() {
  const content = buildMarkdownContent();
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `conversation_ia_${dateStamp()}.md`);
}

function exportPdf() {
  const content = buildMarkdownContent();
  const html = marked.parse(content) as string;
  const win = window.open('', '_blank');
  if (!win) { $q.notify({ type: 'negative', message: 'Autorisez les popups pour exporter en PDF' }); return; }
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Conversation IA — WIMRUX Finances</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #333; line-height: 1.6; }
      h1 { color: #1565c0; } h2,h3 { color: #1976d2; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
      blockquote { color: #888; border-left: 3px solid #e0e0e0; padding-left: 12px; margin: 0; }
      code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
      pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
      table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #e0e0e0; padding: 8px 12px; }
      th { background: #e3f2fd; }
      @media print { body { margin: 20px; } }
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 500);
}

function exportDocx() {
  // Build a simple HTML document that Word can open (.doc HTML format)
  const content = buildMarkdownContent();
  const html = marked.parse(content) as string;
  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8">
    <meta name=ProgId content=Word.Document>
    <meta name=Generator content="Microsoft Word 15">
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #222; line-height: 1.5; }
      h1 { font-size: 18pt; color: #1565c0; } h2 { font-size: 14pt; color: #1976d2; } h3 { font-size: 12pt; color: #1976d2; }
      code { font-family: Consolas, monospace; background: #f5f5f5; }
      pre { background: #f5f5f5; padding: 8pt; } table { border-collapse: collapse; }
      th, td { border: 1pt solid #ccc; padding: 4pt 8pt; }
    </style>
  </head><body>${html}</body></html>`;
  const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
  downloadBlob(blob, `conversation_ia_${dateStamp()}.doc`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  $q.notify({ type: 'positive', message: `Exporté : ${filename}`, timeout: 2000 });
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
</script>

<style scoped>
/* Fix: q-scrollarea inner container collapses in Chrome flex column layout */
:deep(.q-scrollarea__container) {
  position: absolute !important;
  top: 0 !important; bottom: 0 !important;
  left: 0 !important; right: 0 !important;
  height: 100% !important;
}

.user-bubble {
  max-width: 80%;
  background: #1565c0;
  color: white;
  border-radius: 16px 16px 4px 16px;
  padding: 10px 16px;
}

.assistant-bubble {
  max-width: 85%;
  background: white;
  border-radius: 4px 16px 16px 16px;
  padding: 12px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
}

/* Markdown body styles */
.ai-markdown-body {
  line-height: 1.65;
  color: #2c3e50;
  word-break: break-word;
}
:deep(.ai-markdown-body h1) { font-size: 1.3em; font-weight: 700; color: #1565c0; margin: 12px 0 6px; border-bottom: 2px solid #e3f2fd; padding-bottom: 4px; }
:deep(.ai-markdown-body h2) { font-size: 1.1em; font-weight: 700; color: #1976d2; margin: 10px 0 5px; }
:deep(.ai-markdown-body h3) { font-size: 1em; font-weight: 600; color: #1976d2; margin: 8px 0 4px; }
:deep(.ai-markdown-body p) { margin: 6px 0; }
:deep(.ai-markdown-body ul), :deep(.ai-markdown-body ol) { padding-left: 20px; margin: 6px 0; }
:deep(.ai-markdown-body li) { margin: 3px 0; }
:deep(.ai-markdown-body strong) { color: #1a237e; }
:deep(.ai-markdown-body em) { color: #546e7a; }
:deep(.ai-markdown-body code) {
  background: #f0f4ff;
  border: 1px solid #c5cae9;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.88em;
  font-family: 'Fira Code', 'Consolas', monospace;
  color: #c62828;
}
:deep(.ai-markdown-body pre) {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  margin: 8px 0;
}
:deep(.ai-markdown-body pre code) {
  background: none;
  border: none;
  color: #2c3e50;
  padding: 0;
}
:deep(.ai-markdown-body blockquote) {
  border-left: 4px solid #90caf9;
  background: #e3f2fd;
  padding: 8px 12px;
  border-radius: 0 8px 8px 0;
  margin: 8px 0;
  color: #1565c0;
}
:deep(.ai-markdown-body table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 0.92em;
}
:deep(.ai-markdown-body th) {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  padding: 6px 12px;
  text-align: left;
  color: #1565c0;
}
:deep(.ai-markdown-body td) {
  border: 1px solid #e0e0e0;
  padding: 6px 12px;
}
:deep(.ai-markdown-body tr:nth-child(even)) { background: #f8f9fa; }
:deep(.ai-markdown-body a) { color: #1976d2; text-decoration: underline; }
:deep(.ai-markdown-body hr) { border: none; border-top: 1px solid #e0e0e0; margin: 12px 0; }
</style>
