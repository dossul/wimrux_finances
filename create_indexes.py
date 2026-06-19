import urllib.request, json, ssl, time

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT  = "6a29285200015cd421c7"
API_KEY  = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID    = "wimrux_finances"

ctx = ssl._create_unverified_context()
HEADERS = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY,
}

def call(method, path, body=None):
    url = ENDPOINT + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=15)
        body = resp.read()
        return json.loads(body) if body else {}, None
    except urllib.error.HTTPError as e:
        body = e.read()
        try: return None, json.loads(body)
        except: return None, {"code": e.code, "message": str(e)}

def create_index(collection, index_key, attr):
    result, err = call("POST", f"/databases/{DB_ID}/collections/{collection}/indexes", {
        "key": index_key,
        "type": "key",
        "attributes": [attr],
        "orders": ["ASC"],
    })
    if err:
        if err.get("code") == 409:
            print(f"  ~ {collection}.{attr}: index déjà existant")
        else:
            print(f"  ✗ {collection}.{attr}: {err.get('message','?')}")
    else:
        print(f"  ✓ {collection}.{attr}: index créé (status={result.get('status','?')})")

# Index critiques pour les queries de l'app
INDEXES = [
    # user_profiles — query par user_id et company_id
    ("user_profiles", "idx_user_id",    "user_id"),
    ("user_profiles", "idx_company_id", "company_id"),
    # companies — pas de query par attribut normalement
    # invoices — les plus utilisées
    ("invoices", "idx_company_id",  "company_id"),
    ("invoices", "idx_status",      "status"),
    ("invoices", "idx_client_id",   "client_id"),
    # clients
    ("clients",  "idx_company_id",  "company_id"),
    # bank_accounts
    ("bank_accounts", "idx_company_id", "company_id"),
    # audit_log
    ("audit_log", "idx_company_id", "company_id"),
    # ai_providers
    ("ai_providers", "idx_company_id", "company_id"),
]

print("=== Création des index Appwrite ===\n")
for collection, index_key, attr in INDEXES:
    create_index(collection, index_key, attr)

print("\n✅ Index créés — attente 3s pour processing...")
time.sleep(3)

# Vérifier le statut des index user_profiles
print("\n=== Statut index user_profiles ===")
data, err = call("GET", f"/databases/{DB_ID}/collections/user_profiles")
if not err:
    for idx in data.get("indexes", []):
        print(f"  {idx['key']}: {idx.get('status','?')}")
