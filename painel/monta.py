import pathlib
t = pathlib.Path('painel.template.html').read_text()
csv = pathlib.Path('sessoes-exemplo.csv').read_text(encoding='utf-8')
assert '</script' not in csv
minis = pathlib.Path('miniaturas.json').read_text()
assert '</script' not in minis
pathlib.Path('painel.html').write_text(t.replace('__DADOS_EXEMPLO__', '\n' + csv).replace('__MINIATURAS__', minis), encoding='utf-8')
print('painel.html', pathlib.Path('painel.html').stat().st_size // 1024, 'KB')
