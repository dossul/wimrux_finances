"""
Synchronise Appwrite avec le schéma SQL InsForge (source de vérité).
- Crée les collections manquantes avec les bons attributs
- Applique les permissions role:users sur toutes les collections
- Ajoute les attributs manquants sur les collections existantes
- Crée les index nécessaires
"""
import urllib.request, json, ssl, time

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT  = "6a29285200015cd421c7"
API_KEY  = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID    = "wimrux_finances"
PERMS    = ['read("users")', 'create("users")', 'update("users")', 'delete("users")']

ctx = ssl._create_unverified_context()
HEADERS = {"Content-Type": "application/json", "X-Appwrite-Project": PROJECT, "X-Appwrite-Key": API_KEY}

def call(method, path, body=None):
    url = ENDPOINT + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, context=ctx, timeout=30)
            b = resp.read()
            return json.loads(b) if b else {}, None
        except urllib.error.HTTPError as e:
            b = e.read()
            try: return None, json.loads(b)
            except: return None, {"code": e.code, "message": str(e)}
        except Exception as e:
            if attempt < 2:
                print(f"    [retry {attempt+1}] {e}")
                time.sleep(3)
            else:
                return None, {"code": 0, "message": str(e)}

def get_existing_collections():
    cols = {}
    offset = 0
    while True:
        data, err = call("GET", f"/databases/{DB_ID}/collections?limit=25&offset={offset}")
        if err: break
        batch = data.get("collections", [])
        for c in batch:
            attrs = {a["key"] for a in c.get("attributes", [])}
            cols[c["$id"]] = {"name": c["name"], "attrs": attrs, "perms": c.get("$permissions", [])}
        if len(batch) < 25: break
        offset += 25
    return cols

def get_collection_detail(col_id):
    data, err = call("GET", f"/databases/{DB_ID}/collections/{col_id}")
    if err: return set()
    return {a["key"] for a in data.get("attributes", [])}

def create_col(col_id, name):
    r, err = call("POST", f"/databases/{DB_ID}/collections", {
        "collectionId": col_id, "name": name, "permissions": PERMS, "documentSecurity": False
    })
    if err:
        if err.get("code") == 409: print(f"  ~ {col_id} (existe)")
        else: print(f"  ✗ {col_id}: {err.get('message','?')}")
    else:
        print(f"  ✓ {col_id} créée")

def set_perms(col_id, col_name):
    r, err = call("PUT", f"/databases/{DB_ID}/collections/{col_id}", {
        "name": col_name, "permissions": PERMS, "documentSecurity": False, "enabled": True
    })
    if err: print(f"  ✗ perms {col_id}: {err.get('message','?')}")

def add_attr(col_id, typ, key, **kw):
    r, err = call("POST", f"/databases/{DB_ID}/collections/{col_id}/attributes/{typ}", {"key": key, **kw})
    if err and err.get("code") != 409:
        print(f"    ✗ {key}: {err.get('message','?')}")

def add_idx(col_id, key, attrs_list, typ="key"):
    r, err = call("POST", f"/databases/{DB_ID}/collections/{col_id}/indexes", {
        "key": key, "type": typ, "attributes": attrs_list, "orders": ["ASC"]*len(attrs_list)
    })
    if err and err.get("code") != 409:
        print(f"    ✗ idx {key}: {err.get('message','?')}")

