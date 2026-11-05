// Cria as tabelas no Neon a partir do schema.sql.
// Uso: npm run banco  (lê a DATABASE_URL do arquivo .dev.vars)
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('Falta a DATABASE_URL no arquivo .dev.vars (veja .dev.vars.exemplo).');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const comandos = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
  .replace(/--.*$/gm, '')
  .split(';')
  .map((c) => c.trim())
  .filter(Boolean);
await sql.transaction(comandos.map((c) => sql.query(c)));

const [{ sessoes, eventos }] = await sql.query('SELECT (SELECT count(*)::int FROM sessoes) AS sessoes, (SELECT count(*)::int FROM eventos) AS eventos');
console.log(`Banco pronto. sessoes: ${sessoes} linhas, eventos: ${eventos} linhas.`);
