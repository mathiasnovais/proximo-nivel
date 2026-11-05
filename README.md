# Próximo Nível: página de vendas com painel de visitas

Página de vendas de um curso, em arquivo único, com um painel que mostra como as pessoas usam a página: de onde vieram (UTM), em que dispositivo, até onde rolaram, que seções viram, em que botão clicaram e em que segundo, que fotos e perguntas abriram e onde saíram. Nenhum dado pessoal é gravado: não há nome, e-mail nem IP, só um código aleatório por navegador.

A página e o painel são arquivos estáticos. Uma API pequena, no mesmo projeto, grava as visitas no banco e entrega os dados ao painel.

## Como está organizado

```
proximo-nivel/
├── PUBLICAR.md           passo a passo: banco, hospedagem e domínio .com.br
├── wrangler.jsonc        configuração da Cloudflare Workers (coloque o seu account_id)
├── api/index.js          API: grava as visitas (/api/coleta) e entrega ao painel (/api/sessoes)
├── banco/
│   ├── schema.sql        tabelas do banco (sessoes e eventos)
│   └── cria-banco.mjs    cria as tabelas (npm run banco)
├── .dev.vars.exemplo     modelo do .dev.vars (connection string e chave do painel)
├── dist/                 o que sobe na hospedagem
│   ├── index.html        página de vendas (arquivo único, fotos embutidas)
│   └── painel.html       painel de acompanhamento das visitas (com dados de exemplo embutidos)
├── site/                 código-fonte da página (Tailwind CSS)
│   ├── src/index.html    conteúdo da página
│   ├── src/input.css     estilos
│   ├── src/app.js        cronômetro, checkout, rastreamento, coletor, animações
│   ├── src/img/          as 12 fotos
│   ├── tailwind.config.js
│   └── build.py          gera o HTML final em arquivo único
├── painel/               código-fonte do painel
│   ├── painel.template.html  o painel (HTML + CSS + JS)
│   ├── monta.py          junta template + dados de exemplo + miniaturas e gera painel.html
│   ├── miniaturas.json   capturas atuais
│   ├── simula.py         gera os dados de exemplo
│   └── sessoes-exemplo.csv  dados fictícios gerados pelo simula.py
└── coletor/              versão antiga do coletor, com planilha do Google (substituída pelo banco)
```

## Stack

- Página e painel: HTML, CSS (Tailwind) e JavaScript puro; o painel usa D3 para os gráficos.
- API: Cloudflare Workers (`api/index.js`), publicada com o wrangler.
- Banco: PostgreSQL (o projeto usa o Neon como serviço gerenciado).
- Geração dos arquivos: Node.js (Tailwind) e Python 3.

## Configurar a página

Em `site/src/app.js` (ou direto em `dist/index.html`):

| Linha | O que é |
|---|---|
| `var CHECKOUT = '';` | link da página de pagamento; todos os botões passam a ir para ele |
| `var PROMO_FIM = '...';` | data e hora em que o cronômetro zera (horário de Brasília) |
| `var COLETOR_URL = '/api/coleta';` | já aponta para a API do próprio site. Vazio = coletor desligado |
| `var GA4_ID`, `META_PIXEL_ID`, `CLARITY_ID` | opcionais: Google Analytics, Pixel da Meta, Microsoft Clarity |

Preço, parcela e garantia estão no `site/src/index.html` entre colchetes: `[Preço antigo]`, `[Preço]`, `[N]x de [parcela]`, `[Garantia de X dias]`.

## Como rodar

1. Instale Node.js e Python 3. Na raiz da pasta: `npm install`.
2. Crie um banco PostgreSQL e copie `.dev.vars.exemplo` para `.dev.vars`, preenchendo `DATABASE_URL` (connection string) e `CHAVE_LEITURA` (senha do painel).
3. Crie as tabelas: `npm run banco` (ou cole `banco/schema.sql` no SQL do seu banco).
4. Suba o ambiente local: `npm run dev` e abra http://localhost:8787 (o painel fica em `/painel`; clique em Conectar banco e digite a chave).
5. Para mudar a página: edite `site/src/`, rode `cd site && npm install && python3 build.py` e copie o resultado para `dist/index.html`.
6. Para mudar o painel: edite `painel/painel.template.html` e rode `python3 painel/monta.py`.
7. Para publicar: siga o `PUBLICAR.md` (Account ID no `wrangler.jsonc`, `npm run publicar` e os dois segredos com `npx wrangler secret put`).

Só para olhar o visual, sem gravar visitas, basta abrir os arquivos de `dist/` no navegador.

## Dados

Este repositório não contém dados pessoais. O `painel/sessoes-exemplo.csv` e os dados embutidos em `dist/painel.html` são fictícios, gerados pelo `simula.py`. O `.dev.vars` real, com a connection string e a chave, fica fora do repositório; os arquivos de importação e as listas ficam fora por LGPD.
