-- Próximo Nível · banco de visitas (Neon / Postgres)
-- Cria as tabelas. Pode rodar de novo quando quiser: não apaga nada.
-- Jeito fácil: npm run banco  (ou cole este arquivo no SQL Editor do Neon e clique em Run)

-- uma linha por visita (o site atualiza a linha enquanto a pessoa navega)
CREATE TABLE IF NOT EXISTS sessoes (
  sessao            text PRIMARY KEY,
  visitante         text NOT NULL DEFAULT '',
  nova_visita       integer NOT NULL DEFAULT 0,
  inicio            text NOT NULL DEFAULT '',  -- horário do visitante, ex. 2026-10-24T10:00:00-03:00
  fim               text NOT NULL DEFAULT '',
  dia               text NOT NULL DEFAULT '',  -- AAAA-MM-DD, usado no filtro ?desde=
  hora              integer NOT NULL DEFAULT 0,
  dia_semana        integer NOT NULL DEFAULT 0,
  dispositivo       text NOT NULL DEFAULT '',
  largura           integer NOT NULL DEFAULT 0,
  origem            text NOT NULL DEFAULT '',
  referencia        text NOT NULL DEFAULT '',
  utm_source        text NOT NULL DEFAULT '',
  utm_medium        text NOT NULL DEFAULT '',
  utm_campaign      text NOT NULL DEFAULT '',
  utm_content       text NOT NULL DEFAULT '',
  tempo_s           integer NOT NULL DEFAULT 0,
  profundidade_max  integer NOT NULL DEFAULT 0,
  secoes            text NOT NULL DEFAULT '',
  secoes_n          integer NOT NULL DEFAULT 0,
  ultima_secao      text NOT NULL DEFAULT '',
  clique_n          integer NOT NULL DEFAULT 0,
  cliques           text NOT NULL DEFAULT '',
  primeiro_clique_s integer,                   -- vazio enquanto não clicou em comprar
  fotos             text NOT NULL DEFAULT '',
  fotos_n           integer NOT NULL DEFAULT 0,
  faq               text NOT NULL DEFAULT '',
  faq_n             integer NOT NULL DEFAULT 0,
  metodo_completo   integer NOT NULL DEFAULT 0,
  saida_secao       text NOT NULL DEFAULT '',
  eventos_n         integer NOT NULL DEFAULT 0,
  seq_max           integer NOT NULL DEFAULT 0,
  trilha            text NOT NULL DEFAULT '',
  recarregou        integer NOT NULL DEFAULT 0,
  exemplo           integer NOT NULL DEFAULT 0,
  recebido_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessoes_dia ON sessoes (dia);
CREATE INDEX IF NOT EXISTS sessoes_recebido_em ON sessoes (recebido_em);

-- uma linha por ação (seção vista, clique em comprar, foto, pergunta, saída...)
CREATE TABLE IF NOT EXISTS eventos (
  sessao      text NOT NULL REFERENCES sessoes (sessao) ON DELETE CASCADE,
  seq         integer NOT NULL,
  dia         text NOT NULL DEFAULT '',
  segundo     integer NOT NULL DEFAULT 0,
  evento      text NOT NULL DEFAULT '',
  valor       text NOT NULL DEFAULT '',
  detalhes    jsonb NOT NULL DEFAULT '{}',
  recebido_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sessao, seq)
);
