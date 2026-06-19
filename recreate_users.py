import urllib.request, json, ssl

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
        body = resp.read()
        return json.loads(body) if body else {}, None
    except urllib.error.HTTPError as e:
        body = e.read()
        try: return None, json.loads(body)
        except: return None, {"code": e.code, "message": str(e)}

# 1. Supprimer les users existants
print("=== Suppression des anciens comptes ===")
for u in USERS:
    result, err = call("DELETE", f"/users/{u['userId']}")
    if err and err.get("code") != 404:
        print(f"  ✗ Suppression {u['userId']}: {err.get('message','?')}")
    else:
        print(f"  ✓ Supprimé (ou inexistant): {u['userId']}")

# 2. Recréer via POST /users (password en clair → Appwrite gère le hash)
print("\n=== Création des comptes (mot de passe natif) ===")
for u in USERS:
    result, err = call("POST", "/users", {
        "userId": u["userId"],
        "email": u["email"],
        "password": u["password"],
        "name": u["name"],
    })
    if err:
        print(f"  ✗ {u['email']}: {err.get('message','?')}")
    else:
        print(f"  ✓ {u['email']} → ID: {result['$id']} status: {result.get('status','?')}")

# 3. Vérifier
print("\n=== Vérification ===")
data, err = call("GET", "/users?limit=10")
if not err:
    for u in data.get("users", []):
        print(f"  {u['email']} → {u['$id']} (status={u.get('status','?')})")
