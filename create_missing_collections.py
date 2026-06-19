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

def create_col(col_id, name):
    r, err = call("POST", f"/databases/{DB_ID}/collections", {
        "collectionId": col_id, "name": name, "permissions": [], "documentSecurity": False
    })
    if err:
        print(f"  {'~' if err.get('code')==409 else '✗'} {col_id}: {'' if err.get('code')==409 else err.get('message','?')}")
        return err.get("code") == 409  # True = already existed
    print(f"  ✓ {col_id} créée")
    return True

def attr(col_id, typ, key, **kw):
    r, err = call("POST", f"/databases/{DB_ID}/collections/{col_id}/attributes/{typ}", {"key": key, **kw})
    if err:
        print(f"    {'~' if err.get('code')==409 else '✗'} {key}: {'' if err.get('code')==409 else err.get('message','?')}")
    else:
        print(f"    + {key}")

def idx(col_id, key, attrs_list):
    r, err = call("POST", f"/databases/{DB_ID}/collections/{col_id}/indexes", {
        "key": key, "type": "key", "attributes": attrs_list, "orders": ["ASC"]*len(attrs_list)
    })
    if err and err.get("code") != 409:
        print(f"    ✗ idx {key}: {err.get('message','?')}")
    else:
        print(f"    ~ idx {key}")

# ── bank_transactions ──
print("=== bank_transactions ===")
create_col("bank_transactions", "Bank Transactions")
time.sleep(1)
for k, t, kw in [
    ("company_id",   "string",   {"size":36,"required":True}),
    ("account_id",   "string",   {"size":36,"required":True}),
    ("type",         "string",   {"size":20,"required":False}),
    ("amount",       "double",   {"required":False}),
    ("balance",      "double",   {"required":False}),
    ("description",  "string",   {"size":500,"required":False}),
    ("reference",    "string",   {"size":200,"required":False}),
    ("transaction_date","datetime",{"required":False}),
    ("status",       "string",   {"size":50,"required":False}),
    ("is_reconciled","boolean",  {"required":False,"default":False}),
    ("created_at",   "datetime", {"required":False}),
    ("updated_at",   "datetime", {"required":False}),
]:
    attr("bank_transactions", t, k, **kw)
time.sleep(1)
idx("bank_transactions", "idx_company_id", ["company_id"])
idx("bank_transactions", "idx_account_id", ["account_id"])

# ── categories ──
print("\n=== categories ===")
create_col("categories", "Transaction Categories")
time.sleep(1)
for k, t, kw in [
    ("company_id",  "string",  {"size":36,"required":True}),
    ("name",        "string",  {"size":200,"required":True}),
    ("type",        "string",  {"size":20,"required":False}),
    ("color",       "string",  {"size":20,"required":False}),
    ("icon",        "string",  {"size":50,"required":False}),
    ("parent_id",   "string",  {"size":36,"required":False}),
    ("created_at",  "datetime",{"required":False}),
]:
    attr("categories", t, k, **kw)
time.sleep(1)
idx("categories", "idx_company_id", ["company_id"])

# ── mobile_wallets ──
print("\n=== mobile_wallets ===")
create_col("mobile_wallets", "Mobile Wallets")
time.sleep(1)
for k, t, kw in [
    ("company_id",  "string",  {"size":36,"required":True}),
    ("name",        "string",  {"size":200,"required":True}),
    ("provider",    "string",  {"size":50,"required":False}),
    ("phone",       "string",  {"size":30,"required":False}),
    ("balance",     "double",  {"required":False}),
    ("currency",    "string",  {"size":10,"required":False}),
    ("is_active",   "boolean", {"required":False,"default":True}),
    ("created_at",  "datetime",{"required":False}),
    ("updated_at",  "datetime",{"required":False}),
]:
    attr("mobile_wallets", t, k, **kw)
time.sleep(1)
idx("mobile_wallets", "idx_company_id", ["company_id"])

# ── chatbot_conversations ──
print("\n=== chatbot_conversations ===")
create_col("chatbot_conversations", "Chatbot Conversations")
time.sleep(1)
for k, t, kw in [
    ("company_id",  "string",  {"size":36,"required":True}),
    ("user_id",     "string",  {"size":36,"required":True}),
    ("title",       "string",  {"size":500,"required":False}),
    ("status",      "string",  {"size":20,"required":False}),
    ("created_at",  "datetime",{"required":False}),
    ("updated_at",  "datetime",{"required":False}),
]:
    attr("chatbot_conversations", t, k, **kw)
time.sleep(1)
idx("chatbot_conversations", "idx_company_id", ["company_id"])
idx("chatbot_conversations", "idx_user_id", ["user_id"])

# ── chatbot_messages ──
print("\n=== chatbot_messages ===")
create_col("chatbot_messages", "Chatbot Messages")
time.sleep(1)
for k, t, kw in [
    ("conversation_id","string",{"size":36,"required":True}),
    ("company_id",  "string",  {"size":36,"required":True}),
    ("role",        "string",  {"size":20,"required":False}),
    ("content",     "string",  {"size":50000,"required":False}),
    ("created_at",  "datetime",{"required":False}),
]:
    attr("chatbot_messages", t, k, **kw)
time.sleep(1)
idx("chatbot_messages", "idx_conversation_id", ["conversation_id"])
idx("chatbot_messages", "idx_company_id", ["company_id"])

# ── ai_usage_logs ──
print("\n=== ai_usage_logs ===")
create_col("ai_usage_logs", "AI Usage Logs")
time.sleep(1)
for k, t, kw in [
    ("company_id",  "string",  {"size":36,"required":True}),
    ("user_id",     "string",  {"size":36,"required":False}),
    ("model",       "string",  {"size":100,"required":False}),
    ("task",        "string",  {"size":100,"required":False}),
    ("tokens_in",   "integer", {"required":False}),
    ("tokens_out",  "integer", {"required":False}),
    ("cost",        "double",  {"required":False}),
    ("created_at",  "datetime",{"required":False}),
]:
    attr("ai_usage_logs", t, k, **kw)
time.sleep(1)
idx("ai_usage_logs", "idx_company_id", ["company_id"])

print("\n✅ Toutes les collections créées")
