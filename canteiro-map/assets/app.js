// assets/app.js
// Mapeamento de Canteiros — versão otimizada para GitHub Pages (PWA + A11y + Modules)

const CONSTANTS = Object.freeze({
  MAX_POR_LADO: 45,
  TIPOS_TESTE: ["GA", "EA48", "EA72"],
  TIPOS_REMESSA: ["Lote","TSI","Carregamento","Teste","Reclamação","Entrada de Semente"],
  STORAGE_PREFIX: "canteiro_",
});

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const toast = (msg, type="info", timeout=2600) => {
  const cont = $("#toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  cont.appendChild(el);
  setTimeout(()=> el.remove(), timeout);
};

const utils = {
  formatDate: (d) => {
    if (!d) return "";
    try{ return new Date(d).toLocaleDateString("pt-BR"); }catch{ return d; }
  },
  generateURL: (codigo) => `http://softsulsistemas.com.br/?codigoamostra=${codigo}`,
  vibrate: () => navigator.vibrate && navigator.vibrate(60),
};

const storage = {
  save(canteiro, payload){
    if (!canteiro) return;
    localStorage.setItem(CONSTANTS.STORAGE_PREFIX + canteiro, JSON.stringify(payload));
  },
  load(canteiro){
    const raw = localStorage.getItem(CONSTANTS.STORAGE_PREFIX + canteiro);
    return raw ? JSON.parse(raw) : null;
  },
  remove(canteiro){
    localStorage.removeItem(CONSTANTS.STORAGE_PREFIX + canteiro);
  },
  list(){
    const arr = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if (k.startsWith(CONSTANTS.STORAGE_PREFIX)){
        const val = JSON.parse(localStorage.getItem(k));
        arr.push({ id: k.replace(CONSTANTS.STORAGE_PREFIX,""), ...val });
      }
    }
    return arr.sort((a,b)=> (b.ultimaAtualizacao||"").localeCompare(a.ultimaAtualizacao||""));
  }
};

const state = {
  scanner: null,
  amostras: [],
  ladoAtual: "direito",
  configuracao: {},
  canteiroAtual: null,
};

const ui = {
  showPanel(id){
    $$(".panel").forEach(p => p.classList.remove("active"));
    $("#"+id).classList.add("active");
  },
  updateCounts(){
    $("#sample-count").textContent = state.amostras.length;
    $("#current-side").textContent = state.ladoAtual === "direito" ? "Direito" : "Esquerdo";
  },
  setLoading(btn, on){
    if (!btn) return;
    btn.classList.toggle("loading", !!on);
    btn.disabled = !!on;
  },
  renderSalvos(){
    const cont = $("#canteiros-container");
    cont.innerHTML = "";
    const all = storage.list();
    if (all.length===0){ $("#saved-canteiros-list").classList.add("hidden"); return; }
    $("#saved-canteiros-list").classList.remove("hidden");
    for(const c of all){
      const card = document.createElement("div");
      card.className = "info-box";
      card.innerHTML = `
        <div class="card-content">
          <div>
            <strong>Canteiro: ${c.configuracao?.canteiro||c.id}</strong><br>
            <small>📅 ${utils.formatDate(c.configuracao?.data)} |
            🧪 ${c.configuracao?.tipoTeste} |
            📊 ${c.amostras?.length||0} amostras</small>
          </div>
          <div class="button-group">
            <button class="btn btn-small btn-primary" data-open="${c.id}">Abrir</button>
            <button class="btn btn-small btn-danger" data-del="${c.id}">Excluir</button>
          </div>
        </div>`;
      cont.appendChild(card);
    }
  }
};

const modal = (()=>{
  const dlg = $("#confirmModal");
  return {
    open(title, message){ $("#modal-title").textContent = title; $("#modal-message").textContent = message; return dlg.showModal(); },
    close(){ dlg.close(); },
    element: dlg,
  };
})();

