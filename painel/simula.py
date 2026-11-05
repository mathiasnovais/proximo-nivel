"""Gera sessões de exemplo (marcadas exemplo=1) para o painel ter o que mostrar antes do site ir ao ar."""
import csv, random, math, datetime as dt, uuid
random.seed(42)
COLS = ['sessao','visitante','nova_visita','inicio','fim','dia','hora','dia_semana','dispositivo','largura','origem','referencia','utm_source','utm_medium','utm_campaign','utm_content','tempo_s','profundidade_max','secoes','secoes_n','ultima_secao','clique_n','cliques','primeiro_clique_s','fotos','fotos_n','faq','faq_n','metodo_completo','saida_secao','eventos_n','seq_max','trilha','recarregou','exemplo']
SECOES = ['hero','evolucao','oferta-meio','metodo','maquina','chamada-2','para-quem','oferta','faq','fecho']
# posição aproximada de cada seção na página (% rolado quando ela entra no meio da tela), celular / computador
POS = {'hero':8,'evolucao':20,'oferta-meio':40,'metodo':50,'maquina':62,'chamada-2':70,'para-quem':76,'oferta':85,'faq':92,'fecho':98}
# probabilidade de seguir para a próxima seção (abandono entre seções)
SEGUE = {'hero':.86,'evolucao':.74,'oferta-meio':.78,'metodo':.84,'maquina':.86,'chamada-2':.9,'para-quem':.88,'oferta':.78,'faq':.75}
FOTOS = ['Movimento','Força','Alimentação','Hidratação','Sono','Ambiente','Gravação','Luz','Cenário','Equipamento','Edição','Audiência']
FAQ = ['Como o curso funciona?','Preciso de equipamento para a parte de conteúdo?','Serve para quem está começando do zero?','Quando recebo o acesso?']
ORIGENS = [('instagram',.60),('direto',.19),('whatsapp',.09),('facebook',.05),('google',.04),('tiktok',.03)]
CAMP = {'instagram':[('bio','link_bio'),('stories','story_lancamento'),('post','post_fotos')],'facebook':[('post','post_lancamento')],'tiktok':[('bio','link_bio')]}
hoje = dt.date(2026,10,25)
def escolhe(pares):
    r = random.random(); acc = 0
    for v, p in pares:
        acc += p
        if r <= acc: return v
    return pares[-1][0]
