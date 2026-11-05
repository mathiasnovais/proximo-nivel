import pathlib, subprocess
d = pathlib.Path(__file__).parent
subprocess.run(['npx', 'tailwindcss', '-c', 'tailwind.config.js', '-i', 'src/input.css', '-o', 'dist/tailwind.css', '--minify'], cwd=d, check=True)
css = (d/'dist/tailwind.css').read_text()
body = (d/'src/index.html').read_text()
# fotos: cada src="img/..." vira data URI, para a página continuar em um arquivo só
import base64, re
def inline(m):
    p = d/'src'/m.group(1)
    if not p.exists(): return m.group(0)
    mime = 'image/jpeg' if p.suffix.lower() in ('.jpg', '.jpeg') else 'image/' + p.suffix.lower().lstrip('.')
    return 'src="data:%s;base64,%s"' % (mime, base64.b64encode(p.read_bytes()).decode())
body = re.sub(r'src="(img/[^"]+)"', inline, body)
js = (d/'src/app.js').read_text()
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;700&display=swap">'
# página sem doctype, para embutir em outro HTML
art = f'<title>Próximo Nível</title>\n{fonts}\n<style>{css}</style>\n\n{body}\n<script>\n{js}</script>\n'
(d/'dist/artifact.html').write_text(art)
# arquivo completo para hospedar
full = f'<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Próximo Nível</title>\n{fonts}\n<style>{css}</style>\n</head>\n<body>\n{body}\n<script>\n{js}</script>\n</body>\n</html>\n'
(d/'dist/Proximo-Nivel.html').write_text(full)
print('css', len(css), 'html', len(full))
