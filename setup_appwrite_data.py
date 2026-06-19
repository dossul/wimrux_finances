import urllib.request, json, ssl, datetime

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
        return json.loads(resp.read()), None
    except urllib.error.HTTPError as e:
        err_body = e.read()
        try: err = json.loads(err_body)
        except: err = {"message": err_body.decode()}
        return None, err

def upsert_doc(collection, doc_id, data):
    # Try create first, update if exists
    payload = {"documentId": doc_id, "data": data, "permissions": []}
    result, err = call("POST", f"/databases/{DB_ID}/collections/{collection}/documents", payload)
    if err and err.get("code") == 409:
        result, err = call("PATCH", f"/databases/{DB_ID}/collections/{collection}/documents/{doc_id}", {"data": data})
    if err:
        print(f"  ✗ {collection}/{doc_id}: {err.get('message','?')}")
        return None
    print(f"  ✓ {collection}/{doc_id}")
    return result

# ── 1. Companies ──
print("=== Companies ===")
companies = [
    {
        "id": "company-wimrux",
        "data": {
            "name": "WIMRUX SaaS",
            "ifu": "0000000000000",
            "address": "Ouagadougou, Burkina Faso",
            "phone": "+22665599195",
            "email": "admin@wimrux.app",
            "country_code": "BF",
            "tax_regime": "reel_normal",
        }
    },
    {
        "id": "company-iltic",
        "data": {
            "name": "ILTIC",
            "ifu": "0000000000001",
            "address": "Ouagadougou, Burkina Faso",
            "phone": "+22665751089",
            "email": "test1@wimrux.app",
            "country_code": "BF",
            "tax_regime": "reel_normal",
        }
    },
    {
        "id": "company-westago",
        "data": {
            "name": "WESTAGO",
            "ifu": "0000000000002",
            "address": "Ouagadougou, Burkina Faso",
            "phone": "+22675532539",
            "email": "test2@wimrux.app",
            "country_code": "BF",
            "tax_regime": "reel_normal",
        }
    },
]
for c in companies:
    upsert_doc("companies", c["id"], c["data"])

# ── 2. User profiles ──
print("\n=== User Profiles ===")
profiles = [
    {
        "id": "profile-admin-wimrux",
        "data": {
            "user_id": "admin-wimrux",
            "company_id": "company-wimrux",
            "full_name": "Admin WIMRUX",
            "role": "project_admin",
            "phone": "+22665599195",
        }
    },
    {
        "id": "profile-admin-iltic",
        "data": {
            "user_id": "admin-iltic",
            "company_id": "company-iltic",
            "full_name": "Admin ILTIC",
            "role": "admin",
            "phone": "+22665751089",
        }
    },
    {
        "id": "profile-admin-westago",
        "data": {
            "user_id": "admin-westago",
            "company_id": "company-westago",
            "full_name": "Admin WESTAGO",
            "role": "admin",
            "phone": "+22675532539",
        }
    },
]
for p in profiles:
    upsert_doc("user_profiles", p["id"], p["data"])

# ── 3. Vérification rapide ──
print("\n=== Vérification ===")
for col in ["companies", "user_profiles"]:
    data, err = call("GET", f"/databases/{DB_ID}/collections/{col}/documents?limit=10")
    if err:
        print(f"  ✗ {col}: {err.get('message','?')}")
    else:
        docs = data.get("documents", [])
        print(f"  ✓ {col}: {len(docs)} document(s)")

print("\n✅ Terminé — tentez de vous connecter sur https://www.wimrux.app")
