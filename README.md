
# 🌱 Mapeamento de Canteiros (QR + PDF)

Aplicação web simples (vanilla JS) para mapear canteiros de testes com leitura de QR Code, entrada manual, exportação em JSON e PDF e armazenamento local (LocalStorage).

## Recursos
- Leitura de QR Code (QrScanner UMD)
- Entrada manual em lote com preview e validações
- Mapa interativo (45 posições por lado | 90 no total)
- Edição, limpeza de posição e remoção de amostras
- Exportar JSON/PDF (jsPDF UMD)
- Persistência por canteiro (LocalStorage)
- UI responsiva e sem dependência de bundlers

## Estrutura
```
.
├─ index.html
├─ css/
│  └─ styles.css
└─ js/
   ├─ app.js        # ponto de entrada e estado global
   ├─ ui.js         # helpers de UI (painéis, diálogo, alertas)
   ├─ storage.js    # persistência no LocalStorage
   ├─ map.js        # geração do mapa e ações de célula
   ├─ scanner.js    # inicialização e processamento do QR
   ├─ manual.js     # entrada manual e preview
   └─ export.js     # exportação JSON e PDF
```

## Como rodar localmente
1. Baixe este repositório e abra o `index.html` no navegador **via um servidor local** (recomendado para acesso à câmera).
   - Sem Node: use a extensão "Live Server" (VS Code) ou `python3 -m http.server 8080` e acesse `http://localhost:8080`.
2. Garanta que o navegador permita acesso à **câmera** para leitura de QR.

## Publicar no GitHub Pages
1. Crie um repositório no GitHub e suba os arquivos.
2. Vá em **Settings → Pages → Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main** (ou a branch usada) / **root**
3. Acesse a URL fornecida pelo GitHub Pages.

## Licença
MIT. Veja `LICENSE`.
