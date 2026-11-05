# Colocar o Próximo Nível no ar

Três peças, cada uma numa conta própria do projeto:

| Peça | Onde | Para quê |
|---|---|---|
| Banco | Neon (Postgres) | guarda as visitas |
| Site + API | Cloudflare Workers | serve a página, o painel e o `/api/*` que grava e lê o banco |
| Domínio | Registro.br → DNS na Cloudflare | `seudominio.com.br` apontando para o site |

Os comandos abaixo rodam no terminal do VS Code, dentro da pasta `proximo-nivel`. Na primeira vez: `npm install`.

## 1. Banco no Neon

1. Crie a conta em https://neon.tech com o e-mail do projeto.
2. **New Project**: nome `proximo-nivel`, região **AWS São Paulo (sa-east-1)**. O plano gratuito basta.
3. No projeto, clique em **Connect** e copie a connection string. Ela começa com `postgresql://` e tem `-pooler` no endereço.
4. Copie o arquivo `.dev.vars.exemplo` para `.dev.vars` e preencha:
   - `DATABASE_URL`: a connection string do passo anterior
   - `CHAVE_LEITURA`: uma senha sua para o painel (letras e números, sem espaço)
5. Crie as tabelas:
   ```
   npm run banco
   ```
   Deve aparecer `Banco pronto. sessoes: 0 linhas, eventos: 0 linhas.`
   Também dá para colar o `banco/schema.sql` no **SQL Editor** do Neon e clicar em Run. O arquivo pode rodar de novo quando quiser: não apaga nada.

O `.dev.vars` não vai para o Git. Não mande esse arquivo para ninguém.

## 2. Testar no computador

```
npm run dev
```

Abra http://localhost:8787, role a página e clique em alguns botões. Depois abra http://localhost:8787/painel, clique em **Conectar banco**, digite a `CHAVE_LEITURA` e clique em **Salvar e carregar**. A visita que você acabou de fazer aparece no painel em até uns 5 segundos.

## 3. Conta da Cloudflare e publicação

1. Crie a conta em https://dash.cloudflare.com com o e-mail do projeto.
2. No terminal, entre na conta pelo wrangler:
   ```
   npx wrangler logout
   npx wrangler login        (o navegador abre: entre com a conta do projeto)
   npx wrangler whoami       (copie o Account ID)
   ```
3. No `wrangler.jsonc`, troque `SEU_ACCOUNT_ID` pelo Account ID. Enquanto esse texto estiver lá, o deploy falha de propósito.
4. Publique e cadastre os dois segredos (os mesmos valores do `.dev.vars`):
   ```
   npm run publicar
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put CHAVE_LEITURA
   ```
5. O site fica em `https://proximo-nivel.<sua-conta>.workers.dev`, endereço que o `npm run publicar` mostra. Repita o teste do passo 2 nesse endereço.

## 4. Domínio .com.br

A Cloudflare não vende .com.br, mas cuida do DNS dele. O domínio continua registrado e renovado no Registro.br.

1. No painel da Cloudflare: **Add a domain**, digite `seudominio.com.br` e escolha o plano **Free**.
2. A Cloudflare importa os registros DNS que já existem. **Se o domínio tem e-mail**, confira se os registros MX vieram; se não vieram, copie-os do Registro.br.
3. A Cloudflare mostra dois nameservers (algo como `nome.ns.cloudflare.com`).
4. No https://registro.br, entre no domínio:
   - **DNSSEC**: se estiver ativo, desative antes de trocar os servidores. Senão, o domínio sai do ar.
   - **Alterar servidores DNS**: cole os dois nameservers da Cloudflare e salve.
5. Espere a Cloudflare marcar o domínio como **Active**. Costuma levar de minutos a algumas horas, e ela avisa por e-mail.
6. No `wrangler.jsonc`, descomente o bloco `routes`, troque `seudominio.com.br` pelo domínio real e rode `npm run publicar` de novo. A Cloudflare cria o DNS e o certificado HTTPS sozinha.
7. Opcional: depois que o domínio funcionar, mude `"workers_dev"` para `false` para desligar o endereço provisório.

## 5. Painel e links

- Painel: `https://seudominio.com.br/painel`, depois **Conectar banco** e a chave. A chave fica salva só naquele navegador. Sem a chave, o painel mostra apenas dados de exemplo.
- Para o painel separar a origem das visitas, use links com UTM:
  ```
  https://seudominio.com.br/?utm_source=instagram&utm_medium=bio&utm_campaign=link_bio
  https://seudominio.com.br/?utm_source=instagram&utm_medium=stories&utm_campaign=story_lancamento
  https://seudominio.com.br/?utm_source=whatsapp&utm_medium=mensagem&utm_campaign=lista_vip
  ```

## Se precisar trocar algo depois

| O quê | Como |
|---|---|
| Página ou painel | edite, regenere o `dist/` (ver README) e `npm run publicar` |
| Senha do painel | `npx wrangler secret put CHAVE_LEITURA` (vale na hora, sem publicar de novo) |
| Banco (senha do Neon trocada) | `npx wrangler secret put DATABASE_URL` com a nova connection string |
| Ver erros da API | painel da Cloudflare → Workers → proximo-nivel → Logs |