# ─────────────────────────────────────────────
# SCHÉMA COMPLET extrait du SQL (source de vérité)
# format: col_id -> (name, [(key, type, kwargs)], [index_defs])
# ─────────────────────────────────────────────
SCHEMA = {
    # ── CORE ──
    "companies": ("Companies", [
        ("name",                    "string",   {"size":255,"required":True}),
        ("ifu",                     "string",   {"size":20,"required":True}),
        ("rccm",                    "string",   {"size":100,"required":False}),
        ("address_cadastral",       "string",   {"size":100,"required":False}),
        ("phone",                   "string",   {"size":30,"required":False}),
        ("email",                   "string",   {"size":255,"required":False}),
        ("address",                 "string",   {"size":2000,"required":False}),
        ("tax_regime",              "string",   {"size":100,"required":False}),
        ("tax_office",              "string",   {"size":255,"required":False}),
        ("logo_url",                "string",   {"size":2000,"required":False}),
        ("created_at",              "datetime", {"required":False}),
        ("ai_model",                "string",   {"size":100,"required":False}),
        ("ai_fallback_model",       "string",   {"size":100,"required":False}),
        ("ai_system_prompt",        "string",   {"size":10000,"required":False}),
        ("ai_enabled",              "boolean",  {"required":False,"default":True}),
        ("openrouter_api_key",      "string",   {"size":500,"required":False}),
        ("chatbot_enabled",         "boolean",  {"required":False,"default":False}),
        ("is_active",               "boolean",  {"required":False,"default":True}),
        ("qr_scan_base_url",        "string",   {"size":500,"required":False}),
        ("fiscal_profile",          "string",   {"size":10,"required":False}),
        ("country_code",            "string",   {"size":3,"required":False}),
        ("locale",                  "string",   {"size":10,"required":False}),
        ("certification_mode",      "string",   {"size":20,"required":False}),
        ("stirling_api_url",        "string",   {"size":500,"required":False}),
        ("stirling_api_key",        "string",   {"size":500,"required":False}),
        ("is_platform_provider",    "boolean",  {"required":False,"default":False}),
    ], []),

    "user_profiles": ("User Profiles", [
        ("user_id",         "string",   {"size":255,"required":True}),
        ("company_id",      "string",   {"size":36,"required":True}),
        ("role",            "string",   {"size":20,"required":True}),
        ("full_name",       "string",   {"size":255,"required":True}),
        ("created_at",      "datetime", {"required":False}),
        ("phone",           "string",   {"size":50,"required":False}),
        ("two_fa_enabled",  "boolean",  {"required":False,"default":True}),
    ], [("idx_user_id",["user_id"]), ("idx_company_id",["company_id"])]),

    "clients": ("Clients", [
        ("company_id",          "string",   {"size":36,"required":True}),
        ("type",                "string",   {"size":5,"required":True}),
        ("name",                "string",   {"size":255,"required":True}),
        ("ifu",                 "string",   {"size":20,"required":False}),
        ("rccm",                "string",   {"size":100,"required":False}),
        ("address",             "string",   {"size":2000,"required":False}),
        ("address_cadastral",   "string",   {"size":100,"required":False}),
        ("phone",               "string",   {"size":30,"required":False}),
        ("email",               "string",   {"size":255,"required":False}),
        ("created_at",          "datetime", {"required":False}),
        ("updated_at",          "datetime", {"required":False}),
        ("is_active",           "boolean",  {"required":False,"default":True}),
    ], [("idx_company_id",["company_id"])]),

    "suppliers": ("Suppliers", [
        ("company_id",          "string",   {"size":36,"required":True}),
        ("name",                "string",   {"size":255,"required":True}),
        ("ifu",                 "string",   {"size":50,"required":False}),
        ("rccm",                "string",   {"size":100,"required":False}),
        ("address",             "string",   {"size":2000,"required":False}),
        ("phone",               "string",   {"size":50,"required":False}),
        ("email",               "string",   {"size":255,"required":False}),
        ("country",             "string",   {"size":2,"required":False}),
        ("payment_terms_days",  "integer",  {"required":False}),
        ("bank_name",           "string",   {"size":255,"required":False}),
        ("bank_iban",           "string",   {"size":100,"required":False}),
        ("bank_bic",            "string",   {"size":20,"required":False}),
        ("notes",               "string",   {"size":5000,"required":False}),
        ("is_active",           "boolean",  {"required":False,"default":True}),
        ("created_at",          "datetime", {"required":False}),
        ("updated_at",          "datetime", {"required":False}),
        ("regime_fiscal",       "string",   {"size":20,"required":False}),
        ("division_fiscale",    "string",   {"size":100,"required":False}),
        ("supplier_code",       "string",   {"size":50,"required":False}),
        ("supplier_type",       "string",   {"size":20,"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "bank_accounts": ("Bank Accounts", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("bank_name",       "string",   {"size":255,"required":True}),
        ("bank_code",       "string",   {"size":20,"required":False}),
        ("account_number",  "string",   {"size":50,"required":True}),
        ("iban",            "string",   {"size":50,"required":False}),
        ("bic",             "string",   {"size":20,"required":False}),
        ("currency",        "string",   {"size":3,"required":False}),
        ("account_holder",  "string",   {"size":255,"required":False}),
        ("opening_balance", "float",    {"required":False}),
        ("current_balance", "float",    {"required":False}),
        ("is_active",       "boolean",  {"required":False,"default":True}),
        ("treasury_account_id","string",{"size":36,"required":False}),
        ("created_at",      "datetime", {"required":False}),
        ("updated_at",      "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "treasury_accounts": ("Treasury Accounts", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("name",            "string",   {"size":255,"required":True}),
        ("type",            "string",   {"size":50,"required":True}),
        ("parent_id",       "string",   {"size":36,"required":False}),
        ("opening_balance", "float",    {"required":False}),
        ("current_balance", "float",    {"required":False}),
        ("is_active",       "boolean",  {"required":False,"default":True}),
        ("created_at",      "datetime", {"required":False}),
        ("updated_at",      "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "articles": ("Articles", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("code",            "string",   {"size":50,"required":True}),
        ("name",            "string",   {"size":255,"required":True}),
        ("type",            "string",   {"size":10,"required":False}),
        ("tax_group",       "string",   {"size":2,"required":False}),
        ("unit_price",      "float",    {"required":False}),
        ("specific_tax",    "float",    {"required":False}),
        ("is_active",       "boolean",  {"required":False,"default":True}),
        ("created_at",      "datetime", {"required":False}),
        ("stock_quantity",  "float",    {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "transaction_categories": ("Transaction Categories", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("name",            "string",   {"size":255,"required":True}),
        ("type",            "string",   {"size":20,"required":True}),
        ("parent_id",       "string",   {"size":36,"required":False}),
        ("account_code",    "string",   {"size":50,"required":False}),
        ("is_active",       "boolean",  {"required":False,"default":True}),
        ("created_at",      "datetime", {"required":False}),
        ("updated_at",      "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    # ── FACTURES ──
    "invoice_sequences": ("Invoice Sequences", [
        ("company_id",  "string",   {"size":36,"required":True}),
        ("type",        "string",   {"size":10,"required":True}),
        ("year",        "integer",  {"required":True}),
        ("last_number", "integer",  {"required":False}),
        ("created_at",  "datetime", {"required":False}),
        ("updated_at",  "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "invoices": ("Invoices", [
        ("company_id",              "string",   {"size":36,"required":True}),
        ("client_id",               "string",   {"size":36,"required":False}),
        ("supplier_id",             "string",   {"size":36,"required":False}),
        ("type",                    "string",   {"size":2,"required":True}),
        ("reference",               "string",   {"size":100,"required":True}),
        ("invoice_number",          "string",   {"size":100,"required":False}),
        ("status",                  "string",   {"size":20,"required":False}),
        ("price_mode",              "string",   {"size":3,"required":False}),
        ("operator_name",           "string",   {"size":255,"required":False}),
        ("direction",               "string",   {"size":10,"required":False}),
        ("supplier_invoice_number", "string",   {"size":100,"required":False}),
        ("original_invoice_id",     "string",   {"size":36,"required":False}),
        ("proforma_converted_to",   "string",   {"size":36,"required":False}),
        ("description",             "string",   {"size":5000,"required":False}),
        ("total_ht",                "float",    {"required":False}),
        ("total_tva",               "float",    {"required":False}),
        ("total_psvb",              "float",    {"required":False}),
        ("total_ttc",               "float",    {"required":False}),
        ("stamp_duty",              "float",    {"required":False}),
        ("total_payment",           "float",    {"required":False}),
        ("withholding_tax_rate",    "float",    {"required":False}),
        ("withholding_tax_amount",  "float",    {"required":False}),
        ("due_date",                "datetime", {"required":False}),
        ("payment_terms_days",      "integer",  {"required":False}),
        ("payment_status",          "string",   {"size":20,"required":False}),
        ("paid_amount",             "float",    {"required":False}),
        ("fiscal_compliance_status","string",   {"size":20,"required":False}),
        ("fiscal_compliance_notes", "string",   {"size":2000,"required":False}),
        ("ifu_verified",            "boolean",  {"required":False,"default":False}),
        ("ifu_verified_at",         "datetime", {"required":False}),
        ("received_at",             "datetime", {"required":False}),
        ("received_by",             "string",   {"size":255,"required":False}),
        ("ocr_source_url",          "string",   {"size":2000,"required":False}),
        ("scan_url",                "string",   {"size":2000,"required":False}),
        ("fiscal_number",           "string",   {"size":50,"required":False}),
        ("code_secef_dgi",          "string",   {"size":29,"required":False}),
        ("qr_code",                 "string",   {"size":5000,"required":False}),
        ("signature",               "string",   {"size":5000,"required":False}),
        ("nim",                     "string",   {"size":10,"required":False}),
        ("counters",                "string",   {"size":50,"required":False}),
        ("certification_datetime",  "datetime", {"required":False}),
        ("pdf_url",                 "string",   {"size":2000,"required":False}),
        ("certification_source",    "string",   {"size":20,"required":False}),
        ("certification_device_id", "string",   {"size":36,"required":False}),
        ("coupon_ticket_url",       "string",   {"size":2000,"required":False}),
        ("submitted_by",            "string",   {"size":255,"required":False}),
        ("submitted_at",            "datetime", {"required":False}),
        ("approved_by",             "string",   {"size":255,"required":False}),
        ("approved_at",             "datetime", {"required":False}),
        ("rejected_by",             "string",   {"size":255,"required":False}),
        ("rejected_at",             "datetime", {"required":False}),
        ("rejection_reason",        "string",   {"size":2000,"required":False}),
        ("credit_note_nature",      "string",   {"size":3,"required":False}),
        ("validated_at",            "datetime", {"required":False}),
        ("certified_at",            "datetime", {"required":False}),
        ("created_at",              "datetime", {"required":False}),
        ("updated_at",              "datetime", {"required":False}),
    ], [
        ("idx_company_id", ["company_id"]),
        ("idx_client_id",  ["client_id"]),
        ("idx_status",     ["status"]),
        ("idx_created_at", ["created_at"]),
        ("idx_direction",  ["direction"]),
    ]),

    "invoice_items": ("Invoice Items", [
        ("invoice_id",  "string",   {"size":36,"required":True}),
        ("code",        "string",   {"size":50,"required":False}),
        ("name",        "string",   {"size":255,"required":True}),
        ("type",        "string",   {"size":10,"required":True}),
        ("price",       "float",    {"required":True}),
        ("quantity",    "float",    {"required":False}),
        ("unit",        "string",   {"size":50,"required":False}),
        ("tax_group",   "string",   {"size":1,"required":True}),
        ("specific_tax","float",    {"required":False}),
        ("discount",    "float",    {"required":False}),
        ("amount_ht",   "float",    {"required":False}),
        ("amount_tva",  "float",    {"required":False}),
        ("amount_psvb", "float",    {"required":False}),
        ("amount_ttc",  "float",    {"required":False}),
        ("sort_order",  "integer",  {"required":False}),
    ], [("idx_invoice_id",["invoice_id"])]),

    "invoice_payments": ("Invoice Payments", [
        ("invoice_id",          "string",   {"size":36,"required":True}),
        ("company_id",          "string",   {"size":36,"required":True}),
        ("payment_date",        "datetime", {"required":True}),
        ("amount",              "float",    {"required":True}),
        ("payment_method",      "string",   {"size":50,"required":False}),
        ("reference",           "string",   {"size":255,"required":False}),
        ("bank_account_id",     "string",   {"size":36,"required":False}),
        ("bank_transaction_id", "string",   {"size":36,"required":False}),
        ("notes",               "string",   {"size":5000,"required":False}),
        ("created_by",          "string",   {"size":255,"required":False}),
        ("created_at",          "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"]),("idx_invoice_id",["invoice_id"])]),

    "withholding_taxes": ("Withholding Taxes", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("invoice_id",      "string",   {"size":36,"required":False}),
        ("tax_type",        "string",   {"size":50,"required":True}),
        ("rate",            "float",    {"required":True}),
        ("base_amount",     "float",    {"required":True}),
        ("tax_amount",      "float",    {"required":True}),
        ("period_month",    "string",   {"size":7,"required":True}),
        ("status",          "string",   {"size":20,"required":False}),
        ("declared_at",     "datetime", {"required":False}),
        ("paid_at",         "datetime", {"required":False}),
        ("receipt_number",  "string",   {"size":50,"required":False}),
        ("notes",           "string",   {"size":5000,"required":False}),
        ("created_at",      "datetime", {"required":False}),
        ("updated_at",      "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "tax_payments": ("Tax Payments", [
        ("company_id",          "string",   {"size":36,"required":True}),
        ("payment_type",        "string",   {"size":50,"required":False}),
        ("reference",           "string",   {"size":255,"required":False}),
        ("fiscal_period",       "string",   {"size":20,"required":False}),
        ("payment_date",        "datetime", {"required":True}),
        ("amount",              "float",    {"required":True}),
        ("bank_account_id",     "string",   {"size":36,"required":False}),
        ("bank_transaction_id", "string",   {"size":36,"required":False}),
        ("source_type",         "string",   {"size":20,"required":False}),
        ("source_file_url",     "string",   {"size":2000,"required":False}),
        ("dgi_receipt_number",  "string",   {"size":100,"required":False}),
        ("dgi_agent_code",      "string",   {"size":50,"required":False}),
        ("dgi_bureau",          "string",   {"size":255,"required":False}),
        ("notes",               "string",   {"size":5000,"required":False}),
        ("status",              "string",   {"size":20,"required":False}),
        ("validated_by",        "string",   {"size":255,"required":False}),
        ("validated_at",        "datetime", {"required":False}),
        ("created_by",          "string",   {"size":255,"required":False}),
        ("created_at",          "datetime", {"required":False}),
        ("updated_at",          "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "tax_declarations": ("Tax Declarations", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("declaration_type","string",   {"size":50,"required":True}),
        ("period",          "string",   {"size":20,"required":True}),
        ("total_base",      "float",    {"required":False}),
        ("total_tax",       "float",    {"required":False}),
        ("status",          "string",   {"size":20,"required":False}),
        ("submitted_at",    "datetime", {"required":False}),
        ("reference_dgi",   "string",   {"size":100,"required":False}),
        ("pdf_url",         "string",   {"size":500,"required":False}),
        ("notes",           "string",   {"size":5000,"required":False}),
        ("created_at",      "datetime", {"required":False}),
        ("updated_at",      "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "esyntas_field_mappings": ("Esyntas Field Mappings", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("source_format",   "string",   {"size":20,"required":True}),
        ("source_field",    "string",   {"size":100,"required":True}),
        ("target_field",    "string",   {"size":100,"required":True}),
        ("transform_rule",  "string",   {"size":5000,"required":False}),
        ("usage_count",     "integer",  {"required":False}),
        ("created_at",      "datetime", {"required":False}),
        ("updated_at",      "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    # ── IA ──
    "ai_providers": ("AI Providers", [
        ("code",                "string",   {"size":50,"required":True}),
        ("name",                "string",   {"size":255,"required":True}),
        ("base_url",            "string",   {"size":500,"required":True}),
        ("is_active",           "boolean",  {"required":False,"default":True}),
        ("supports_vision",     "boolean",  {"required":False,"default":False}),
        ("supports_tools",      "boolean",  {"required":False,"default":False}),
        ("created_at",          "datetime", {"required":False}),
    ], []),

    "ai_models": ("AI Models", [
        ("provider_id",                 "string",   {"size":36,"required":True}),
        ("code",                        "string",   {"size":100,"required":True}),
        ("name",                        "string",   {"size":255,"required":True}),
        ("input_cost_per_1k_tokens",    "float",    {"required":False}),
        ("output_cost_per_1k_tokens",   "float",    {"required":False}),
        ("context_window",              "integer",  {"required":False}),
        ("is_active",                   "boolean",  {"required":False,"default":True}),
        ("quality_tier",                "string",   {"size":20,"required":False}),
        ("supports_vision",             "boolean",  {"required":False,"default":False}),
        ("supports_json_mode",          "boolean",  {"required":False,"default":False}),
        ("supports_tools",              "boolean",  {"required":False,"default":False}),
        ("created_at",                  "datetime", {"required":False}),
    ], []),

    "ai_tasks": ("AI Tasks", [
        ("code",                        "string",   {"size":50,"required":True}),
        ("name",                        "string",   {"size":150,"required":True}),
        ("description",                 "string",   {"size":5000,"required":False}),
        ("category",                    "string",   {"size":30,"required":False}),
        ("default_quality_tier",        "string",   {"size":20,"required":False}),
        ("default_needs_vision",        "boolean",  {"required":False,"default":False}),
        ("default_needs_tools",         "boolean",  {"required":False,"default":False}),
        ("default_needs_json_mode",     "boolean",  {"required":False,"default":False}),
        ("default_system_prompt",       "string",   {"size":10000,"required":False}),
        ("estimated_input_tokens",      "integer",  {"required":False}),
        ("estimated_output_tokens",     "integer",  {"required":False}),
        ("is_workflow_capable",         "boolean",  {"required":False,"default":False}),
        ("is_active",                   "boolean",  {"required":False,"default":True}),
    ], []),

    "ai_models_default_routing": ("AI Models Default Routing", [
        ("task_code",   "string",   {"size":50,"required":True}),
        ("model_id",    "string",   {"size":36,"required":True}),
        ("priority",    "integer",  {"required":False}),
        ("is_fallback", "boolean",  {"required":False,"default":False}),
    ], []),

    "company_ai_credits": ("Company AI Credits", [
        ("company_id",          "string",   {"size":36,"required":True}),
        ("balance_usd",         "float",    {"required":False}),
        ("total_purchased_usd", "float",    {"required":False}),
        ("total_consumed_usd",  "float",    {"required":False}),
        ("last_purchase_at",    "datetime", {"required":False}),
        ("created_at",          "datetime", {"required":False}),
        ("updated_at",          "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    # ── NOTIFICATIONS ──
    "notifications": ("Notifications", [
        ("company_id",  "string",   {"size":36,"required":True}),
        ("user_id",     "string",   {"size":255,"required":False}),
        ("type",        "string",   {"size":50,"required":True}),
        ("severity",    "string",   {"size":20,"required":False}),
        ("title",       "string",   {"size":255,"required":True}),
        ("body",        "string",   {"size":5000,"required":False}),
        ("link",        "string",   {"size":500,"required":False}),
        ("is_read",     "boolean",  {"required":False,"default":False}),
        ("is_archived", "boolean",  {"required":False,"default":False}),
        ("read_at",     "datetime", {"required":False}),
        ("created_at",  "datetime", {"required":False}),
        ("updated_at",  "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"]),("idx_user_id",["user_id"])]),

    # ── AUDIT ──
    "audit_log": ("Audit Log", [
        ("user_id",     "string",   {"size":255,"required":False}),
        ("timestamp",   "datetime", {"required":False}),
        ("action_type", "string",   {"size":10,"required":True}),
        ("table_name",  "string",   {"size":100,"required":True}),
        ("record_id",   "string",   {"size":255,"required":False}),
        ("ip_address",  "string",   {"size":45,"required":False}),
        ("company_id",  "string",   {"size":36,"required":False}),
        ("created_at",  "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    # ── PERMISSIONS RBAC ──
    "company_role_permissions": ("Company Role Permissions", [
        ("company_id",  "string",   {"size":36,"required":True}),
        ("role",        "string",   {"size":50,"required":True}),
        ("permission",  "string",   {"size":100,"required":True}),
        ("granted",     "boolean",  {"required":False,"default":True}),
        ("expires_at",  "datetime", {"required":False}),
        ("granted_by",  "string",   {"size":255,"required":False}),
        ("created_at",  "datetime", {"required":False}),
        ("updated_at",  "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "company_custom_roles": ("Company Custom Roles", [
        ("company_id",  "string",   {"size":36,"required":True}),
        ("label",       "string",   {"size":100,"required":True}),
        ("description", "string",   {"size":500,"required":False}),
        ("permissions", "string",   {"size":10000,"required":False}),
        ("created_at",  "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"]),("idx_label",["label"])]),

    "user_role_assignments": ("User Role Assignments", [
        ("company_id",  "string",   {"size":36,"required":True}),
        ("user_id",     "string",   {"size":36,"required":True}),
        ("role_id",     "string",   {"size":36,"required":False}),
        ("role_name",   "string",   {"size":100,"required":False}),
        ("permissions", "string",   {"size":10000,"required":False}),
        ("created_at",  "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"]),("idx_user_id",["user_id"])]),

    # ── MOBILE MONEY ──
    "mobile_wallets": ("Mobile Wallets", [
        ("company_id",          "string",   {"size":36,"required":True}),
        ("provider",            "string",   {"size":30,"required":True}),
        ("phone_number",        "string",   {"size":20,"required":True}),
        ("account_name",        "string",   {"size":255,"required":False}),
        ("current_balance",     "float",    {"required":False}),
        ("treasury_account_id", "string",   {"size":36,"required":False}),
        ("is_active",           "boolean",  {"required":False,"default":True}),
        ("created_at",          "datetime", {"required":False}),
        ("updated_at",          "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "bank_transactions": ("Bank Transactions", [
        ("company_id",              "string",   {"size":36,"required":True}),
        ("bank_account_id",         "string",   {"size":36,"required":True}),
        ("external_transaction_id", "string",   {"size":255,"required":False}),
        ("transaction_date",        "datetime", {"required":True}),
        ("value_date",              "datetime", {"required":False}),
        ("label",                   "string",   {"size":5000,"required":True}),
        ("reference",               "string",   {"size":255,"required":False}),
        ("amount",                  "float",    {"required":True}),
        ("currency",                "string",   {"size":3,"required":False}),
        ("direction",               "string",   {"size":10,"required":True}),
        ("reconciliation_status",   "string",   {"size":20,"required":False}),
        ("matched_invoice_id",      "string",   {"size":36,"required":False}),
        ("category_id",             "string",   {"size":36,"required":False}),
        ("created_at",              "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"]),("idx_bank_account_id",["bank_account_id"])]),

    # ── TRÉSORERIE ──
    "payment_wallets": ("Payment Wallets", [
        ("company_id",          "string",   {"size":36,"required":True}),
        ("provider",            "string",   {"size":50,"required":True}),
        ("account_identifier",  "string",   {"size":100,"required":True}),
        ("account_name",        "string",   {"size":255,"required":False}),
        ("currency",            "string",   {"size":3,"required":False}),
        ("is_active",           "boolean",  {"required":False,"default":True}),
        ("created_at",          "datetime", {"required":False}),
        ("updated_at",          "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "payment_evidences": ("Payment Evidences", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("source_type",     "string",   {"size":50,"required":True}),
        ("source_url",      "string",   {"size":2000,"required":False}),
        ("ocr_text",        "string",   {"size":50000,"required":False}),
        ("needs_review",    "boolean",  {"required":False,"default":True}),
        ("reviewed_by",     "string",   {"size":255,"required":False}),
        ("reviewed_at",     "datetime", {"required":False}),
        ("created_at",      "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    "certification_devices": ("Certification Devices", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("name",            "string",   {"size":255,"required":True}),
        ("device_type",     "string",   {"size":50,"required":True}),
        ("serial_number",   "string",   {"size":100,"required":False}),
        ("api_key_hash",    "string",   {"size":500,"required":False}),
        ("is_active",       "boolean",  {"required":False,"default":True}),
        ("last_seen_at",    "datetime", {"required":False}),
        ("created_at",      "datetime", {"required":False}),
        ("updated_at",      "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),

    # ── CHATBOT ──
    "chatbot_conversations": ("Chatbot Conversations", [
        ("company_id",  "string",   {"size":36,"required":True}),
        ("user_id",     "string",   {"size":36,"required":True}),
        ("title",       "string",   {"size":500,"required":False}),
        ("status",      "string",   {"size":20,"required":False}),
        ("created_at",  "datetime", {"required":False}),
        ("updated_at",  "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"]),("idx_user_id",["user_id"])]),

    "chatbot_messages": ("Chatbot Messages", [
        ("conversation_id", "string",   {"size":36,"required":True}),
        ("company_id",      "string",   {"size":36,"required":True}),
        ("role",            "string",   {"size":20,"required":False}),
        ("content",         "string",   {"size":50000,"required":False}),
        ("created_at",      "datetime", {"required":False}),
    ], [("idx_conversation_id",["conversation_id"]),("idx_company_id",["company_id"])]),

    "ai_usage_logs": ("AI Usage Logs", [
        ("company_id",      "string",   {"size":36,"required":True}),
        ("task_code",       "string",   {"size":50,"required":False}),
        ("model_code",      "string",   {"size":100,"required":False}),
        ("input_tokens",    "integer",  {"required":False}),
        ("output_tokens",   "integer",  {"required":False}),
        ("cost_usd",        "float",    {"required":False}),
        ("latency_ms",      "integer",  {"required":False}),
        ("status",          "string",   {"size":20,"required":False}),
        ("error_message",   "string",   {"size":2000,"required":False}),
        ("created_at",      "datetime", {"required":False}),
    ], [("idx_company_id",["company_id"])]),
}

# ─────────────────────────────────────────────
# EXÉCUTION
# ─────────────────────────────────────────────
print("=" * 60)
print("  SYNC APPWRITE ← SQL (source de vérité)")
print("=" * 60)

print("\n[1/3] Chargement des collections existantes...")
existing = get_existing_collections()
print(f"  {len(existing)} collections en DB")

print("\n[2/3] Création/mise à jour des collections...")
for col_id, (col_name, attrs_def, idx_def) in SCHEMA.items():
    if col_id not in existing:
        print(f"\n  + Création: {col_id}")
        create_col(col_id, col_name)
        time.sleep(1)
        existing_attrs = set()
    else:
        existing_attrs = get_collection_detail(col_id)
        # Appliquer permissions
        if 'read("users")' not in existing.get(col_id, {}).get("perms", []):
            set_perms(col_id, col_name)

    # Ajouter les attributs manquants
    missing_attrs = [(k, t, kw) for k, t, kw in attrs_def if k not in existing_attrs]
    if missing_attrs:
        print(f"  ← {col_id}: {len(missing_attrs)} attrs à ajouter")
        for key, typ, kw in missing_attrs:
            add_attr(col_id, typ, key, **kw)
        if len(missing_attrs) > 3:
            time.sleep(2)

print("\n[3/3] Création des indexes manquants...")
time.sleep(3)  # laisser Appwrite processer les attrs
for col_id, (col_name, attrs_def, idx_def) in SCHEMA.items():
    for idx_key, idx_attrs in idx_def:
        add_idx(col_id, idx_key, idx_attrs)

print("\n✅ Synchronisation terminée")
print("   Recharge https://www.wimrux.app pour tester")
