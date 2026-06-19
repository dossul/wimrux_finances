import urllib.request, json, ssl, urllib.parse

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT  = "6a29285200015cd421c7"
API_KEY  = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID    = "wimrux_finances"

ctx = ssl._create_unverified_context()
HEADERS = {"X-Appwrite-Project": PROJECT, "X-Appwrite-Key": API_KEY}

def call(path):
    req = urllib.request.Request(ENDPOINT + path, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=15)
        return json.loads(resp.read()), None
    except urllib.error.HTTPError as e:
        try: return None, json.loads(e.read())
        except: return None, {"code": e.code, "message": str(e)}

# Test 1: lister tous les user_profiles sans filtre
print("=== Test 1: list sans filtre ===")
data, err = call(f"/databases/{DB_ID}/collections/user_profiles/documents?limit=10")
if err:
    print("ERREUR:", err)
else:
    docs = data.get("documents", [])
    print(f"{len(docs)} document(s):")
    for d in docs:
        print(f"  id={d['$id']} user_id={d.get('user_id')} company_id={d.get('company_id')}")

# Test 2: query avec equal sur user_id (format Appwrite SDK)
print("\n=== Test 2: query equal(user_id, admin-westago) ===")
q = urllib.parse.quote('equal("user_id", ["admin-westago"])')
data, err = call(f'/databases/{DB_ID}/collections/user_profiles/documents?queries[]={q}')
if err:
    print("ERREUR:", err)
else:
    docs = data.get("documents", [])
    print(f"{len(docs)} document(s) trouvé(s)")
    for d in docs:
        print(f"  {d}")

# Test 3: voir les indexes
print("\n=== Index user_profiles ===")
data, err = call(f"/databases/{DB_ID}/collections/user_profiles")
if not err:
    for idx in data.get("indexes", []):
        print(f"  {idx['key']} ({idx['type']}): {idx.get('status')} attrs={idx.get('attributes')}")
