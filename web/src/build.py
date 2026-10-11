import re,sys
src=open(sys.argv[1]).read()
src=re.sub(r'<link rel="(?:preconnect|stylesheet)"[^>]*>\n?','',src)
shim=open('shim.js').read(); sync=open('sync.js').read()
i=src.index('<script>')
src=src[:i]+'<script>\n'+shim+'\n</script>\n'+src[i:]+'\n<script>\n'+sync+'\n</script>\n'
fonts=open('fonts.css').read()
head='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}'+fonts+'</style></head><body>\n'
open('app.html','w').write(head+src+'\n</body></html>\n')
print(len(head+src))