const app = {
  init(){
    // Prefill date with today
    $("#data-plantio").valueAsDate = new Date();
    // Lado toggle
    $$(".btn-toggle[data-lado]").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".btn-toggle[data-lado]").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed","false"); });
        btn.classList.add("active"); btn.setAttribute("aria-pressed","true");
        state.ladoAtual = btn.dataset.lado;
      });
    });

    // Actions
    document.body.addEventListener("click", (e) => {
      const t = e.target.closest("[data-action]");
      if (!t) return;
      const a = t.dataset.action;
      if (this.actions[a]) this.actions[a](t, e);
    });

    // Saved list open/delete
    $("#canteiros-container").addEventListener("click", (e)=>{
      const open = e.target.closest("[data-open]"); const del = e.target.closest("[data-del]");
      if (open) this.abrirCanteiro(open.dataset.open);
      if (del) this.confirmarExclusao(open?.dataset.open ?? del.dataset.del);
    });

    // Import
    $("#import-input").addEventListener("change", (ev)=> this.processarImportacao(ev));

    ui.renderSalvos();
  },

  actions: {
    "novo-canteiro": () => app.novoCanteiro(),
    "toggle-salvos": () => { $("#saved-canteiros-list").classList.toggle("hidden"); ui.renderSalvos(); },
    "importar-dados": () => $("#import-input").click(),
    "voltar-menu": () => ui.showPanel("main-menu"),
    "voltar-setup": () => ui.showPanel("setup-panel"),
    "iniciar-scan": () => app.iniciarScan(),
    "entrada-manual": () => app.mostrarEntradaManual(),
    "trocar-lado": () => app.trocarLado(),
    "finalizar-scan": () => app.finalizarScan(),
    "parar-scan": () => app.pararScan(),
    "continuar-adicionando": () => ui.showPanel("setup-panel"),
    "limpar-canteiro": () => app.limparCanteiro(),
    "exportar-json": () => app.exportarMapa(),
    "exportar-pdf": (btn,e) => app.exportarPDF(e),
    "adicionar-manual": () => app.adicionarAmostraManual(),
    "preview-manual": () => app.previewAmostras(),
  },

  novoCanteiro(){
    state.amostras = [];
    state.configuracao = {};
    state.canteiroAtual = null;
    $("#canteiro-num").value = "";
    $("#data-plantio").valueAsDate = new Date();
    $("#tipo-teste").value = "";
    $$(".btn-toggle[data-lado]").forEach(b => b.classList.remove("active"));
    const d = $('.btn-toggle[data-lado="direito"]');
    d.classList.add("active"); d.setAttribute("aria-pressed","true");
    state.ladoAtual = "direito";
    ui.showPanel("setup-panel");
  },

  abrirCanteiro(id){
    const dados = storage.load(id);
    if (!dados){ toast("Erro ao carregar canteiro!", "error"); return; }
    state.configuracao = dados.configuracao;
    state.amostras = dados.amostras || [];
    state.canteiroAtual = id;
    $("#canteiro-num").value = state.configuracao.canteiro || "";
    $("#data-plantio").value = state.configuracao.data || "";
    $("#tipo-teste").value = state.configuracao.tipoTeste || "";
    this.gerarMapa();
    ui.showPanel("map-panel");
  },

  confirmarExclusao(id){
    modal.open("Excluir Canteiro", `Deseja realmente excluir o canteiro ${id}? Todos os dados serão perdidos!`);
    modal.element.addEventListener("close", ()=>{
      if (modal.element.returnValue === "confirm"){
        storage.remove(id);
        ui.renderSalvos();
        toast("Canteiro excluído!", "success");
      }
    }, {once:true});
  },

  validarConfig(){
    const canteiro = $("#canteiro-num").value.trim();
    const data = $("#data-plantio").value;
    const tipo = $("#tipo-teste").value;
    if (!canteiro || !data || !tipo){ toast("Preencha número, data e tipo do teste.", "error"); return false; }
    state.configuracao = { canteiro, data, tipoTeste: tipo, ladoInicial: state.ladoAtual };
    return true;
  },

  async iniciarScan(){
    if (!this.validarConfig()) return;
    ui.showPanel("scanning-panel");
    try{
      const video = $("#qr-video");
      state.scanner = new QrScanner(video, (res)=> this.processarQRCode(res), {
        highlightScanRegion: true, highlightCodeOutline: true,
      });
      await state.scanner.start();
      $("#scan-status").textContent = "Câmera ativa - Posicione o QR code";
      ui.updateCounts();
    }catch(err){
      console.error(err); toast("Erro ao acessar a câmera. Verifique as permissões.", "error");
    }
  },

  processarQRCode(result){
    try{
      const url = result.data;
      const m = url.match(/codigoamostra=(\d+)/);
      if (!m){ toast("QR inválido (esperado codigoamostra=...)", "error"); return; }
      const codigo = m[1];
      if (state.amostras.some(a=> a.codigo===codigo)){ toast(`Amostra ${codigo} já lida!`, "warning"); return; }
      const pos = state.amostras.filter(a=> a.lado===state.ladoAtual).length + 1;
      state.amostras.push({
        codigo, url,
        lado: state.ladoAtual,
        posicao: pos,
        tipoTeste: state.configuracao.tipoTeste,
        timestamp: new Date().toISOString(),
        dataPlantioAmostra: state.configuracao.data, // define data do canteiro para QR
      });
      storage.save(state.configuracao.canteiro, {
        configuracao: state.configuracao, amostras: state.amostras, ultimaAtualizacao: new Date().toISOString()
      });
      ui.updateCounts(); utils.vibrate();
    }catch(e){
      console.error(e); toast("Erro ao processar QR", "error");
    }
  },

  trocarLado(){ state.ladoAtual = state.ladoAtual==="direito"?"esquerdo":"direito"; ui.updateCounts(); },
  finalizarScan(){
    if (state.amostras.length===0){ toast("Nenhuma amostra foi lida!", "warning"); return; }
    this.pararScan(); this.gerarMapa();
  },
  pararScan(){ if (state.scanner){ state.scanner.stop(); state.scanner=null; } ui.showPanel("setup-panel"); },

  mostrarEntradaManual(){
    if (!this.validarConfig()) return;
    const prox = state.amostras.filter(a=> a.lado===state.ladoAtual).length + 1;
    $("#manual-posicao").value = prox;
    $("#manual-lado").value = state.ladoAtual;
    $("#manual-codigo").value = "";
    $("#manual-tipo-teste-individual").value = state.configuracao.tipoTeste;
    $("#manual-tipo-remessa").value = "";
    $("#manual-data-plantio").value = state.configuracao.data || "";
    $("#preview-area").classList.add("hidden");
    ui.showPanel("manual-entry-panel");
  },

  coletarDadosManual(){
    return {
      codigosInput: $("#manual-codigo").value.trim(),
      tipoTesteIndividual: $("#manual-tipo-teste-individual").value,
      tipoRemessa: $("#manual-tipo-remessa").value,
      lado: $("#manual-lado").value,
      posicaoInicial: parseInt($("#manual-posicao").value,10),
      dataPlantioAmostra: $("#manual-data-plantio").value,
    };
  },

  validarDadosManual(d){
    if (!d.codigosInput){ toast("Informe os códigos das amostras.", "error"); return false; }
    if (!d.tipoTesteIndividual){ toast("Selecione o tipo de teste.", "error"); return false; }
    if (!d.tipoRemessa){ toast("Selecione a origem da amostra.", "error"); return false; }
    if (!d.posicaoInicial || d.posicaoInicial<1){ toast("Posição inicial inválida.", "error"); return false; }
    if (!d.dataPlantioAmostra){ toast("Selecione a data de plantio da amostra.", "error"); return false; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dataPlantioAmostra)){ toast("Data inválida (AAAA-MM-DD).", "error"); return false; }
    return true;
  },

  adicionarAmostraManual(){
    const d = this.coletarDadosManual();
    if (!this.validarDadosManual(d)) return;
    const codigos = d.codigosInput.split(";").map(c=>c.trim()).filter(Boolean);
    if (new Set(codigos).size !== codigos.length){ toast("Códigos duplicados no input.", "error"); return; }
    const existeMesmoTeste = codigos.filter(c=> state.amostras.some(a=> a.codigo===c && a.tipoTeste===d.tipoTesteIndividual));
    if (existeMesmoTeste.length){ toast(`Já existem no teste ${d.tipoTesteIndividual}: ${existeMesmoTeste.join(", ")}`, "error"); return; }

    // conflitos por posição
    const conflitos = [];
    for(let i=0;i<codigos.length;i++){
      const pos = d.posicaoInicial+i;
      const conf = state.amostras.find(a=> a.lado===d.lado && a.posicao===pos);
      if (conf) conflitos.push(`Posição ${pos}: ${conf.codigo} (${conf.tipoTeste||"N/A"})`);
    }
    if (conflitos.length){
      modal.open("Conflitos de posição", `⚠️ Há conflitos:\n\n${conflitos.join("\n")}\n\nDeseja substituir?`);
      modal.element.addEventListener("close", ()=>{
        if (modal.element.returnValue==="confirm"){
          for(let i=0;i<codigos.length;i++){
            const pos = d.posicaoInicial+i;
            state.amostras = state.amostras.filter(a=> !(a.lado===d.lado && a.posicao===pos));
          }
          this._criarAmostras(codigos,d);
        }
      }, {once:true});
      return;
    }
    this._criarAmostras(codigos,d);
  },

  _criarAmostras(codigos, d){
    const adicionadas = [];
    for(let i=0;i<codigos.length;i++){
      const codigo = codigos[i];
      const pos = d.posicaoInicial + i;
      state.amostras.push({
        codigo,
        url: utils.generateURL(codigo),
        lado: d.lado,
        posicao: pos,
        tipoRemessa: d.tipoRemessa,
        tipoTeste: d.tipoTesteIndividual,
        timestamp: new Date().toISOString(),
        dataPlantioAmostra: d.dataPlantioAmostra || state.configuracao.data,
        manual: true,
      });
      adicionadas.push(`${codigo} (${d.tipoTesteIndividual}) → Pos. ${pos}`);
    }
    storage.save(state.configuracao.canteiro, {
      configuracao: state.configuracao, amostras: state.amostras, ultimaAtualizacao: new Date().toISOString()
    });
    toast(`+${adicionadas.length} amostra(s) adicionada(s)!`, "success");
    // limpar campos (mantém data padrão)
    $("#manual-codigo").value="";
    $("#manual-tipo-teste-individual").value="";
    $("#manual-tipo-remessa").value="";
    $("#manual-data-plantio").value = state.configuracao.data || "";
    const prox = Math.max(...state.amostras.filter(a=>a.lado===$("#manual-lado").value).map(a=>a.posicao),0)+1;
    $("#manual-posicao").value = prox;
  },

  previewAmostras(){
    const d = this.coletarDadosManual();
    if (!d.codigosInput || !d.posicaoInicial || d.posicaoInicial<1){
      toast("Informe códigos e posição inicial válida para preview.", "warning"); return;
    }
    const codigos = d.codigosInput.split(";").map(c=>c.trim()).filter(Boolean);
    if (!codigos.length){ toast("Nenhum código válido.", "error"); return; }

    const tipoPrev = d.tipoTesteIndividual || "Não selecionado";
    let html = `<strong>📊 Será(ão) criada(s) ${codigos.length} amostra(s) para ${tipoPrev}:</strong><br><br>`;
    for(let i=0;i<codigos.length;i++){
      const codigo = codigos[i];
      const pos = d.posicaoInicial + i;
      const existeNoTeste = d.tipoTesteIndividual ? state.amostras.some(a=> a.codigo===codigo && a.tipoTeste===d.tipoTesteIndividual) : false;
      const existeOutro = d.tipoTesteIndividual ? state.amostras.some(a=> a.codigo===codigo && a.tipoTeste!==d.tipoTesteIndividual) : false;
      const conflito = state.amostras.find(a=> a.lado===d.lado && a.posicao===pos);
      let status="✅", obs="";
      if (existeNoTeste && d.tipoTesteIndividual){ status="❌"; obs += ` (JÁ EXISTE PARA ${d.tipoTesteIndividual})`; }
      else if (existeOutro && d.tipoTesteIndividual){ const ot = state.amostras.find(a=> a.codigo===codigo && a.tipoTeste!==d.tipoTesteIndividual); obs += ` (já existe para ${ot.tipoTeste})`; }
      if (conflito){ if (status==="✅") status="⚠️"; obs += ` | substituirá ${conflito.codigo} (${conflito.tipoTeste||"N/A"})`; }
      const dataMostrada = d.dataPlantioAmostra || state.configuracao.data || "";
      html += `${status} <strong>${codigo}</strong> (${tipoPrev}) → Posição ${pos} (${d.lado})${obs} — <em>Plantio: ${dataMostrada}</em><br>`;
    }
    $("#preview-content").innerHTML = html;
    $("#preview-area").classList.remove("hidden");
  },

  gerarMapa(){
    ui.showPanel("map-panel");
    const tiposUnicos = [...new Set(state.amostras.map(a=>a.tipoTeste).filter(Boolean))];
    const tipoTesteDisplay = tiposUnicos.length===0 ? state.configuracao.tipoTeste :
                             tiposUnicos.length===1 ? tiposUnicos[0] :
                             tiposUnicos.join(", ") + " (Múltiplos)";
    $("#canteiro-title").textContent = `Mapa do Canteiro ${state.configuracao.canteiro}`;
    $("#canteiro-details").innerHTML =
      `📅 Data: ${utils.formatDate(state.configuracao.data)} | 🧪 Teste: ${tipoTesteDisplay} | 📊 Total de Amostras: ${state.amostras.length}`;
    this.renderizarTabela();
  },

  renderizarTabela(){
    const esq = state.amostras.filter(a=>a.lado==="esquerdo").sort((a,b)=>a.posicao-b.posicao);
    const dir = state.amostras.filter(a=>a.lado==="direito").sort((a,b)=>a.posicao-b.posicao);
    const max = Math.max(esq.length, dir.length, CONSTANTS.MAX_POR_LADO);
    const tbody = $("#mapa-tbody"); tbody.innerHTML = "";
    for(let i=1;i<=max;i++){
      const tr = document.createElement("tr");
      const posTd = document.createElement("td"); posTd.style.fontWeight="700"; posTd.textContent = i; tr.appendChild(posTd);
      const aE = esq.find(a=>a.posicao===i);
      const aD = dir.find(a=>a.posicao===i);
      tr.appendChild(this._buildCell(aE, "esquerdo", i));
      tr.appendChild(this._buildCell(aD, "direito", i));
      tbody.appendChild(tr);
    }
  },

  _buildCell(amostra, lado, pos){
    const td = document.createElement("td"); td.className = "sample-cell";
    if (amostra){
      const cod = document.createElement("strong"); cod.textContent = amostra.codigo;
      const info = document.createElement("div"); info.className="sample-info";
      const tt = amostra.tipoTeste || "N/A";
      const origem = amostra.tipoRemessa ? " | " + amostra.tipoRemessa : "";
      const data = amostra.dataPlantioAmostra || state.configuracao.data;
      const dataTxt = data ? " | Plantio: " + utils.formatDate(data) : "";
      const manual = amostra.manual ? " (Manual)" : "";
      info.textContent = tt + origem + dataTxt + manual;
      td.appendChild(cod); td.appendChild(info);
      td.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); this._editarOuRemover(amostra); });
    }else{
      td.classList.add("empty");
      const em = document.createElement("em"); em.textContent = "Vazio"; em.style.color="#bbb"; td.appendChild(em);
      td.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); this._addNaPosicao(lado,pos); });
    }
    return td;
  },

  _editarOuRemover(amostra){
    const info = `AMOSTRA: ${amostra.codigo}\nPOSIÇÃO: ${amostra.posicao} (${amostra.lado})\nORIGEM: ${amostra.tipoRemessa||"Não definido"}\nPLANTIO: ${utils.formatDate(amostra.dataPlantioAmostra||state.configuracao.data)}`;
    modal.open("Editar / Remover", `${info}\n\nEscolha a ação`);
    modal.element.addEventListener("close", ()=>{
      if (modal.element.returnValue !== "confirm") return;
      // ao confirmar, perguntar via prompt simples a ação
      const ac = (prompt("1 - Editar posição\n2 - Limpar posição\n3 - Remover amostra\n\nDigite o número:","1")||"").trim();
      if (ac==="1") this._editarPosicao(amostra);
      else if (ac==="2") this._limparPosicao(amostra);
      else if (ac==="3") this._removerAmostra(amostra);
    }, {once:true});
  },

  _editarPosicao(amostra){
    const nv = prompt(`Nova posição para ${amostra.codigo} (atual ${amostra.posicao}):`, String(amostra.posicao));
    if (!nv) return;
    const pos = parseInt(nv,10);
    if (isNaN(pos)||pos<1){ toast("Posição inválida.", "error"); return; }
    const ocupada = state.amostras.find(a=> a.lado===amostra.lado && a.posicao===pos && a.codigo!==amostra.codigo);
    if (ocupada){ toast(`Posição ${pos} já ocupada (${ocupada.codigo}).`, "error"); return; }
    const idx = state.amostras.findIndex(a=> a.codigo===amostra.codigo && a.lado===amostra.lado && a.posicao===amostra.posicao);
    if (idx>-1){ state.amostras[idx].posicao = pos; this._persist(); this.gerarMapa(); toast("Posição atualizada!", "success"); }
  },

  _limparPosicao(amostra){
    state.amostras = state.amostras.filter(a=> !(a.codigo===amostra.codigo && a.lado===amostra.lado && a.posicao===amostra.posicao));
    this._persist(); this.gerarMapa(); toast("Posição limpa.", "success");
  },

  _removerAmostra(amostra){
    state.amostras = state.amostras.filter(a=> a.codigo!==amostra.codigo);
    this._persist(); this.gerarMapa(); toast("Amostra removida.", "success");
  },

  _addNaPosicao(lado,pos){
    const codigo = (prompt(`Adicionar amostra na posição ${pos} (${lado}).\nCódigo:`)||"").trim();
    if (!codigo) return;
    const dataPlantio = (prompt("Data do plantio da amostra (AAAA-MM-DD):", state.configuracao.data||"")||"").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPlantio)){ toast("Data inválida (AAAA-MM-DD).", "error"); return; }
    const tipoTeste = this._selecionarTipoTeste();
    const tipoRemessa = this._selecionarTipoRemessa();
    if (state.amostras.some(a=> a.codigo===codigo && a.tipoTeste===tipoTeste)){ toast(`Amostra ${codigo} já existe no teste ${tipoTeste}.`, "warning"); return; }
    state.amostras.push({
      codigo, url: utils.generateURL(codigo), lado, posicao: pos,
      tipoRemessa, tipoTeste, timestamp: new Date().toISOString(),
      dataPlantioAmostra: dataPlantio, manual: true
    });
    this._persist(); this.gerarMapa(); toast("Amostra adicionada!", "success");
  },

  _selecionarTipoTeste(){
    const m = { "1":"GA","2":"EA48","3":"EA72" };
    const es = (prompt("Tipo de teste:\n1 - GA\n2 - EA48\n3 - EA72\nNúmero:","1")||"").trim();
    return m[es] || state.configuracao.tipoTeste;
  },
  _selecionarTipoRemessa(){
    const m = { "1":"Lote","2":"TSI","3":"Carregamento","4":"Teste","5":"Reclamação","6":"Entrada de Semente" };
    const es = (prompt("Origem da amostra:\n1 - Lote\n2 - TSI\n3 - Carregamento\n4 - Teste\n5 - Reclamação\n6 - Entrada de Semente\nNúmero:","4")||"").trim();
    return m[es] || "Teste";
  },

  limparCanteiro(){
    modal.open("Limpar Canteiro", `Deseja limpar todas as amostras do canteiro ${state.configuracao.canteiro}?`);
    modal.element.addEventListener("close", ()=>{
      if (modal.element.returnValue==="confirm"){
        state.amostras = []; this._persist(); this.gerarMapa(); toast("Canteiro limpo.", "success");
      }
    }, {once:true});
  },

  exportarMapa(){
    const dados = {
      configuracao: state.configuracao,
      amostras: state.amostras,
      dataExportacao: new Date().toISOString(),
      versao: "2.1"
    };
    const blob = new Blob([JSON.stringify(dados,null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Mapa_Canteiro_${state.configuracao.canteiro}_${state.configuracao.data?.replace(/-/g,"")}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    toast("JSON exportado!", "success");
  },

  async exportarPDF(e){
    try{
      const btn = e?.target; const orig = btn?.textContent;
      if (btn){ ui.setLoading(btn, true); btn.textContent = "⏳ Gerando PDF..."; }
      await new Promise(r=>setTimeout(r,60));
      const { jsPDF } = window.jspdf;
      if (!jsPDF){ toast("Biblioteca PDF não carregada.", "error"); if(btn){btn.textContent=orig; ui.setLoading(btn,false);} return; }
      const pdf = new jsPDF("p","mm","a4");
      this._pdfBuild(pdf);
      const nome = `Mapa_Canteiro_${state.configuracao.canteiro}_${state.configuracao.data?.replace(/-/g,"")}.pdf`;
      pdf.save(nome);
      if (btn){ btn.textContent = orig; ui.setLoading(btn,false); }
      toast("PDF gerado!", "success");
    }catch(err){
      console.error(err); toast("Erro ao gerar PDF.", "error");
    }
  },

  _pdfBuild(pdf){
    const margem=20, largura=210-(margem*2); let y=margem;
    pdf.setFontSize(18); pdf.setFont("helvetica","bold");
    pdf.text(`Mapa do Canteiro ${state.configuracao.canteiro}`, margem, y); y+=15;
    pdf.setFontSize(12); pdf.setFont("helvetica","normal");
    pdf.text(`Data: ${utils.formatDate(state.configuracao.data)}`, margem, y);
    pdf.text(`Teste: ${state.configuracao.tipoTeste}`, margem+60, y);
    pdf.text(`Amostras: ${state.amostras.length}`, margem+120, y);
    y+=10;
    pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margem, y); y+=16;

    const col = largura/3, h=10;
    const header = ()=>{
      pdf.setFillColor(240,240,240);
      pdf.rect(margem, y, col, h, "F");
      pdf.rect(margem+col, y, col, h, "F");
      pdf.rect(margem+col*2, y, col, h, "F");
      pdf.setFont("helvetica","bold"); pdf.setFontSize(10);
      pdf.text("Posição", margem+5, y+7);
      pdf.text("Lado Esquerdo", margem+col+5, y+7);
      pdf.text("Lado Direito", margem+col*2+5, y+7);
    };
    header(); y+=h;

    const esq = state.amostras.filter(a=>a.lado==="esquerdo").sort((a,b)=>a.posicao-b.posicao);
    const dir = state.amostras.filter(a=>a.lado==="direito").sort((a,b)=>a.posicao-b.posicao);
    const max = Math.max(esq.length, dir.length, CONSTANTS.MAX_POR_LADO);

    const cell = (a, x, y0)=>{
      if (a){
        const tt = a.tipoTeste || state.configuracao.tipoTeste;
        const origem = a.tipoRemessa || "N/A";
        const manual = a.manual ? " (Manual)" : "";
        const data = a.dataPlantioAmostra || state.configuracao.data;
        const dataTxt = data ? ` | Plantio: ${utils.formatDate(data)}` : "";
        pdf.setFont("helvetica","bold"); pdf.setFontSize(9);
        pdf.text(a.codigo, x, y0+6);
        pdf.setFont("helvetica","normal"); pdf.setFontSize(7);
        pdf.text(`${tt} | ${origem}${dataTxt}${manual}`, x, y0+12);
      }else{
        pdf.setTextColor(128,128,128); pdf.setFontSize(9);
        pdf.text("Vazio", x, y0+10); pdf.setTextColor(0,0,0);
      }
    };

    for(let i=1;i<=max;i++){
      if (y>250){ pdf.addPage(); y=margem; header(); y+=h; }
      pdf.rect(margem, y, col, h*2);
      pdf.rect(margem+col, y, col, h*2);
      pdf.rect(margem+col*2, y, col, h*2);
      pdf.setFont("helvetica","bold"); pdf.setFontSize(9);
      pdf.text(String(i), margem+5, y+6);
      cell(esq.find(a=>a.posicao===i), margem+col+5, y);
      cell(dir.find(a=>a.posicao===i), margem+col*2+5, y);
      y += h*2;
    }
  },

  processarImportacao(event){
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      try{
        const dados = JSON.parse(e.target.result);
        if (!dados.configuracao || !dados.amostras){ toast("Arquivo inválido.", "error"); return; }
        const id = dados.configuracao.canteiro;
        const existe = storage.load(id);
        if (existe){
          modal.open("Sobrescrever", `Canteiro ${id} já existe. Deseja sobrescrever?`);
          modal.element.addEventListener("close", ()=>{
            if (modal.element.returnValue==="confirm"){
              state.configuracao = dados.configuracao; state.amostras = dados.amostras;
              storage.save(id, {configuracao: state.configuracao, amostras: state.amostras, ultimaAtualizacao:new Date().toISOString()});
              ui.renderSalvos(); toast(`Canteiro ${id} importado.`, "success");
            }
          }, {once:true});
        }else{
          state.configuracao = dados.configuracao; state.amostras = dados.amostras;
          storage.save(id, {configuracao: state.configuracao, amostras: state.amostras, ultimaAtualizacao:new Date().toISOString()});
          ui.renderSalvos(); toast(`Canteiro ${id} importado.`, "success");
        }
      }catch(err){ console.error(err); toast("Erro ao processar arquivo.", "error"); }
      event.target.value = "";
    };
    reader.readAsText(file);
  },

  _persist(){
    storage.save(state.configuracao.canteiro, {
      configuracao: state.configuracao, amostras: state.amostras, ultimaAtualizacao: new Date().toISOString()
    });
  },
};

document.addEventListener("DOMContentLoaded", ()=> app.init());
