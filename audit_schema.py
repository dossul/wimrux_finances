import urllib.request, json, ssl

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
        except: return None, {"code": e.code}

# List all collections
data, err = call(f"/databases/{DB_ID}/collections?limit=50")
collections = {c["$id"]: c["name"] for c in data.get("collections", [])}
print(f"=== {len(collections)} collections existantes ===")
for cid, name in sorted(collections.items()):
    print(f"  {cid}")

# Check specific collections needed by the app
NEEDED = ["company_custom_roles", "user_role_assignments", "notifications", "invoices"]
print("\n=== Collections manquantes ===")
for c in NEEDED:
    if c not in collections:
        print(f"  MANQUANTE: {c}")

# Check invoices attributes
print("\n=== Attributs invoices ===")
data, err = call(f"/databases/{DB_ID}/collections/invoices")
if not err:
    attrs = [a["key"] for a in data.get("attributes", [])]
    print(f"  {len(attrs)} attrs: {attrs}")
    missing = [a for a in ["created_at", "updated_at", "company_id", "client_id", "status"] if a not in attrs]
    if missing:
        print(f"  MANQUANTS: {missing}")

# Check notifications attributes  
print("\n=== Attributs notifications ===")
data, err = call(f"/databases/{DB_ID}/collections/notifications")
if err:
    print(f"  COLLECTION MANQUANTE: {err}")
else:
    attrs = [a["key"] for a in data.get("attributes", [])]
    print(f"  {len(attrs)} attrs: {attrs}")
