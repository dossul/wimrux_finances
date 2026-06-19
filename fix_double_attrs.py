import urllib.request, json, ssl, time

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT  = "6a29285200015cd421c7"
API_KEY  = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID    = "wimrux_finances"

ctx = ssl._create_unverified_context()
HEADERS = {"Content-Type": "application/json", "X-Appwrite-Project": PROJECT, "X-Appwrite-Key": API_KEY}

def call(method, path, body=None):
    url = ENDPOINT + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=15)
        b = resp.read()
        return json.loads(b) if b else {}, None
    except urllib.error.HTTPError as e:
        b = e.read()
        try: return None, json.loads(b)
        except: return None, {"code": e.code, "message": str(e)}

def attr(col_id, typ, key, **kw):
    r, err = call("POST", f"/databases/{DB_ID}/collections/{col_id}/attributes/{typ}", {"key": key, **kw})
    if err:
        code = err.get("code")
        msg  = err.get("message","?")
        print(f"    {'~' if code==409 else '✗'} {key}: {'' if code==409 else msg}")
    else:
        print(f"    + {key} ({typ})")

# float attrs manquants
FLOAT_ATTRS = [
    ("bank_transactions", "amount"),
    ("bank_transactions", "balance"),
    ("mobile_wallets",    "balance"),
    ("ai_usage_logs",     "cost"),
]

print("=== Ajout attributs float ===")
for col_id, key in FLOAT_ATTRS:
    attr(col_id, "float", key, required=False)

print("\n✅ Done")
