import { $$, $, showPanel, confirmDialog, toast, formatDateBR } from './ui.js';
import { saveCanteiro, loadCanteiro, listCanteiros, removeCanteiro } from './storage.js';
import { buildMap } from './map.js';
import { startScan, stopScan, processQrResult } from './scanner.js';
import { addSamplesManual, previewSamplesManual } from './manual.js';
import { exportJSON, exportPDF } from './export.js';

export const STATE = {
  amostras: [],
  ladoAtual: 'direito',
  configuracao: {},
  canteiroAtual: null,
};

document.addEventListener('DOMContentLoaded', () => {
  $('#data-plantio').valueAsDate = new Date();
  bindEvents();
  refreshSavedList();
});

function bindEvents() {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const actions = {
      'novo-canteiro': novoCanteiro,
      'listar-canteiros': () => ($('#saved-canteiros-list').hidden = !$('#saved-canteiros-list').hidden),
      'importar-dados': () => $('#import-input').click(),
      'iniciar-scan': iniciarScan,
      'entrada-manual': mostrarEntradaManual,
      'voltar-menu': () => showPanel('main-menu'),
      'trocar-lado': trocarLado,
      'finalizar-scan': finalizarScan,
      'parar-scan': pararScan,
      'adicionar-manual': adicionarAmostraManual,
      'preview-manual': previewAmostras,
      'voltar-setup': () => showPanel('setup-panel'),
      'continuar-adicionando': () => showPanel('setup-panel'),
      'limpar-canteiro': limparCanteiro,
      'exportar-json': () => exportJSON(STATE),
      'exportar-pdf': () => exportPDF(STATE),
    };
    actions[action]?.();
  });

  $$('.lado-btn').forEach((b) => b.addEventListener('click', () => {
    $$('.lado-btn').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    STATE.ladoAtual = b.dataset.lado;
    $('#current-side').textContent = STATE.ladoAtual === 'direito' ? 'Direito' : 'Esquerdo';
  }));

  $('#import-input').addEventListener('change', onImportFile);
}

function novoCanteiro() {
  STATE.amostras = [];
  STATE.configuracao = {};
  STATE.canteiroAtual = null;
  $('#canteiro-num').value = '';
  $('#data-plantio').valueAsDate = new Date();
  $('#tipo-teste').value = '';
  $$('.lado-btn').forEach((x) => x.classList.remove('active'));
  $('[data-lado="direito"]').classList.add('active');
  STATE.ladoAtual = 'direito';
  showPanel('setup-panel');
}

export function refreshSavedList() {
  const savedList = $('#saved-canteiros-list');
  const container = $('#canteiros-container');
  container.innerHTML = '';
  const items = listCanteiros();
  if (items.length === 0) { savedList.hidden = true; return; }
  savedList.hidden = false;
  for (const { key, dados } of items) {
    const div = document.createElement('div');
    div.className = 'canteiro-item';
    div.innerHTML = `
      <div class="canteiro-info-item">
        <strong>Canteiro: ${dados.configuracao.canteiro}</strong><br>
        <small>📅 ${formatDateBR(dados.configuracao.data)} |
        🧪 ${dados.configuracao.tipoTeste} |
        📊 ${dados.amostras.length} amostras</small>
      </div>
      <div class="canteiro-actions">
        <button class="btn btn-small btn-primary" data-open="${key}">Abrir</button>
        <button class="btn btn-small btn-danger" data-del="${key}">Excluir</button>
      </div>`;
    container.appendChild(div);
  }
  container.onclick = async (ev) => {
    const open = ev.target.closest('[data-open]');
    const del = ev.target.closest('[data-del]');
    if (open) {
      const ok = open.getAttribute('data-open');
      abrirCanteiro(ok.replace('canteiro_', ''));
    } else if (del) {
      const key = del.getAttribute('data-del');
      const canteiro = key.replace('canteiro_', '');
      const ok = await confirmDialog('Excluir Canteiro', `Deseja realmente excluir o canteiro ${canteiro}?\n\nTodos os dados serão perdidos!`);
      if (ok) { removeCanteiro(canteiro); refreshSavedList(); toast('Canteiro excluído com sucesso!'); }
    }
  };
}

