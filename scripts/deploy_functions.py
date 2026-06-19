#!/usr/bin/env python3
"""Deploy edge functions to Appwrite"""
import json, ssl, urllib.request, os, tarfile, io, time

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"

ctx = ssl._create_unverified_context()
HEADERS = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY
}

def call(method, path, body=None, binary=None):
    url = ENDPOINT + path
    req_headers = dict(HEADERS)
    if binary:
        req_headers["Content-Type"] = "multipart/form-data; boundary=----formdata"
        data = binary
    else:
        data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=120)
        b = resp.read()
        return json.loads(b) if b else {}, None
    except urllib.error.HTTPError as e:
        b = e.read()
        try:
            return None, json.loads(b)
        except:
            return None, {"code": e.code, "message": str(e)}
    except Exception as e:
        return None, {"code": 0, "message": str(e)}

# List existing functions
print("Listing existing functions...")
data, err = call("GET", "/functions?limit=100")
existing = {f["$id"]: f for f in data.get("functions", [])}
print(f"Found {len(existing)} existing functions")

# Functions to create/deploy (24 target functions from README)
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
  log("Function called: " + req.headers["x-appwrite-function-id"] || "unknown");
  return res.json({ success: true, message: "Stub function - not yet implemented" });
};
'''

for func_id, func_name in TARGET_FUNCTIONS:
    if func_id in existing:
        print(f"  SKIP (exists): {func_id}")
        continue

    print(f"  CREATE: {func_id}")
    # Create function
    body = {
        "functionId": func_id,
        "name": func_name,
        "runtime": "node-18.0",
        "execute": ["any"],
        "events": [],
        "schedule": "",
        "timeout": 60,
        "enabled": True,
    }
    data, err = call("POST", "/functions", body)
    if err:
        print(f"    ERROR create: {err}")
        continue
    func_info = data
    print(f"    Created")

    # Create stub deployment
    # Write stub to temp dir and tar.gz it
    import tempfile, shutil
    tmpdir = tempfile.mkdtemp()
    try:
        with open(os.path.join(tmpdir, "index.js"), "w") as f:
            f.write(STUB_CODE)
        tar_path = os.path.join(tmpdir, "code.tar.gz")
        with tarfile.open(tar_path, "w:gz") as tar:
            tar.add(os.path.join(tmpdir, "index.js"), arcname="index.js")

        with open(tar_path, "rb") as f:
            tar_bytes = f.read()

        # Build multipart body
        boundary = "----formdata"
        lines = []
        lines.append(f"--{boundary}".encode())
        lines.append(b'Content-Disposition: form-data; name="code"; filename="code.tar.gz"')
        lines.append(b"Content-Type: application/gzip")
        lines.append(b"")
        lines.append(tar_bytes)
        lines.append(f"--{boundary}--".encode())
        multipart_body = b"\r\n".join(lines)

        # Create deployment
        dep_url = f"/functions/{func_id}/deployments"
        req_headers = {
            "X-Appwrite-Project": PROJECT,
            "X-Appwrite-Key": API_KEY,
            "Content-Type": f"multipart/form-data; boundary={boundary}"
        }
        req = urllib.request.Request(ENDPOINT + dep_url, data=multipart_body, headers=req_headers, method="POST")
        try:
            resp = urllib.request.urlopen(req, context=ctx, timeout=120)
            dep_data = json.loads(resp.read())
            dep_id = dep_data["$id"]
            print(f"    Deployment created: {dep_id}")

            # Activate deployment
            act_data, act_err = call("PATCH", f"/functions/{func_id}/deployments/{dep_id}", {"enabled": True})
            if act_err:
                print(f"    ERROR activate: {act_err}")
            else:
                print(f"    Activated")
        except Exception as e:
            print(f"    ERROR deployment: {e}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    time.sleep(1)

print("\nDone.")
