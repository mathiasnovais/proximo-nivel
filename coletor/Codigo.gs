/*
  Próximo Nível · coletor de visitas
  ----------------------------------
  Cole este arquivo inteiro no Apps Script da planilha (Extensões > Apps Script),
  troque a CHAVE_LEITURA por uma senha sua e publique como app da web
  (Implantar > Nova implantação > App da Web > Executar como: eu > Quem pode acessar: Qualquer pessoa).

  O site manda os dados por POST e o painel lê por GET (com a chave).
  Abas criadas sozinhas na primeira visita: "sessoes" (uma linha por visita) e "eventos" (um por ação).
*/

var CHAVE_LEITURA = 'troque-esta-chave';

var COLUNAS = ['sessao', 'visitante', 'nova_visita', 'inicio', 'fim', 'dia', 'hora', 'dia_semana', 'dispositivo', 'largura',
  'origem', 'referencia', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'tempo_s', 'profundidade_max',
  'secoes', 'secoes_n', 'ultima_secao', 'clique_n', 'cliques', 'primeiro_clique_s', 'fotos', 'fotos_n', 'faq', 'faq_n',
  'metodo_completo', 'saida_secao', 'eventos_n', 'seq_max', 'trilha', 'recarregou', 'exemplo'];
var COLUNAS_TEXTO = { inicio: 1, fim: 1, dia: 1, secoes: 1, cliques: 1, fotos: 1, faq: 1, trilha: 1, sessao: 1, visitante: 1 };
var COLUNAS_EVENTOS = ['sessao', 'dia', 'seq', 'segundo', 'evento', 'valor', 'detalhes'];

/* recebe um lote do site */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return resposta({ ok: false, erro: 'ocupado, tente de novo' }); }
  try {
    var dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var s = dados && dados.sessao;
    if (!s || !s.sessao) return resposta({ ok: false, erro: 'sem sessao' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var abaS = garanteAba(ss, 'sessoes', COLUNAS);
    var abaE = garanteAba(ss, 'eventos', COLUNAS_EVENTOS);

    /* uma linha por visita: procura a linha da sessão (de trás para a frente, porque a visita atual é recente) */
    var linha = COLUNAS.map(function (c) { return celula(c, s[c]); });
    var ultima = abaS.getLastRow(), idx = -1, seqAnterior = 0;
    if (ultima >= 2) {
      var inicioBusca = Math.max(2, ultima - 2000); /* só as 2000 últimas linhas: o resto são visitas antigas */
      var ids = abaS.getRange(inicioBusca, 1, ultima - inicioBusca + 1, 1).getValues();
      for (var i = ids.length - 1; i >= 0; i--) {
        if (String(ids[i][0]) === String(s.sessao)) { idx = inicioBusca + i; break; }
      }
      if (idx > 0) seqAnterior = Number(abaS.getRange(idx, COLUNAS.indexOf('seq_max') + 1).getValue()) || 0;
    }
    if (idx > 0) {
      if (Number(s.seq_max) >= seqAnterior) abaS.getRange(idx, 1, 1, COLUNAS.length).setValues([linha]);
    } else {
      abaS.appendRow(linha);
    }

    /* eventos novos (seq maior que o último gravado): evita duplicar quando o site reenvia */
    var novos = (dados.eventos || []).filter(function (ev) { return Number(ev.seq) > seqAnterior; });
    if (novos.length) {
      var linhas = novos.map(function (ev) {
        var d = ev.dados || {};
        var valor = d.secao || d.local || d.foto || d.pergunta || (d.porcentagem != null ? d.porcentagem + '%' : '') || (d.marco != null ? d.marco + 's' : '') || '';
        return [texto(s.sessao), texto(s.dia), Number(ev.seq) || 0, Number(ev.t) || 0, String(ev.nome || ''), String(valor), JSON.stringify(d)];
      });
      abaE.getRange(abaE.getLastRow() + 1, 1, linhas.length, COLUNAS_EVENTOS.length).setValues(linhas);
    }
    return resposta({ ok: true, sessao: s.sessao, eventos: novos.length });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* entrega as visitas para o painel: ...exec?chave=SUA_CHAVE&desde=2026-10-01 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (String(p.chave || '') !== CHAVE_LEITURA) return resposta({ ok: false, erro: 'chave invalida' });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaS = ss.getSheetByName('sessoes');
  if (!abaS || abaS.getLastRow() < 2) return resposta({ ok: true, gerado_em: new Date().toISOString(), sessoes: [] });
  var valores = abaS.getRange(1, 1, abaS.getLastRow(), COLUNAS.length).getValues();
  var cab = valores[0], desde = p.desde ? String(p.desde) : null, saida = [];
  for (var i = 1; i < valores.length; i++) {
    var r = valores[i];
    if (!r[0]) continue;
    var obj = {};
    for (var j = 0; j < cab.length; j++) obj[String(cab[j])] = normaliza(r[j]);
    if (desde && String(obj.dia) < desde) continue;
    saida.push(obj);
  }
  return resposta({ ok: true, gerado_em: new Date().toISOString(), total: saida.length, sessoes: saida });
}

/* ---- apoio ---- */
function garanteAba(ss, nome, colunas) {
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    /* a primeira aba vazia (ou já com esses cabeçalhos) vira a aba procurada, em vez de criar outra */
    var primeira = ss.getSheets()[0];
    if (primeira && (primeira.getLastRow() === 0 || String(primeira.getRange(1, 1, 1, colunas.length).getValues()[0].join()) === colunas.join()) && !ss.getSheetByName(nome)) {
      if (primeira.getLastRow() === 0 || ss.getSheets().length === 1 || nome === 'sessoes') { primeira.setName(nome); aba = primeira; }
    }
  }
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.getRange(1, 1, 1, colunas.length).setValues([colunas]).setFontWeight('bold');
    aba.setFrozenRows(1);
  } else if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, colunas.length).setValues([colunas]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}
function celula(coluna, v) {
  if (v === undefined || v === null) return '';
  if (COLUNAS_TEXTO[coluna]) return texto(v);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  var n = Number(v);
  return (v !== '' && !isNaN(n)) ? n : String(v);
}
/* apóstrofo na frente obriga a planilha a guardar como texto (datas e listas não viram número nem data) */
function texto(v) { return "'" + String(v === undefined || v === null ? '' : v); }
function normaliza(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
  return v;
}
function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
