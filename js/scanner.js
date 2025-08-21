import { $, toast } from './ui.js';
import { saveCanteiro } from './storage.js';

let scanner = null;

export async function startScan(videoEl, onResult, onError) {
  try {
    scanner = new QrScanner(videoEl, (result) => onResult(result), {
      highlightScanRegion: true,
      highlightCodeOutline: true,
    });
    await scanner.start();
    return true;
  } catch (e) {
    console.error('Scanner error', e);
    onError?.(e);
    return false;
  }
}

export function stopScan() {
  if (scanner) {
    scanner.stop();
    scanner = null;
  }
}

export function processQrResult(result, STATE, saveAndUpdate) {
  try {
    const url = result.data;
    const match = url.match(/codigoamostra=(\d+)/);
    if (!match) {
      return toast('QR code inválido! Formato esperado não encontrado.');
    }
    const codigo = match[1];
    if (STATE.amostras.some(a => a.codigo === codigo)) {
      return toast(`Amostra ${codigo} já foi lida!`);
    }
    const amostra = {
      codigo,
      url,
      lado: STATE.ladoAtual,
      posicao: STATE.amostras.filter(a => a.lado === STATE.ladoAtual).length + 1,
      timestamp: new Date().toISOString()
    };
    STATE.amostras.push(amostra);
    saveAndUpdate();
    if (navigator.vibrate) navigator.vibrate(80);
  } catch (e) {
    console.error(e);
    toast('Erro ao processar QR');
  }
}
