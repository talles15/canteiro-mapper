const PREFIX = 'canteiro_';

export function saveCanteiro(configuracao, amostras) {
  const key = PREFIX + configuracao.canteiro;
  const dados = {
    configuracao,
    amostras,
    ultimaAtualizacao: new Date().toISOString()
  };
  localStorage.setItem(key, JSON.stringify(dados));
}

export function loadCanteiro(canteiro) {
  const raw = localStorage.getItem(PREFIX + canteiro);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function listCanteiros() {
  const out = [];
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k.startsWith(PREFIX)) continue;
    try {
      const dados = JSON.parse(localStorage.getItem(k));
      out.push({ key: k, dados });
    } catch {}
  }
  // sort by ultimaAtualizacao desc
  out.sort((a,b) => (b.dados?.ultimaAtualizacao || '').localeCompare(a.dados?.ultimaAtualizacao || ''));
  return out;
}

export function removeCanteiro(canteiro) {
  localStorage.removeItem(PREFIX + canteiro);
}
