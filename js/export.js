import { $, toast } from './ui.js';

export function exportJSON(STATE) {
  const dados = {
    configuracao: STATE.configuracao,
    amostras: STATE.amostras,
    dataExportacao: new Date().toISOString(),
    versao: '2.0'
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Mapa_Canteiro_${STATE.configuracao.canteiro}_${STATE.configuracao.data.replace(/-/g,'')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Mapa exportado em JSON com sucesso!');
}

export async function exportPDF(STATE) {
  try {
    if (typeof window.jspdf === 'undefined') return toast('Biblioteca PDF não carregada.');
    const btn = event?.target;
    const label = btn?.textContent;
    if (btn) { btn.textContent = '⏳ Gerando PDF...'; btn.disabled = true; }
    await new Promise(r => setTimeout(r, 50));

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p','mm','a4');
    const margem = 20;
    const largura = 210 - (margem*2);
    let y = margem;

    pdf.setFontSize(18); pdf.setFont('helvetica','bold');
    pdf.text(`Mapa do Canteiro ${STATE.configuracao.canteiro}`, margem, y); y += 15;

    pdf.setFontSize(12); pdf.setFont('helvetica','normal');
    pdf.text(`Data: ${new Date(STATE.configuracao.data).toLocaleDateString('pt-BR')}`, margem, y);
    pdf.text(`Teste: ${STATE.configuracao.tipoTeste}`, margem+60, y);
    pdf.text(`Amostras: ${STATE.amostras.length}`, margem+120, y); y += 10;
    pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margem, y); y += 20;

    const colW = largura/3, rowH = 10;

    // Cabeçalho
    pdf.setFillColor(240,240,240);
    pdf.rect(margem, y, colW, rowH, 'F');
    pdf.rect(margem+colW, y, colW, rowH, 'F');
    pdf.rect(margem+colW*2, y, colW, rowH, 'F');
    pdf.setFont('helvetica','bold');
    pdf.text('Posição', margem+5, y+7);
    pdf.text('Lado Esquerdo', margem+colW+5, y+7);
    pdf.text('Lado Direito', margem+colW*2+5, y+7);
    y += rowH;

    const esq = STATE.amostras.filter(a=>a.lado==='esquerdo').sort((a,b)=>a.posicao-b.posicao);
    const dir = STATE.amostras.filter(a=>a.lado==='direito').sort((a,b)=>a.posicao-b.posicao);
    const maxPos = Math.max(esq.length, dir.length, 45);

    pdf.setFont('helvetica','normal'); pdf.setFontSize(9);

    for (let i=0;i<maxPos;i++) {
      if (y > 250) {
        pdf.addPage(); y = margem;
        pdf.setFillColor(240,240,240);
        pdf.rect(margem, y, colW, rowH, 'F');
        pdf.rect(margem+colW, y, colW, rowH, 'F');
        pdf.rect(margem+colW*2, y, colW, rowH, 'F');
        pdf.setFont('helvetica','bold'); pdf.setFontSize(10);
        pdf.text('Posição', margem+5, y+7);
        pdf.text('Lado Esquerdo', margem+colW+5, y+7);
        pdf.text('Lado Direito', margem+colW*2+5, y+7);
        y += rowH;
        pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
      }

      const pos = i+1;
      const aE = esq.find(a=>a.posicao===pos);
      const aD = dir.find(a=>a.posicao===pos);

      pdf.rect(margem, y, colW, rowH*2);
      pdf.rect(margem+colW, y, colW, rowH*2);
      pdf.rect(margem+colW*2, y, colW, rowH*2);

      pdf.setFont('helvetica','bold'); pdf.text(String(pos), margem+5, y+6);
      pdf.setFont('helvetica','normal');

      if (aE) {
        const data = new Date(aE.timestamp).toLocaleDateString('pt-BR');
        const info = `${aE.tipoTeste||STATE.configuracao.tipoTeste} | ${aE.tipoRemessa||'N/A'} | ${data}${aE.manual?' (Manual)':''}`;
        pdf.setFont('helvetica','bold'); pdf.text(aE.codigo, margem+colW+5, y+6);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.text(info, margem+colW+5, y+12); pdf.setFontSize(9);
      } else {
        pdf.setTextColor(128); pdf.text('Vazio', margem+colW+5, y+10); pdf.setTextColor(0);
      }

      if (aD) {
        const data = new Date(aD.timestamp).toLocaleDateString('pt-BR');
        const info = `${aD.tipoTeste||STATE.configuracao.tipoTeste} | ${aD.tipoRemessa||'N/A'} | ${data}${aD.manual?' (Manual)':''}`;
        pdf.setFont('helvetica','bold'); pdf.text(aD.codigo, margem+colW*2+5, y+6);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.text(info, margem+colW*2+5, y+12); pdf.setFontSize(9);
      } else {
        pdf.setTextColor(128); pdf.text('Vazio', margem+colW*2+5, y+10); pdf.setTextColor(0);
      }

      y += rowH*2;
    }

    const nome = `Mapa_Canteiro_${STATE.configuracao.canteiro}_${STATE.configuracao.data.replace(/-/g,'')}.pdf`;
    pdf.save(nome);
    if (btn) { btn.textContent = label; btn.disabled = false; }
    toast('PDF gerado com sucesso!');
  } catch (e) {
    console.error(e);
    const btn = event?.target;
    if (btn) { btn.textContent = '📑 Exportar PDF'; btn.disabled = false; }
    toast('Erro ao gerar PDF: ' + e.message);
  }
}
