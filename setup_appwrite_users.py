import urllib.request, json, ssl, sys

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT  = "6a29285200015cd421c7"
API_KEY  = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"

ctx = ssl._create_unverified_context()

HEADERS = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY,
}

USERS = [
    {"userId": "admin-wimrux",  "email": "admin@wimrux.app",  "password": "WimruxAdmin2026!", "name": "Admin WIMRUX"},
    {"userId": "admin-iltic",   "email": "test1@wimrux.app",  "password": "WimruxAdmin2026!", "name": "Admin ILTIC"},
    {"userId": "admin-westago", "email": "test2@wimrux.app",  "password": "WimruxAdmin2026!", "name": "Admin WESTAGO"},
]

def call(method, path, body=None):
    url = ENDPOINT + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=15)
        return json.loads(resp.read()), None
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        return None, err

# 1. Lister les users existants
print("=== Users existants ===")
data, err = call("GET", "/users?limit=25")
if err:
    print("Erreur list users:", err)
else:
    existing = {u["email"]: u["$id"] for u in data.get("users", [])}
    print(f"{len(existing)} user(s) trouvé(s):", list(existing.keys()))

# 2. Créer les users manquants
print("\n=== Création des comptes ===")
created_ids = {}
for u in USERS:
    if u["email"] in existing:
        print(f"✓ {u['email']} existe déjà → ID: {existing[u['email']]}")
        created_ids[u["email"]] = existing[u["email"]]
        continue
    result, err = call("POST", "/users/bcrypt", {
        "userId": u["userId"],
        "email": u["email"],
        "password": u["password"],
        "name": u["name"],
    })
    if err:
        # Try with argon2
        result, err2 = call("POST", "/users", {
            "userId": u["userId"],
            "email": u["email"],
            "password": u["password"],
            "name": u["name"],
        })
    if err and err2:
        print(f"✗ {u['email']} ERREUR:", err2 or err)
    else:
        uid = result["$id"]
        created_ids[u["email"]] = uid
        print(f"✓ {u['email']} créé → ID: {uid}")

# 3. Vérifier les databases disponibles
print("\n=== Databases ===")
data, err = call("GET", "/databases?limit=25")
if err:
    print("Erreur:", err)
else:
    dbs = data.get("databases", [])
    print(f"{len(dbs)} database(s):")
    for db in dbs:
        print(f"  - {db['$id']} : {db['name']}")
        # List collections
        cols, cerr = call("GET", f"/databases/{db['$id']}/collections?limit=50")
        if not cerr:
            colls = cols.get("collections", [])
            print(f"    {len(colls)} collection(s):", [c['name'] for c in colls])

# 4. Vérifier les labels/rôles des users créés
print("\n=== Résumé IDs ===")
for email, uid in created_ids.items():
    print(f"  {email} → {uid}")
