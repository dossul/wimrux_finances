import json, ssl, urllib.request

ENDPOINT = "https://appwrite.benga.live/v1"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"

ctx = ssl._create_unverified_context()
headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": "6a29285200015cd421c7",
    "X-Appwrite-Key": API_KEY
}

def call(method, path, body=None):
    url = ENDPOINT + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=30)
        b = resp.read()
        return json.loads(b) if b else {}, None
    except urllib.error.HTTPError as e:
        b = e.read()
        try: return None, json.loads(b)
        except: return None, {"code": e.code, "message": str(e)}

COMMON_VARS = {
    "APPWRITE_ENDPOINT": "https://appwrite.benga.live/v1",
    "APPWRITE_PROJECT": "6a29285200015cd421c7",
    "APPWRITE_DATABASE": "wimrux_finances",
}

for fid in ['fnec-simulator','chatbot-gateway','crypto-aes256','delete-user']:
    print(f"  {fid}")
    data, err = call("GET", f"/functions/{fid}/variables?limit=100")
    existing = {v["key"]: v for v in data.get("variables", [])} if data else {}
    for key, value in COMMON_VARS.items():
        if key in existing:
            var_id = existing[key]["$id"]
            _, err = call("PUT", f"/functions/{fid}/variables/{var_id}", {"value": value})
        else:
            _, err = call("POST", f"/functions/{fid}/variables", {"key": key, "value": value})
        if err:
            print(f"    ERROR {key}: {err.get('message', err)}")

print("Done.")
