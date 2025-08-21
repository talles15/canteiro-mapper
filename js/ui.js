export const $ = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

export function showPanel(id) {
  $$('.main-menu, .setup-panel, .scanning-panel, .manual-entry-panel, .map-panel')
    .forEach(p => p.hidden = true);
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    const dlg = document.getElementById('confirmModal');
    $('#modal-title').textContent = title;
    $('#modal-message').textContent = message;
    dlg.returnValue = '';
    dlg.showModal();
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'confirm'), { once: true });
  });
}

export function toast(msg) {
  alert(msg);
}

export function formatDateBR(input) {
  try {
    const d = new Date(input);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return input;
  }
}
