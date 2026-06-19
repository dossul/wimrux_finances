import urllib.request, json, ssl

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT  = "6a29285200015cd421c7"
API_KEY  = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID    = "wimrux_finances"

ctx = ssl._create_unverified_context()
HEADERS = {"X-Appwrite-Project": PROJECT, "X-Appwrite-Key": API_KEY}

for col in ["companies", "user_profiles"]:
    req = urllib.request.Request(f"{ENDPOINT}/databases/{DB_ID}/collections/{col}", headers=HEADERS)
    resp = urllib.request.urlopen(req, context=ctx, timeout=10)
    data = json.loads(resp.read())
    attrs = data.get("attributes", [])
    print(f"=== {col} ({len(attrs)} attrs) ===")
    for a in attrs:
        key = a["key"]
        typ = a["type"]
        req_flag = a.get("required", False)
        print(f"  {key} ({typ}) req={req_flag}")
    print()
