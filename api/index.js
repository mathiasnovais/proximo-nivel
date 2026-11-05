/*
  Próximo Nível · API do site (Cloudflare Worker + Neon)
  ------------------------------------------------------
  A página e o painel (pasta dist/) saem direto como arquivos estáticos; só /api/* passa por aqui.

    POST /api/coleta                   o site manda um lote da visita (sessão + eventos novos) e grava no banco
    GET  /api/sessoes?chave=SUA_CHAVE  o painel lê as visitas (opcional: &desde=AAAA-MM-DD)

  Segredos (npx wrangler secret put NOME):
    DATABASE_URL   connection string do Neon
    CHAVE_LEITURA  senha que o painel usa para ler as visitas
  As tabelas estão em banco/schema.sql (npm run banco cria tudo).
*/
import { neon } from '@neondatabase/serverless';

/* mesmas colunas do coletor antigo (Apps Script), na mesma ordem: o painel não precisou mudar */
const COLUNAS = ['sessao', 'visitante', 'nova_visita', 'inicio', 'fim', 'dia', 'hora', 'dia_semana', 'dispositivo', 'largura',
  'origem', 'referencia', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'tempo_s', 'profundidade_max',
  'secoes', 'secoes_n', 'ultima_secao', 'clique_n', 'cliques', 'primeiro_clique_s', 'fotos', 'fotos_n', 'faq', 'faq_n',
  'metodo_completo', 'saida_secao', 'eventos_n', 'seq_max', 'trilha', 'recarregou', 'exemplo'];
const NUMEROS = new Set(['nova_visita', 'hora', 'dia_semana', 'largura', 'tempo_s', 'profundidade_max', 'secoes_n', 'clique_n',
  'primeiro_clique_s', 'fotos_n', 'faq_n', 'metodo_completo', 'eventos_n', 'seq_max', 'recarregou', 'exemplo']);

const LIMITE_CORPO = 64 * 1024;  /* o sendBeacon do navegador já não manda mais que isso */
const LIMITE_TEXTO = 4000;       /* a trilha é o campo mais longo (até 80 passos) */
const LIMITE_EVENTOS = 300;

const LISTA = COLUNAS.join(', ');
/* uma linha por visita: se a sessão já existe, só atualiza quando o lote é mais novo (o site reenvia ao recarregar) */
const SQL_SESSAO = `INSERT INTO sessoes (${LISTA}) VALUES (${COLUNAS.map((_, i) => '$' + (i + 1)).join(', ')})
  ON CONFLICT (sessao) DO UPDATE SET ${COLUNAS.slice(1).map((c) => `${c} = EXCLUDED.${c}`).join(', ')}, atualizado_em = now()
  WHERE sessoes.seq_max <= EXCLUDED.seq_max`;
/* eventos chegam em lote; a chave (sessao, seq) descarta os que o site reenviou */
const SQL_EVENTOS = `INSERT INTO eventos (sessao, dia, seq, segundo, evento, valor, detalhes)
  SELECT $1::text, $2::text, e.seq, e.segundo, e.evento, e.valor, e.detalhes
  FROM jsonb_to_recordset($3::jsonb) AS e(seq integer, segundo integer, evento text, valor text, detalhes jsonb)
  ON CONFLICT (sessao, seq) DO NOTHING`;
const SQL_LISTA = `SELECT ${LISTA} FROM sessoes WHERE ($1::text IS NULL OR dia >= $1) ORDER BY recebido_em`;

export default {
  async fetch(request, env) {
    const { pathname, searchParams } = new URL(request.url);
    try {
      if (pathname === '/api/coleta') {
        if (request.method !== 'POST') return json({ ok: false, erro: 'use POST' }, 405);
        return await coleta(request, env);
      }
      if (pathname === '/api/sessoes') {
        if (request.method !== 'GET') return json({ ok: false, erro: 'use GET' }, 405);
        return await sessoes(searchParams, env);
      }
      return json({ ok: false, erro: 'não encontrado' }, 404);
    } catch (err) {
      console.error(pathname, err);
      return json({ ok: false, erro: 'falha no servidor' }, 500);
    }
  },
};

/* recebe um lote do site */
async function coleta(request, env) {
  if (Number(request.headers.get('content-length')) > LIMITE_CORPO) return json({ ok: false, erro: 'lote grande demais' }, 413);
  const corpo = await request.text();
  if (corpo.length > LIMITE_CORPO) return json({ ok: false, erro: 'lote grande demais' }, 413);
  let dados;
  try { dados = JSON.parse(corpo || '{}'); } catch { return json({ ok: false, erro: 'json inválido' }, 400); }
  const s = dados && dados.sessao;
  if (!s || typeof s !== 'object' || !s.sessao) return json({ ok: false, erro: 'sem sessao' }, 400);

  const sql = neon(env.DATABASE_URL);
  const linha = COLUNAS.map((c) => celula(c, s[c]));
  const eventos = (Array.isArray(dados.eventos) ? dados.eventos : []).slice(0, LIMITE_EVENTOS).map((ev) => {
    const d = ev && typeof ev.dados === 'object' && ev.dados ? ev.dados : {};
    return { seq: inteiro(ev && ev.seq), segundo: inteiro(ev && ev.t), evento: texto(ev && ev.nome), valor: texto(valorDoEvento(d)), detalhes: d };
  });
  const consultas = [sql.query(SQL_SESSAO, linha)];
  if (eventos.length) consultas.push(sql.query(SQL_EVENTOS, [linha[0], texto(s.dia), JSON.stringify(eventos)]));
  await sql.transaction(consultas);
  return json({ ok: true, sessao: linha[0], eventos: eventos.length });
}

/* entrega as visitas para o painel */
async function sessoes(params, env) {
  if (!(await chaveConfere(params.get('chave'), env.CHAVE_LEITURA))) return json({ ok: false, erro: 'chave invalida' }, 401, CORS);
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(params.get('desde') || '') ? params.get('desde') : null;
  const linhas = await neon(env.DATABASE_URL).query(SQL_LISTA, [desde]);
  return json({ ok: true, gerado_em: new Date().toISOString(), total: linhas.length, sessoes: linhas }, 200, CORS);
}

/* ---- apoio ---- */
/* o painel também pode ser aberto direto do computador (sem hospedar); a chave continua obrigatória */
const CORS = { 'access-control-allow-origin': '*' };

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}
function celula(coluna, v) {
  if (coluna === 'primeiro_clique_s') return v === '' || v == null ? null : inteiro(v);
  return NUMEROS.has(coluna) ? inteiro(v) : texto(v);
}
function inteiro(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(-2147483648, Math.min(2147483647, n)) : 0;
}
function texto(v) { return String(v == null ? '' : v).slice(0, LIMITE_TEXTO); }
function valorDoEvento(d) {
  return d.secao || d.local || d.foto || d.pergunta || (d.porcentagem != null ? d.porcentagem + '%' : '') || (d.marco != null ? d.marco + 's' : '') || '';
}
/* compara pelo hash, em tempo constante, para a chave não vazar pelo tempo de resposta */
async function chaveConfere(recebida, certa) {
  if (!recebida || !certa) return false;
  const cod = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', cod.encode(recebida)), crypto.subtle.digest('SHA-256', cod.encode(certa))]);
  return crypto.subtle.timingSafeEqual(a, b);
}