function abrirCanteiro(canteiro) {
  const dados = loadCanteiro(canteiro);
  if (!dados) return toast('Erro ao carregar canteiro!');
  STATE.configuracao = dados.configuracao;
  STATE.amostras = dados.amostras || [];
  STATE.canteiroAtual = canteiro;
  $('#canteiro-num').value = STATE.configuracao.canteiro;
  $('#data-plantio').value = STATE.configuracao.data;
  $('#tipo-teste').value = STATE.configuracao.tipoTeste;
  buildMap(STATE);
  showPanel('map-panel');
}

// ------- Scan -------
async function iniciarScan() {
  if (!validarConfiguracao()) return;
  showPanel('scanning-panel');
  const ok = await startScan($('#qr-video'), (result) => processQrResult(result, STATE, saveAndUpdate), (err) => toast('Erro ao acessar câmera.'));
  if (ok) { $('#scan-status').textContent = 'Câmera ativa - Posicione o QR code'; atualizarContadorAmostras(); }
}
function finalizarScan() {
  if (STATE.amostras.length === 0) return toast('Nenhuma amostra foi lida ainda!');
  pararScan(); buildMap(STATE);
}
function pararScan() { stopScan(); showPanel('setup-panel'); }
function trocarLado() {
  STATE.ladoAtual = STATE.ladoAtual === 'direito' ? 'esquerdo' : 'direito';
  $('#current-side').textContent = STATE.ladoAtual === 'direito' ? 'Direito' : 'Esquerdo';
}
function atualizarContadorAmostras() {
  $('#sample-count').textContent = STATE.amostras.length;
  $('#current-side').textContent = STATE.ladoAtual === 'direito' ? 'Direito' : 'Esquerdo';
}

// ------- Manual -------
function mostrarEntradaManual() {
  if (!validarConfiguracao()) return;
  const proxima = STATE.amostras.filter(a=>a.lado===STATE.ladoAtual).length + 1;
  $('#manual-posicao').value = proxima;
  $('#manual-lado').value = STATE.ladoAtual;
  $('#manual-codigo').value = '';
  $('#manual-tipo-teste-individual').value = STATE.configuracao.tipoTeste;
  $('#manual-tipo-remessa').value = '';
  $('#preview-area').hidden = true;
  showPanel('manual-entry-panel');
}
function adicionarAmostraManual() { addSamplesManual(STATE); saveAndUpdate(); }
function previewAmostras() { previewSamplesManual(STATE); }

// ------- Config / Persist -------
function validarConfiguracao() {
  const canteiro = $('#canteiro-num').value.trim();
  const data = $('#data-plantio').value;
  const tipo = $('#tipo-teste').value;
  if (!canteiro || !data || !tipo) { toast('Preencha todos os campos obrigatórios!'); return false; }
  STATE.configuracao = { canteiro, data, tipoTeste: tipo, ladoInicial: STATE.ladoAtual };
  return true;
}
function saveAndUpdate() {
  saveCanteiro(STATE.configuracao, STATE.amostras);
  atualizarContadorAmostras();
  refreshSavedList();
}

async function limparCanteiro() {
  const ok = await confirmDialog('Limpar Canteiro', `Deseja realmente limpar todas as amostras do canteiro ${STATE.configuracao.canteiro}?\n\nEsta ação não pode ser desfeita!`);
  if (!ok) return;
  STATE.amostras = [];
  saveAndUpdate();
  buildMap(STATE);
  toast('Canteiro limpo com sucesso!');
}

// ------- Import -------
function onImportFile(ev) {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const dados = JSON.parse(reader.result);
      if (!dados.configuracao || !dados.amostras) return toast('Arquivo inválido');
      const exists = localStorage.getItem('canteiro_' + dados.configuracao.canteiro);
      if (exists && !confirm(`Canteiro ${dados.configuracao.canteiro} já existe. Deseja sobrescrever?`)) return;
      STATE.configuracao = dados.configuracao;
      STATE.amostras = dados.amostras;
      saveAndUpdate();
      refreshSavedList();
      toast(`Canteiro ${STATE.configuracao.canteiro} importado: ${STATE.amostras.length} amostras`);
    } catch (e) {
      console.error(e); toast('Erro ao processar arquivo.');
    }
  };
  reader.readAsText(file);
}
