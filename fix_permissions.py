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
        resp = urllib.request.urlopen(req, context=ctx, timeout=30)
        b = resp.read()
        return json.loads(b) if b else {}, None
    except urllib.error.HTTPError as e:
        b = e.read()
        try: return None, json.loads(b)
        except: return None, {"code": e.code, "message": str(e)}

# Permissions: any authenticated user can read/write their company data
# role:users = all authenticated users
PERMS_USERS = [
    'read("users")',
    'create("users")',
    'update("users")',
    'delete("users")',
]

# Get all collections and set permissions
print("=== Récupération des collections ===")
collections = []
offset = 0
while True:
    data, err = call("GET", f"/databases/{DB_ID}/collections?limit=25&offset={offset}")
    batch = data.get("collections", [])
    collections += [c["$id"] for c in batch]
    if len(batch) < 25:
        break
    offset += 25
print(f"  {len(collections)} collections trouvées")

print("\n=== Application des permissions role:users ===")
for col_id in collections:
    # Get current collection to preserve other settings
    col, err = call("GET", f"/databases/{DB_ID}/collections/{col_id}")
    if err:
        print(f"  ✗ GET {col_id}: {err.get('message','?')}")
        continue

    current_perms = col.get("$permissions", [])
    # Check if users perm already set
    if 'read("users")' in current_perms:
        print(f"  ~ {col_id}: perms déjà ok")
        continue

    # Update permissions
    r, err = call("PUT", f"/databases/{DB_ID}/collections/{col_id}", {
        "name": col["name"],
        "permissions": PERMS_USERS,
        "documentSecurity": col.get("documentSecurity", False),
        "enabled": col.get("enabled", True),
    })
    if err:
        print(f"  ✗ {col_id}: {err.get('message','?')}")
    else:
        print(f"  ✓ {col_id}: permissions mises à jour")

print("\n✅ Permissions appliquées")
