import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

endpoint = "https://appwrite.benga.live/v1"

# Tester le temps de réponse de l'API Appwrite
stdin, stdout, stderr = client.exec_command(
    f"time curl -s -w '%{{http_code}}' -X POST {endpoint}/databases/wimrux_finances/collections/otp_codes/documents "
    f"-H 'Content-Type: application/json' "
    f"-H 'X-Appwrite-Project: 6a29285200015cd421c7' "
    f"-d '{{\"documentId\":\"unique()\",\"data\":{{\"user_id\":\"test\",\"phone\":\"test\",\"code\":\"123456\",\"purpose\":\"test\",\"used\":false,\"expires_at\":\"2026-06-13T20:00:00Z\"}}}}' "
    f"2>&1 | tail -5"
)
print("API call without key:")
print(stdout.read().decode())

# Tester avec la clé API
stdin, stdout, stderr = client.exec_command(
    f"time curl -s -w '%{{http_code}}' -X POST {endpoint}/databases/wimrux_finances/collections/otp_codes/documents "
    f"-H 'Content-Type: application/json' "
    f"-H 'X-Appwrite-Project: 6a29285200015cd421c7' "
    f"-H 'X-Appwrite-Key: cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57' "
    f"-d '{{\"documentId\":\"unique()\",\"data\":{{\"user_id\":\"test\",\"phone\":\"test\",\"code\":\"123456\",\"purpose\":\"test\",\"used\":false,\"expires_at\":\"2026-06-13T20:00:00Z\"}}}}' "
    f"2>&1 | tail -5"
)
print("\nAPI call with key:")
print(stdout.read().decode())

client.close()
