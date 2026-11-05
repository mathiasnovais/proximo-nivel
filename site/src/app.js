(function () {
  /* LINK DO CHECKOUT: cole aqui o link da página de pagamento, entre as aspas. Todos os botões de compra passam a levar direto para ele. Enquanto estiver vazio, os botões levam para o bloco de oferta, só para a página funcionar na revisão. */
  var CHECKOUT = '';
  if (CHECKOUT) {
    document.querySelectorAll('a.btn-compra').forEach(function (a) { a.href = CHECKOUT; a.rel = 'noopener'; });
  }

  /* FIM DA PROMOÇÃO: data e hora em que o preço sobe, no horário de Brasília (-03:00). Quando passar, o cronômetro some e fica só o nome do curso. */
  var PROMO_FIM = '2026-10-24T23:59:59-03:00';
  (function cronometro() {
    var promo = document.getElementById('promo');
    var fim = new Date(PROMO_FIM).getTime();
    if (!promo || isNaN(fim)) return;
    var ph = document.getElementById('ph'), pm = document.getElementById('pm'), ps = document.getElementById('ps');
    function dois(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var resta = fim - Date.now();
      if (resta <= 0) { promo.hidden = true; return; }
      var s = Math.floor(resta / 1000);
      /* sem bloco de dias: as horas acumulam (por exemplo, 170 horas) */
      var horas = Math.floor(s / 3600), min = Math.floor((s % 3600) / 60), seg = s % 60;
      ph.textContent = dois(horas); pm.textContent = dois(min); ps.textContent = dois(seg);
      promo.classList.toggle('urgente', resta < 3600 * 1000);
      window.setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  })();

  /* RASTREAMENTO: cole aqui os IDs das ferramentas que for usar. Vazio = desligado.
     GA4_ID         Google Analytics 4, formato G-XXXXXXXXXX (relatórios, funil, origem do tráfego)
     META_PIXEL_ID  Pixel da Meta, só números (Instagram/Facebook: público, retargeting, "iniciou checkout")
     CLARITY_ID     Microsoft Clarity (mapa de calor, até onde rolaram, gravação das visitas) */
  var GA4_ID = '';
  var META_PIXEL_ID = '';
  var CLARITY_ID = '';
  var RASTREIO_DEBUG = false; /* true mostra cada evento no console do navegador, para testar */
  /* COLETOR DO PAINEL: endereço da API que grava cada visita no banco (Neon), ver PUBLICAR.md. Vazio = desligado. */
  var COLETOR_URL = '/api/coleta';

  (function carregaFerramentas() {
    if (GA4_ID) {
      var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID); document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA4_ID, { send_page_view: true });
    }
    if (META_PIXEL_ID) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', META_PIXEL_ID);
      window.fbq('track', 'PageView');
    }
    if (CLARITY_ID) {
      (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script',CLARITY_ID);
    }
  })();

  /* ---- coletor do painel: guarda o resumo da visita e manda em lotes para o banco ---- */
  var visita = null, filaColeta = [], timerColeta = null, tempoAtivo = 0, visivelDesde = Date.now();
  function isoLocal(d) {
    function dois(n) { return (n < 10 ? '0' : '') + n; }
    var tz = -d.getTimezoneOffset(), sinal = tz >= 0 ? '+' : '-'; tz = Math.abs(tz);
    return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate()) + 'T' + dois(d.getHours()) + ':' + dois(d.getMinutes()) + ':' + dois(d.getSeconds()) + sinal + dois(Math.floor(tz / 60)) + ':' + dois(tz % 60);
  }
  function novoId(p) { return p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function iniciaVisita() {
    var guardada = null;
    try { guardada = JSON.parse(sessionStorage.getItem('pn_visita') || 'null'); } catch (e) {}
    if (guardada && guardada.sessao) { visita = guardada; visita.recarregou = (visita.recarregou || 0) + 1; return; }
    var agora = new Date(), vis = null, nova = 1;
    try { vis = localStorage.getItem('pn_vis'); if (vis) nova = 0; else { vis = novoId('v'); localStorage.setItem('pn_vis', vis); } } catch (e) { vis = novoId('v'); }
    var q = {}; try { new URLSearchParams(location.search).forEach(function (v, k) { q[k.toLowerCase()] = v; }); } catch (e) {}
    var host = ''; try { host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch (e) {}
    var origem = (q.utm_source || '').toLowerCase();
    if (!origem) {
      if (!host) origem = 'direto';
      else if (/instagram/.test(host)) origem = 'instagram';
      else if (/facebook|fb\./.test(host)) origem = 'facebook';
      else if (/whatsapp/.test(host)) origem = 'whatsapp';
      else if (/google/.test(host)) origem = 'google';
      else if (/tiktok/.test(host)) origem = 'tiktok';
      else if (/youtube|youtu\.be/.test(host)) origem = 'youtube';
      else if (/t\.co|twitter|x\.com/.test(host)) origem = 'x';
      else origem = host;
    }
    var w = window.innerWidth, toque = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    var disp = w < 561 ? 'celular' : (w < 1025 && toque ? 'tablet' : 'computador');
    visita = {
      sessao: novoId('s'), visitante: vis, nova_visita: nova, inicio: isoLocal(agora), fim: isoLocal(agora),
      dia: isoLocal(agora).slice(0, 10), hora: agora.getHours(), dia_semana: agora.getDay(),
      dispositivo: disp, largura: w, origem: origem, referencia: host,
      utm_source: q.utm_source || '', utm_medium: q.utm_medium || '', utm_campaign: q.utm_campaign || '', utm_content: q.utm_content || '',
      tempo_s: 0, profundidade_max: 0, secoes: [], ultima_secao: 'hero', cliques: [], primeiro_clique_s: '', fotos: [], faq: [],
      metodo_completo: 0, saida_secao: '', eventos_n: 0, trilha: [], recarregou: 0
    };
  }
  function tempoVisita() { return Math.round((tempoAtivo + (document.hidden ? 0 : Date.now() - visivelDesde)) / 1000); }
  function resumoVisita() {
    var r = {};
    for (var k in visita) r[k] = visita[k];
    r.fim = isoLocal(new Date()); r.tempo_s = tempoVisita(); r.profundidade_max = profundidadeMax;
    r.secoes = visita.secoes.join('|'); r.secoes_n = visita.secoes.length;
    r.cliques = visita.cliques.join('|'); r.clique_n = visita.cliques.length;
    r.fotos = visita.fotos.join('|'); r.fotos_n = visita.fotos.length;
    r.faq = visita.faq.join('|'); r.faq_n = visita.faq.length;
    r.trilha = visita.trilha.slice(0, 80).join(' > '); r.seq_max = visita.eventos_n; r.exemplo = 0;
    return r;
  }
  function guardaVisita() { try { sessionStorage.setItem('pn_visita', JSON.stringify(visita)); } catch (e) {} }
  function enviaColeta() {
    timerColeta = null;
    if (!COLETOR_URL || !visita || !filaColeta.length) return;
    var corpo = JSON.stringify({ v: 1, sessao: resumoVisita(), eventos: filaColeta });
    filaColeta = [];
    var ok = false;
    try { if (navigator.sendBeacon) ok = navigator.sendBeacon(COLETOR_URL, new Blob([corpo], { type: 'text/plain' })); } catch (e) {}
    if (!ok) { try { fetch(COLETOR_URL, { method: 'POST', mode: 'no-cors', keepalive: true, body: corpo }); } catch (e) {} }
  }
  function coleta(nome, dados) {
    if (!COLETOR_URL) return;
    if (!visita) iniciaVisita();
    var t = tempoVisita();
    visita.eventos_n += 1;
    if (nome === 'secao_vista') { if (visita.secoes.indexOf(dados.secao) < 0) visita.secoes.push(dados.secao); visita.ultima_secao = dados.secao; visita.trilha.push(t + 's ' + dados.secao); }
    else if (nome === 'clique_comprar') { visita.cliques.push(dados.local); if (visita.primeiro_clique_s === '') visita.primeiro_clique_s = t; visita.trilha.push(t + 's clique:' + dados.local); }
    else if (nome === 'foto_aberta') { visita.fotos.push(dados.foto); visita.trilha.push(t + 's foto:' + dados.foto); }
    else if (nome === 'faq_aberta') { visita.faq.push(dados.pergunta); visita.trilha.push(t + 's faq'); }
    else if (nome === 'metodo_completo') { visita.metodo_completo = 1; }
    else if (nome === 'saida') { visita.saida_secao = dados.secao; }
    filaColeta.push({ seq: visita.eventos_n, t: t, nome: nome, dados: dados });
    guardaVisita();
    if (nome === 'saida') enviaColeta();
    else if (!timerColeta) timerColeta = setTimeout(enviaColeta, 5000);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { tempoAtivo += Date.now() - visivelDesde; }
    else { visivelDesde = Date.now(); }
  });
  if (COLETOR_URL) iniciaVisita();

  /* um único ponto de saída: cada evento vai para todas as ferramentas ligadas */
  var inicioPagina = Date.now();
  var profundidadeMax = 0;
  var ultimaSecao = 'hero';
  function segundosNaPagina() { return Math.round((Date.now() - inicioPagina) / 1000); }
  function rastreia(nome, dados) {
    dados = dados || {};
    dados.segundos = segundosNaPagina();
    dados.profundidade = profundidadeMax;
    if (RASTREIO_DEBUG && window.console) console.log('[rastreio]', nome, dados);
    try {
      if (GA4_ID && window.gtag) window.gtag('event', nome, dados);
      if (META_PIXEL_ID && window.fbq) {
        if (nome === 'clique_comprar') window.fbq('track', 'InitiateCheckout', { content_name: 'Próximo Nível', content_category: dados.local });
        else window.fbq('trackCustom', nome, dados);
      }
      if (CLARITY_ID && window.clarity) { window.clarity('event', nome); if (dados.local) window.clarity('set', 'ultimo_clique', String(dados.local)); if (dados.secao) window.clarity('set', 'ultima_secao', String(dados.secao)); }
    } catch (e) {}
    try { coleta(nome, dados); } catch (e) {}
  }

  var html = document.documentElement;
  html.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var temIO = 'IntersectionObserver' in window;

  /* barra de progresso na faixa dupla da navegação */
  var nav = document.getElementById('topo');
  var progresso = document.getElementById('progresso');
  var ticking = false;
  function atualiza() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    progresso.style.width = pct + '%';
    nav.classList.toggle('rolou', window.scrollY > 24);
    pinUpdate();
  }
  function aoRolar() { if (!ticking) { ticking = true; window.requestAnimationFrame(atualiza); } }
  window.addEventListener('scroll', aoRolar, { passive: true });
  window.addEventListener('resize', aoRolar);

  /* revelação ao rolar: só esconde o que ainda está abaixo da dobra */
  /* a seção presa só funciona no computador e quando o conteúdo cabe na altura da janela; a decisão é refeita a cada mudança de tamanho */
  var pinSecao = document.getElementById('metodo');
  function pinAjusta() {
    if (!pinSecao) return;
    pinSecao.classList.remove('sem-pin');
    if (window.innerWidth < 861) return;
    var conteudo = pinSecao.querySelector('.pin-tela > .wrap');
    if (conteudo && conteudo.offsetHeight + 100 > window.innerHeight) pinSecao.classList.add('sem-pin');
  }
  function pinEstaAtivo() { return !!pinSecao && window.innerWidth >= 861 && !pinSecao.classList.contains('sem-pin'); }
  pinAjusta();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { pinAjusta(); atualiza(); });
  var pinTimer = null;
  window.addEventListener('resize', function () { clearTimeout(pinTimer); pinTimer = setTimeout(function () { pinAjusta(); atualiza(); }, 120); });

  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!reduce && temIO) {
    var vh = window.innerHeight;
    reveals.forEach(function (el) { if (el.getBoundingClientRect().top > vh * 0.95) el.classList.add('pre'); });
    var ioReveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ioReveal.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    reveals.forEach(function (el) { if (el.classList.contains('pre')) ioReveal.observe(el); });
  }

  /* cadeias: cada sequência acende em cascata quando entra na tela */
  document.querySelectorAll('.cadeia').forEach(function (cadeia) {
    var passos = cadeia.querySelectorAll('li');
    if (!reduce && temIO) {
      var ioCadeia = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { passos.forEach(function (p) { p.classList.add('on'); }); ioCadeia.disconnect(); }
        });
      }, { threshold: 0.3 });
      ioCadeia.observe(cadeia);
    } else {
      passos.forEach(function (p) { p.classList.add('on'); });
    }
  });

  /* ano do rodapé sempre atual */
  var ano = document.getElementById('ano');
  if (ano) ano.textContent = String(new Date().getFullYear());

  /* popup das fotos: clicar numa foto abre a imagem grande com o botão de compra */
  var popup = document.getElementById('popup');
  var ultimoCard = null;
  function abrePopup(card) {
    ultimoCard = card;
    var grupo = card.closest('.grid').previousElementSibling;
    while (grupo && !grupo.classList.contains('grupo-rotulo')) grupo = grupo.previousElementSibling;
    document.getElementById('popup-foto').innerHTML = card.querySelector('div > .foto-vazia, div > .foto').outerHTML;
    document.getElementById('popup-titulo').textContent = card.querySelector('figcaption b').textContent;
    document.getElementById('popup-texto').textContent = card.querySelector('figcaption span').textContent;
    document.getElementById('popup-modulo').textContent = grupo ? (grupo.getAttribute('data-nome') || grupo.textContent) : '';
    popup.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { popup.classList.add('aberto'); }); });
    document.getElementById('popup-comprar').focus({ preventScroll: true });
    rastreia('foto_aberta', { foto: card.querySelector('figcaption b').textContent, modulo: grupo ? (grupo.getAttribute('data-nome') || '') : '' });
  }
  function fechaPopup() {
    if (popup.hidden) return;
    popup.classList.remove('aberto');
    document.documentElement.style.overflow = '';
    setTimeout(function () { popup.hidden = true; }, reduce ? 0 : 300);
    if (ultimoCard) ultimoCard.focus({ preventScroll: true });
  }
  document.querySelectorAll('.evo-card').forEach(function (card) {
    card.addEventListener('click', function () { abrePopup(card); });
    card.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrePopup(card); } });
  });
  popup.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-fechar]')) fechaPopup();
    else if (ev.target.closest('#popup-comprar') && !CHECKOUT) fechaPopup();
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fechaPopup(); });

  /* seção presa: libera uma caixa a cada trecho da rolagem, e recolhe se a pessoa voltar */
  var pinTrilho = document.getElementById('metodo-pin');
  var pinCards = pinTrilho ? Array.prototype.slice.call(pinTrilho.querySelectorAll('.pilar')) : [];
  var pinPassos = pinTrilho ? Array.prototype.slice.call(pinTrilho.querySelectorAll('.pin-passos i')) : [];
  function pinUpdate() {
    if (!pinTrilho || !pinEstaAtivo()) return;
    if (reduce) { pinCards.forEach(function (c) { c.classList.add('on'); }); return; }
    var r = pinTrilho.getBoundingClientRect();
    var total = pinTrilho.offsetHeight - window.innerHeight;
    var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
    var n = pinCards.length, vis = 0;
    /* a primeira caixa entra logo no começo da rolagem; as seguintes a cada 30% do trecho */
    for (var i = 0; i < n; i++) { if (p >= 0.08 + i * 0.30) vis = i + 1; }
    pinCards.forEach(function (c, i) {
      var on = i < vis;
      c.classList.toggle('on', on);
      c.style.setProperty('--k', on ? String(vis - 1 - i) : '0');
    });
    pinPassos.forEach(function (b, i) { b.classList.toggle('on', i < vis); });
    if (vis === n && !pinCompleto) { pinCompleto = true; rastreia('metodo_completo', { secao: 'metodo' }); }
  }
  var pinCompleto = false;

  /* FAQ */
  var faq = document.getElementById('faq-lista');
  if (faq) {
    faq.addEventListener('click', function (ev) {
      var botao = ev.target.closest('.faq-botao');
      if (!botao) return;
      var item = botao.closest('.faq-item');
      var aberto = item.classList.toggle('aberto');
      botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      if (aberto) rastreia('faq_aberta', { pergunta: botao.childNodes[0].textContent.trim() });
    });
  }

  /* barra fixa de compra no celular: aparece depois do hero e some na oferta */
  var barra = document.getElementById('barra-fixa');
  var hero = document.getElementById('hero');
  var oferta = document.getElementById('oferta'), ofertaMeio = document.getElementById('oferta-meio');
  if (barra && hero && oferta && temIO) {
    var heroVisivel = true, ofertaVisivel = false;
    function mostraBarra() {
      var mostrar = !heroVisivel && !ofertaVisivel;
      barra.classList.toggle('visivel', mostrar);
      barra.setAttribute('aria-hidden', mostrar ? 'false' : 'true');
      barra.querySelector('a').tabIndex = mostrar ? 0 : -1;
    }
    new IntersectionObserver(function (en) { heroVisivel = en[0].isIntersecting; mostraBarra(); }, { threshold: 0.1 }).observe(hero);
    var visOferta = {}; var ioOf = new IntersectionObserver(function (en) { en.forEach(function (e) { visOferta[e.target.id] = e.isIntersecting; }); ofertaVisivel = !!(visOferta['oferta'] || visOferta['oferta-meio']); mostraBarra(); }, { threshold: 0.1 }); ioOf.observe(oferta); if (ofertaMeio) ioOf.observe(ofertaMeio);
  }

  /* ---- rastreamento da visita: onde clicou, até onde rolou, quais seções viu, quanto tempo ficou ---- */
  (function rastreamento() {
    /* cliques de compra: qual botão, em que parte da página, com que tempo e profundidade */
    document.querySelectorAll('a.btn-compra').forEach(function (a) {
      a.addEventListener('click', function () {
        var bloco = a.closest('section, footer, header, #popup, #barra-fixa');
        rastreia('clique_comprar', { local: a.getAttribute('data-local') || (bloco && bloco.id) || 'outro', texto: a.textContent.trim(), destino: CHECKOUT ? 'checkout' : 'oferta' });
      });
    });

    /* profundidade de rolagem: marcos de 25, 50, 75, 90 e 100 por cento, cada um só uma vez */
    var marcos = [25, 50, 75, 90, 100], marcados = {};
    function mede() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.round(((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100) : 100;
      if (pct > profundidadeMax) profundidadeMax = Math.min(100, pct);
      marcos.forEach(function (m) { if (!marcados[m] && profundidadeMax >= m) { marcados[m] = true; rastreia('rolagem', { porcentagem: m }); } });
    }
    var medindo = false;
    window.addEventListener('scroll', function () { if (!medindo) { medindo = true; requestAnimationFrame(function () { medindo = false; mede(); }); } }, { passive: true });
    mede();

    /* seções vistas: dispara quando a seção cruza o meio da tela (a seção presa é medida pela tela fixa) */
    if (temIO) {
      var vistas = {};
      var ioSecao = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var sec = e.target.closest('section') || e.target;
          var id = sec.id || 'sem-id';
          ultimaSecao = id;
          if (vistas[id]) return;
          vistas[id] = true;
          rastreia('secao_vista', { secao: id });
        });
      }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 });
      document.querySelectorAll('main > section[id]').forEach(function (sec) {
        ioSecao.observe(sec.classList.contains('pin') ? (sec.querySelector('.pin-tela') || sec) : sec);
      });
    }

    /* tempo na página: marcos de 10, 30, 60, 120 e 300 segundos */
    [10, 30, 60, 120, 300].forEach(function (seg) {
      setTimeout(function () { rastreia('tempo_na_pagina', { marco: seg }); }, seg * 1000);
    });

    /* saída: ao fechar ou esconder a página, registra onde parou e quanto tempo ficou */
    var saiu = false;
    function saida() {
      if (saiu) return; saiu = true;
      mede();
      rastreia('saida', { secao: ultimaSecao, profundidade_max: profundidadeMax });
    }
    window.addEventListener('pagehide', saida);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') saida(); else saiu = false; });
  })();

  atualiza();
})();