rows = []; visitantes = {}
for d in range(44, -1, -1):
    dia = hoje - dt.timedelta(days=d)
    base = 9 + (44 - d) * 0.35                       # crescimento suave
    base *= [1.0,1.05,1.0,1.1,1.15,0.9,0.95][dia.weekday()]  # seg..dom
    if d in (12, 11): base *= 2.6                     # um story que bombou
    n = max(2, int(random.gauss(base, base * .25)))
    for _ in range(n):
        hora = escolhe([(h, p) for h, p in zip(range(24), [1,.5,.3,.2,.2,.4,1,2,3,3.5,3.5,4,5,4.5,3.5,3,3,3.5,4,5.5,6,6,4.5,2.5])] ) if False else random.choices(range(24), weights=[1,.5,.3,.2,.2,.4,1,2,3,3.5,3.5,4,5,4.5,3.5,3,3,3.5,4,5.5,6,6,4.5,2.5])[0]
        minuto = random.randrange(60); seg = random.randrange(60)
        inicio = dt.datetime(dia.year, dia.month, dia.day, hora, minuto, seg)
        disp = escolhe([('celular',.79),('computador',.17),('tablet',.04)])
        largura = {'celular':random.choice([360,375,390,393,412,414,430]),'computador':random.choice([1280,1366,1440,1536,1920]),'tablet':random.choice([768,820,1024])}[disp]
        origem = escolhe(ORIGENS)
        utm_s = utm_m = utm_c = utm_ct = ''
        if origem in CAMP and random.random() < .85:
            utm_s = origem; utm_m, utm_c = random.choice(CAMP[origem]); utm_ct = ''
        # visitante novo ou recorrente
        if visitantes and random.random() < .22:
            vis = random.choice(list(visitantes)); nova = 0
        else:
            vis = 'v' + uuid.uuid4().hex[:10]; visitantes[vis] = 1; nova = 1
        # caminho pelas seções
        secoes = ['hero']; t = 0; trilha = ['0s hero']; eventos = 1
        for s in SECOES[1:]:
            ant = secoes[-1]
            p = SEGUE[ant] * (0.95 if disp == 'celular' else 1.05) * (1.08 if origem in ('direto','whatsapp') else 1)
            if random.random() > p: break
            t += max(2, int(random.expovariate(1/9)))
            secoes.append(s); trilha.append(f'{t}s {s}'); eventos += 1
        prof = POS[secoes[-1]] + random.randint(-3, 6)
        prof = max(5, min(100, prof))
        # fotos
        fotos = []
        if 'evolucao' in secoes and random.random() < .27:
            for f in random.sample(FOTOS, random.choice([1,1,1,2,2,3])):
                fotos.append(f); eventos += 1
        # faq
        faq = []
        if 'faq' in secoes and random.random() < .45:
            for q in random.sample(FAQ, random.choice([1,1,2])):
                faq.append(q); eventos += 1
        # método completo (só computador, quando viu a seção)
        metodo = 1 if (disp == 'computador' and 'metodo' in secoes and random.random() < .7) else 0
        if metodo: eventos += 1
        # cliques de compra
        cliques = []; primeiro = ''
        locais_poss = []
        if 'hero' in secoes: locais_poss.append(('hero', .10))
        if 'oferta-meio' in secoes: locais_poss.append(('oferta-meio', .42))
        if 'chamada-2' in secoes: locais_poss.append(('chamada-2', .06))
        if 'oferta' in secoes: locais_poss.append(('oferta-final', .14))
        if 'fecho' in secoes: locais_poss.append(('fecho', .03))
        if fotos: locais_poss.append(('popup', .07))
        if disp == 'celular' and len(secoes) > 1: locais_poss.append(('barra-fixa', .18))
        pclique = .035 + .012 * len(secoes) + (.03 if origem in ('direto','whatsapp') else 0)
        if locais_poss and random.random() < pclique:
            tot = sum(p for _, p in locais_poss)
            for _ in range(random.choice([1,1,1,2])):
                l = escolhe([(x, p / tot) for x, p in locais_poss]); cliques.append(l); eventos += 1
        tempo = int(max(4, random.lognormvariate(math.log(14 + 9 * len(secoes) + 15 * len(fotos) + 10 * len(faq)), .55)))
        if cliques:
            primeiro = max(3, int(tempo * random.uniform(.5, .95)))
            trilha.append(f'{primeiro}s clique:{cliques[0]}')
        for f in fotos: trilha.insert(min(len(trilha), 2 + random.randrange(2)), f'{random.randint(5, max(6, tempo // 2))}s foto:{f}')
        marcos = [m for m in (25,50,75,90,100) if prof >= m]; eventos += len(marcos)
        eventos += sum(1 for m in (10,30,60,120,300) if tempo >= m) + 1  # tempo_na_pagina + saida
        fim = inicio + dt.timedelta(seconds=tempo)
        rows.append({
            'sessao': 's' + uuid.uuid4().hex[:12], 'visitante': vis, 'nova_visita': nova,
            'inicio': inicio.strftime('%Y-%m-%dT%H:%M:%S-03:00'), 'fim': fim.strftime('%Y-%m-%dT%H:%M:%S-03:00'),
            'dia': dia.isoformat(), 'hora': hora, 'dia_semana': (dia.weekday() + 1) % 7,
            'dispositivo': disp, 'largura': largura, 'origem': origem, 'referencia': {'instagram':'l.instagram.com','facebook':'m.facebook.com','google':'google.com','tiktok':'tiktok.com'}.get(origem, ''), 'utm_source': utm_s, 'utm_medium': utm_m, 'utm_campaign': utm_c, 'utm_content': utm_ct,
            'tempo_s': tempo, 'profundidade_max': prof, 'secoes': '|'.join(secoes), 'secoes_n': len(secoes), 'ultima_secao': secoes[-1],
            'clique_n': len(cliques), 'cliques': '|'.join(cliques), 'primeiro_clique_s': primeiro,
            'fotos': '|'.join(fotos), 'fotos_n': len(fotos), 'faq': '|'.join(faq), 'faq_n': len(faq),
            'metodo_completo': metodo, 'saida_secao': secoes[-1], 'eventos_n': eventos, 'seq_max': eventos,
            'trilha': ' > '.join(trilha), 'recarregou': 0, 'exemplo': 1,
        })
rows.sort(key=lambda r: r['inicio'])
with open('sessoes-exemplo.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=COLS); w.writeheader(); w.writerows(rows)
import collections
print(len(rows), 'sessões;', sum(r['clique_n'] > 0 for r in rows), 'com clique;', round(100*sum(r['clique_n']>0 for r in rows)/len(rows),1), '%')
print(collections.Counter(r['dispositivo'] for r in rows)); print(collections.Counter(r['origem'] for r in rows))
print('bytes', len(open('sessoes-exemplo.csv','rb').read()))
