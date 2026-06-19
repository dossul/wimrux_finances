#!/usr/bin/env python3
"""Deploy edge functions to Appwrite using CLI"""
import json, ssl, urllib.request, os, subprocess, tempfile, shutil

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"

# List existing functions
ctx = ssl._create_unverified_context()
headers = {
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY
}
req = urllib.request.Request(ENDPOINT + "/functions?limit=100", headers=headers)
resp = json.loads(urllib.request.urlopen(req, context=ctx).read())
existing = {f["$id"]: f for f in resp.get("functions", [])}
print(f"Found {len(existing)} existing functions")

TARGET_FUNCTIONS = [
    ("export-report", "Export Report"),
    ("verify-tax-id", "Verify Tax ID"),
    ("cashflow-forecast", "Cashflow Forecast"),
    ("detect-anomalies", "Detect Anomalies"),
    ("ingest-payment", "Ingest Payment"),
    ("ingest-image-payment", "Ingest Image Payment"),
    ("ingest-statement-file", "Ingest Statement File"),
    ("ingest-text-payment", "Ingest Text Payment"),
    ("ingest-sms", "Ingest SMS"),
    ("nl-to-sql", "NL to SQL"),
    ("generate-device-key", "Generate Device Key"),
    ("device-heartbeat", "Device Heartbeat"),
    ("push-certified-invoice", "Push Certified Invoice"),
    ("pull-pending-invoices", "Pull Pending Invoices"),
    ("parse-certified-invoice", "Parse Certified Invoice"),
    ("pdf-to-images", "PDF to Images"),
    ("mcf-simulator", "MCF Simulator"),
    ("fnec-simulator", "FNEC Simulator"),
    ("chatbot-gateway", "Chatbot Gateway"),
    ("crypto-aes256", "Crypto AES256"),
    ("delete-user", "Delete User"),
]

STUB_CODE = '''module.exports = async function (context) {
  const { req, res, log, error } = context;
  log("Function called: " + (req.headers["x-appwrite-function-id"] || "unknown"));
  return res.json({ success: true, message: "Stub function - not yet implemented" });
};
'''

base_dir = "c:/wamp64/www/wimrux_finances/scripts/_fn_deploy"
os.makedirs(base_dir, exist_ok=True)

for func_id, func_name in TARGET_FUNCTIONS:
    if func_id in existing:
        print(f"SKIP (exists): {func_id}")
        continue

    print(f"DEPLOY: {func_id}")

    # Create temp directory with stub
    fn_dir = os.path.join(base_dir, func_id)
    os.makedirs(fn_dir, exist_ok=True)
    with open(os.path.join(fn_dir, "index.js"), "w") as f:
        f.write(STUB_CODE)

    # Deploy via CLI
    cmd = [
        "appwrite", "functions", "create-deployment",
        "--function-id", func_id,
        "--code", fn_dir,
        "--activate", "true",
        "--entrypoint", "index.js"
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            print(f"  OK")
        else:
            print(f"  ERROR: {result.stderr[:200]}")
    except Exception as e:
        print(f"  EXCEPTION: {e}")

print("\nDone.")
