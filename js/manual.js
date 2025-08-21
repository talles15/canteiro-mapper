import { $, toast } from './ui.js';
import { saveCanteiro } from './storage.js';

export function addSamplesManual(STATE) {
  const codigosInput = $('#manual-codigo').value.trim();
  const tipoTeste = $('#manual-tipo-teste-individual').value;
  const tipoRemessa = $('#manual-tipo-remessa').value;
  const lado = $('#manual-lado').value;
  const posIni = parseInt($('#manual-posicao').value, 10);

  if (!codigosInput) return toast('Insira os códigos');
  if (!tipoTeste) return toast('Selecione o tipo de teste');
  if (!tipoRemessa) return toast('Selecione a origem');
  if (!posIni || posIni < 1) return toast('Posição inicial inválida');

  const codigos = codigosInput.split(';').map(c => c.trim()).filter(Boolean);
  const setUnique = new Set(codigos);
  if (setUnique.size !== codigos.length) return toast('Códigos duplicados no input');

  const existentes = codigos.filter(c => STATE.amostras.some(a => a.codigo === c && a.tipoTeste === tipoTeste));
  if (existentes.length) return toast(`Códigos já existem para ${tipoTeste}: ${existentes.join(', ')}`);

  // Remover conflitos (se houver confirmação)
  const conflitos = [];
  codigos.forEach((c, i) => {
    const pos = posIni + i;
    const confl = STATE.amostras.find(a => a.lado === lado && a.posicao === pos);
    if (confl) conflitos.push(`Posição ${pos}: ${confl.codigo} (${confl.tipoTeste||'N/A'})`);
  });
  if (conflitos.length) {
    const ok = confirm(`⚠️ CONFLITOS DE POSIÇÃO:\n\n${conflitos.join('\n')}\n\nDeseja substituir?`);
    if (!ok) return;
    codigos.forEach((c,i) => {
      const pos = posIni + i;
      STATE.amostras = STATE.amostras.filter(a => !(a.lado === lado && a.posicao === pos));
    });
  }

  const resumo = [];
  codigos.forEach((codigo, i) => {
    const amostra = {
      codigo,
      url: `http://softsulsistemas.com.br/?codigoamostra=${codigo}`,
      lado,
      posicao: posIni + i,
      tipoRemessa,
      tipoTeste,
      timestamp: new Date().toISOString(),
      manual: true
    };
    STATE.amostras.push(amostra);
    resumo.push(`${codigo} (${tipoTeste}) → Pos. ${posIni+i}`);
  });

  saveCanteiro(STATE.configuracao, STATE.amostras);
  alert(`✅ ${codigos.length} amostra(s) adicionada(s)!\n\nTeste: ${tipoTeste}\nOrigem: ${tipoRemessa}\nLado: ${lado}\n\nDetalhes:\n${resumo.join('\n')}`);

  $('#manual-codigo').value = '';
  $('#manual-tipo-teste-individual').value = '';
  $('#manual-tipo-remessa').value = '';
  $('#preview-area').hidden = true;

  const prox = Math.max(0, ...STATE.amostras.filter(a => a.lado === lado).map(a => a.posicao)) + 1;
  $('#manual-posicao').value = prox;
}

export function previewSamplesManual(STATE) {
  const codigosInput = $('#manual-codigo').value.trim();
  const tipoTeste = $('#manual-tipo-teste-individual').value;
  const tipoRemessa = $('#manual-tipo-remessa').value;
  const lado = $('#manual-lado').value;
  const posIni = parseInt($('#manual-posicao').value, 10);

  if (!codigosInput) return toast('Digite os códigos');
  if (!posIni || posIni < 1) return toast('Posição inicial inválida');

  const codigos = codigosInput.split(';').map(c => c.trim()).filter(Boolean);
  if (!codigos.length) return toast('Nenhum código válido');

  const tipoPrev = tipoTeste || 'Não selecionado';
  let html = `<strong>📊 Será(ão) criada(s) ${codigos.length} amostra(s) para ${tipoPrev}:</strong><br><br>`;

  codigos.forEach((codigo, i) => {
    const pos = posIni + i;
    const existeNoTeste = tipoTeste ? STATE.amostras.some(a => a.codigo === codigo && a.tipoTeste === tipoTeste) : false;
    const existeOutro = tipoTeste ? STATE.amostras.some(a => a.codigo === codigo && a.tipoTeste !== tipoTeste) : false;
    const conflito = STATE.amostras.find(a => a.lado === lado && a.posicao === pos);

    let status = '✅';
    let obs = '';
    if (existeNoTeste && tipoTeste) { status = '❌'; obs += ` (JÁ EXISTE PARA ${tipoTeste})`; }
    else if (existeOutro && tipoTeste) {
      const outro = STATE.amostras.find(a => a.codigo === codigo && a.tipoTeste !== tipoTeste);
      obs += ` (já existe para ${outro?.tipoTeste})`;
    }
    if (conflito) { status = status === '✅' ? '⚠️' : status; obs += ` | substituirá ${conflito.codigo} (${conflito.tipoTeste||'N/A'})`; }

    html += `${status} <strong>${codigo}</strong> (${tipoPrev}) → Posição ${pos} (${lado})${obs}<br>`;
  });

  if (tipoRemessa) html += `<br><strong>Origem:</strong> ${tipoRemessa}`;

  $('#preview-content').innerHTML = html;
  $('#preview-area').hidden = false;
}
