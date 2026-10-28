#!/bin/zsh
# Spielt worker/worker.js ein und behält Secret, Variablen, KV-Bindung
cd "/Users/FXFFWZG/Downloads/Claude Ordner/outfit"
TK=$(security find-generic-password -s cloudflare-outfit -w)
ACC=$(curl -s -H "Authorization: Bearer $TK" https://api.cloudflare.com/client/v4/accounts | python3 -c "import json,sys; print(json.load(sys.stdin)['result'][0]['id'])")
NS=$(curl -s -H "Authorization: Bearer $TK" "https://api.cloudflare.com/client/v4/accounts/$ACC/storage/kv/namespaces" | python3 -c "import json,sys; print([n['id'] for n in json.load(sys.stdin)['result'] if n['title']=='outfit-zaehler'][0])")
META=$(python3 -c "
import json,sys
print(json.dumps({'main_module':'worker.js','compatibility_date':'2026-10-18',
 'bindings':[{'type':'plain_text','name':'ALLOW_ORIGIN','text':'https://alw0404.github.io'},
             {'type':'plain_text','name':'TAGESLIMIT','text':'150'},
             {'type':'plain_text','name':'BILD_LIMIT','text':'40'},
             {'type':'plain_text','name':'BILD_LIMIT_GERAET','text':'25'},
             {'type':'kv_namespace','name':'ZAEHLER','namespace_id':sys.argv[1]},
             {'type':'ai','name':'AI'}],
 'keep_bindings':['secret_text']}))" "$NS")
curl -s -X PUT -H "Authorization: Bearer $TK" "https://api.cloudflare.com/client/v4/accounts/$ACC/workers/scripts/outfit-ki" -F "metadata=$META;type=application/json" -F "worker.js=@worker/worker.js;type=application/javascript+module" | python3 -c "import json,sys; d=json.load(sys.stdin); print('Worker:', 'erfolg' if d.get('success') else 'FEHLER', d.get('errors'))"
if [ -n "$1" ]; then
  curl -s -X PUT -H "Authorization: Bearer $TK" -H "Content-Type: application/json" -d "[{\"cron\":\"$1\"}]" "https://api.cloudflare.com/client/v4/accounts/$ACC/workers/scripts/outfit-ki/schedules" | python3 -c "import json,sys; d=json.load(sys.stdin); print('Zeitplan:', [s['cron'] for s in d['result']['schedules']] if d.get('success') else d.get('errors'))"
fi
