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
        body = resp.read()
        return json.loads(body) if body else {}, None
    except urllib.error.HTTPError as e:
        body = e.read()
        try: return None, json.loads(body)
        except: return None, {"code": e.code, "message": str(e)}

def create_collection(col_id, name, perms=None):
    result, err = call("POST", f"/databases/{DB_ID}/collections", {
        "collectionId": col_id,
        "name": name,
        "permissions": perms or [],
        "documentSecurity": False,
    })
    if err:
        if err.get("code") == 409:
            print(f"  ~ collection {col_id} déjà existante")
        else:
            print(f"  ✗ collection {col_id}: {err.get('message','?')}")
        return False
    print(f"  ✓ collection {col_id} créée")
    return True

def add_attr(col_id, attr_type, key, **kwargs):
    payload = {"key": key}
    payload.update(kwargs)
    result, err = call("POST", f"/databases/{DB_ID}/collections/{col_id}/attributes/{attr_type}", payload)
    if err:
        if err.get("code") == 409:
            print(f"    ~ attr {key} déjà existant")
        else:
            print(f"    ✗ attr {key}: {err.get('message','?')}")
    else:
        print(f"    ✓ attr {key} ({attr_type})")

def add_index(col_id, key, attrs, idx_type="key"):
    result, err = call("POST", f"/databases/{DB_ID}/collections/{col_id}/indexes", {
        "key": key, "type": idx_type, "attributes": attrs, "orders": ["ASC"] * len(attrs)
    })
    if err:
        if err.get("code") == 409:
            print(f"    ~ index {key} déjà existant")
        else:
            print(f"    ✗ index {key}: {err.get('message','?')}")
    else:
        print(f"    ✓ index {key}")

# ── 1. Ajouter created_at / updated_at sur invoices ──
print("=== invoices: ajout created_at / updated_at ===")
add_attr("invoices", "datetime", "created_at", required=False)
add_attr("invoices", "datetime", "updated_at", required=False)
add_attr("invoices", "string",   "invoice_number", size=100, required=False)

# ── 2. Ajouter is_archived sur notifications ──
print("\n=== notifications: ajout is_archived ===")
add_attr("notifications", "boolean", "is_archived", required=False, default=False)
add_attr("notifications", "datetime", "created_at", required=False)
add_attr("notifications", "datetime", "updated_at", required=False)

time.sleep(2)

# ── 3. Créer company_custom_roles ──
print("\n=== company_custom_roles ===")
create_collection("company_custom_roles", "Company Custom Roles")
time.sleep(1)
add_attr("company_custom_roles", "string",  "company_id", size=36, required=True)
add_attr("company_custom_roles", "string",  "label",      size=100, required=True)
add_attr("company_custom_roles", "string",  "description", size=500, required=False)
add_attr("company_custom_roles", "string",  "permissions", size=5000, required=False)
add_attr("company_custom_roles", "datetime","created_at", required=False)
time.sleep(1)
add_index("company_custom_roles", "idx_company_id", ["company_id"])
add_index("company_custom_roles", "idx_label", ["label"])

# ── 4. Créer user_role_assignments ──
print("\n=== user_role_assignments ===")
create_collection("user_role_assignments", "User Role Assignments")
time.sleep(1)
add_attr("user_role_assignments", "string",  "company_id", size=36, required=True)
add_attr("user_role_assignments", "string",  "user_id",    size=36, required=True)
add_attr("user_role_assignments", "string",  "role_id",    size=36, required=False)
add_attr("user_role_assignments", "string",  "role_name",  size=100, required=False)
add_attr("user_role_assignments", "string",  "permissions", size=5000, required=False)
add_attr("user_role_assignments", "datetime","created_at", required=False)
time.sleep(1)
add_index("user_role_assignments", "idx_company_id", ["company_id"])
add_index("user_role_assignments", "idx_user_id",    ["user_id"])

# ── 5. Ajouter index created_at sur invoices ──
print("\n=== invoices: index created_at ===")
time.sleep(3)  # wait for attr processing
add_index("invoices", "idx_created_at", ["created_at"])

print("\n✅ Terminé")
