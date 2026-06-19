#!/usr/bin/env python3
"""Deploy stub code to Appwrite functions that have no deployment"""
import json, ssl, urllib.request, os, subprocess, tempfile, shutil

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
APPWRITE_CLI = r"C:\nvm4w\nodejs\appwrite.cmd"

ctx = ssl._create_unverified_context()
headers = {
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY
}

# List all functions
all_funcs = []
last_id = None
for i in range(5):
    url = ENDPOINT + "/functions?limit=25"
    if last_id:
        url += f"&cursorAfter={last_id}"
    req = urllib.request.Request(url, headers=headers)
    resp = json.loads(urllib.request.urlopen(req, context=ctx).read())
    funcs = resp.get("functions", [])
    if not funcs:
        break
    for f in funcs:
        all_funcs.append(f)
    last_id = funcs[-1]["$id"]
    if len(funcs) < 25:
        break

print(f"Total functions: {len(all_funcs)}")

STUB_CODE = '''module.exports = async function (context) {
  const { req, res, log, error } = context;
  log("Function called: " + (req.headers["x-appwrite-function-id"] || "unknown"));
  return res.json({ success: true, message: "Stub function - not yet implemented" });
};
'''

base_dir = "c:/wamp64/www/wimrux_finances/scripts/_fn_stubs"
os.makedirs(base_dir, exist_ok=True)

for func in all_funcs:
    func_id = func["$id"]
    has_deployment = bool(func.get("deployment"))
    if has_deployment:
        print(f"SKIP (has deployment): {func_id}")
        continue

    print(f"DEPLOY stub: {func_id}")
    fn_dir = os.path.join(base_dir, func_id)
    os.makedirs(fn_dir, exist_ok=True)
    with open(os.path.join(fn_dir, "index.js"), "w") as f:
        f.write(STUB_CODE)

    cmd = [
        APPWRITE_CLI, "functions", "create-deployment",
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
            err = result.stderr or result.stdout
            print(f"  ERROR: {err[:300]}")
    except Exception as e:
        print(f"  EXCEPTION: {e}")

print("\nDone.")
