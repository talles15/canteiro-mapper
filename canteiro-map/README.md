# 🌱 Mapeamento de Canteiros (PWA)

Aplicação web para mapear canteiros de testes com leitura de QR Code, entrada manual, exportação (JSON/PDF) e suporte a PWA (instalável e offline).

## ✨ O que há de novo nesta versão otimizada
- Código modular (ES Modules) com **`assets/app.js`** e **`assets/styles.css`**
- **PWA**: `manifest.webmanifest` + `sw.js` (cache básico offline)
- Acessibilidade: uso de `dialog`, `aria-*`, teclado e foco preservados
- UI responsiva, botões com estados de carregamento e **toasts** no lugar de `alert`
- **Data do plantio da amostra** obrigatória na entrada manual e clique rápido na tabela
- Exportação **JSON** e **PDF** (jsPDF via CDN)
- Pronto para **GitHub Pages**

## 🗂 Estrutura
```
canteiro-map/
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/
│   ├── app.js
│   ├── styles.css
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       └── favicon-32.png
```

## 🚀 Como publicar no GitHub Pages
1. Crie um repositório no GitHub (ex.: `MAPA-CANTEIRO-2.0`).
2. Envie todos os arquivos deste diretório para a **branch `main`**.
3. Vá em **Settings → Pages → Build and deployment** e selecione:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` (pasta raiz `/`)
4. Aguarde a publicação e acesse a URL informada em *Pages*.

> Dica: se preferir `docs/`, mova todos os arquivos para `docs/` e aponte o Pages para `main /docs`.

## 🔧 Desenvolvimento local
Basta abrir `index.html` em um servidor local (para SW funcionar). Ex.: com Python:
```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

## 🧪 Fluxo principal
1. **Novo Canteiro** → preencha número, data e tipo
2. **Leitura QR** ou **Entrada Manual** (exige data do plantio da amostra)
3. Veja o **Mapa** e exporte **JSON** ou **PDF**

## 🛡 Permissões
- Câmera: necessária para ler QR Codes (somente durante o uso)
- Armazenamento local: salva canteiros no `localStorage`

## 📄 Licença
MIT
