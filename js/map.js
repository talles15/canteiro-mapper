import { $, $$, showPanel, confirmDialog, toast } from './ui.js';
import { saveCanteiro } from './storage.js';

const MAX_POS = 45;

export function buildMap(STATE) {
  showPanel('map-panel');
  $('#canteiro-title').textContent = `Mapa do Canteiro ${STATE.configuracao.canteiro}`;
  $('#canteiro-details').innerHTML =
    `📅 Data: ${new Date(STATE.configuracao.data).toLocaleDateString('pt-BR')} | ` +
    `🧪 Teste: ${STATE.configuracao.tipoTeste} | ` +
    `📊 Total de Amostras: ${STATE.amostras.length}`;

  const esquerda = STATE.amostras.filter(a => a.lado === 'esquerdo').sort((a,b)=>a.posicao-b.posicao);
  const direita  = STATE.amostras.filter(a => a.lado === 'direito').sort((a,b)=>a.posicao-b.posicao);
  const maxLinhas = Math.max(esquerda.length, direita.length, MAX_POS);

  const tbody = $('#mapa-tbody');
  tbody.innerHTML = '';

  for (let i=0;i<maxLinhas;i++) {
    const tr = document.createElement('tr');

    const tdPos = document.createElement('td');
    tdPos.textContent = i+1;
    tdPos.style.fontWeight = 'bold';
    tr.appendChild(tdPos);

    const makeCell = (lado, arr) => {
      const td = document.createElement('td');
      td.className = 'sample-cell';
      const item = arr.find(a => a.posicao === i+1);
      if (item) {
        td.innerHTML = `
          <strong>${item.codigo}</strong>
          <div class="sample-info">${item.tipoTeste || 'N/A'}${item.tipoRemessa ? ' | ' + item.tipoRemessa : ''} | ${new Date(item.timestamp).toLocaleDateString('pt-BR')}${item.manual ? ' (Manual)' : ''}</div>
        `;
        td.dataset.action = 'editar-amostra';
        td.dataset.codigo = item.codigo;
      } else {
        td.innerHTML = '<em style="color:#ccc;">Vazio</em>';
        td.classList.add('empty');
        td.dataset.action = 'adicionar-pos';
        td.dataset.lado = lado;
        td.dataset.posicao = String(i+1);
      }
      return td;
    };

    tr.appendChild(makeCell('esquerdo', esquerda));
    tr.appendChild(makeCell('direito', direita));
    tbody.appendChild(tr);
  }

  // Delegação de eventos
  tbody.onclick = (ev) => {
    const cell = ev.target.closest('[data-action]');
    if (!cell) return;
    const action = cell.dataset.action;
    if (action === 'editar-amostra') {
      const amostra = STATE.amostras.find(a => a.codigo === cell.dataset.codigo);
      if (!amostra) return toast('Amostra não encontrada');
      editarOuRemoverAmostra(amostra, STATE);
    } else if (action === 'adicionar-pos') {
      adicionarAmostraNaPosicao(cell.dataset.lado, Number(cell.dataset.posicao), STATE);
    }
  };
}

async function editarOuRemoverAmostra(amostra, STATE) {
  const data = new Date(amostra.timestamp).toLocaleDateString('pt-BR');
  const info = `AMOSTRA: ${amostra.codigo}
POSIÇÃO: ${amostra.posicao} (${amostra.lado})
ORIGEM: ${amostra.tipoRemessa || 'Não definido'}
DATA: ${data}`;

  // 1) Editar posição
  if (confirm(`${info}\n\n🔷 OPÇÃO 1: EDITAR POSIÇÃO\nClique OK para editar a posição\nClique CANCELAR para ver próxima opção`)) {
    const nova = prompt(`✏️ EDITAR POSIÇÃO\n\nAmostra: ${amostra.codigo}\nPosição atual: ${amostra.posicao} (${amostra.lado})\n\n➡️ Digite a nova posição:`, amostra.posicao);
    if (!nova) return;
    const pos = parseInt(nova, 10);
    if (isNaN(pos) || pos < 1) return toast('Posição inválida');
    const ocup = STATE.amostras.find(a => a.lado === amostra.lado && a.posicao === pos && a.codigo !== amostra.codigo);
    if (ocup) return toast(`Posição ${pos} ocupada por ${ocup.codigo}`);
    const idx = STATE.amostras.findIndex(a => a.codigo === amostra.codigo);
    if (idx >= 0) {
      STATE.amostras[idx].posicao = pos;
      saveCanteiro(STATE.configuracao, STATE.amostras);
      buildMap(STATE);
      toast(`Amostra ${amostra.codigo} movida para posição ${pos}`);
    }
    return;
  }

  // 2) Limpar posição
  if (confirm(`${info}\n\n🔷 OPÇÃO 2: LIMPAR POSIÇÃO\nClique OK para limpar esta posição\nClique CANCELAR para ver próxima opção`)) {
    STATE.amostras = STATE.amostras.filter(a => a.codigo !== amostra.codigo);
    saveCanteiro(STATE.configuracao, STATE.amostras);
    buildMap(STATE);
    toast(`Posição ${amostra.posicao} (${amostra.lado}) limpa`);
    return;
  }

  // 3) Remover amostra
  if (confirm(`${info}\n\n🔷 OPÇÃO 3: REMOVER AMOSTRA\nClique OK para remover completamente\nClique CANCELAR para sair`)) {
    STATE.amostras = STATE.amostras.filter(a => a.codigo !== amostra.codigo);
    saveCanteiro(STATE.configuracao, STATE.amostras);
    buildMap(STATE);
    toast(`Amostra ${amostra.codigo} removida`);
  }
}

function promptTipoTeste(defaultTipo) {
  const opt = prompt(`Tipo de teste:\n1 - GA\n2 - EA48\n3 - EA72\n\nDigite o número da opção:`, '');
  if (opt === '1') return 'GA';
  if (opt === '2') return 'EA48';
  if (opt === '3') return 'EA72';
  return defaultTipo || 'GA';
}

function promptTipoRemessa() {
  const opt = prompt(`Origem da amostra:\n1 - Lote\n2 - TSI\n3 - Carregamento\n4 - Teste\n5 - Reclamação\n6 - Entrada de Semente\n\nDigite o número da opção:`, '');
  return ({'1':'Lote','2':'TSI','3':'Carregamento','4':'Teste','5':'Reclamação','6':'Entrada de Semente'}[opt]) || 'Teste';
}

function adicionarAmostraNaPosicao(lado, posicao, STATE) {
  const codigo = prompt(`Adicionar amostra na posição ${posicao} (${lado}):\n\nCódigo da amostra:`);
  if (!codigo || !codigo.trim()) return;
  const codigoLimpo = codigo.trim();
  const tipoTeste = promptTipoTeste(STATE.configuracao.tipoTeste);
  const tipoRemessa = promptTipoRemessa();

  if (STATE.amostras.some(a => a.codigo === codigoLimpo && a.tipoTeste === tipoTeste)) {
    return toast(`Amostra ${codigoLimpo} já existe no teste ${tipoTeste}`);
  }

  const amostra = {
    codigo: codigoLimpo,
    url: `http://softsulsistemas.com.br/?codigoamostra=${codigoLimpo}`,
    lado, posicao,
    tipoRemessa, tipoTeste,
    timestamp: new Date().toISOString(),
    manual: true
  };
  STATE.amostras.push(amostra);
  saveCanteiro(STATE.configuracao, STATE.amostras);
  buildMap(STATE);
  toast(`Amostra ${codigoLimpo} adicionada`);
}
