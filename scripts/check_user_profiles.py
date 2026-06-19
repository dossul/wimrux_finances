import paramiko
import json

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

endpoint = "https://appwrite.benga.live/v1"
project = "6a29285200015cd421c7"
key = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
db = "wimrux_finances"

# Lister les collections
stdin, stdout, stderr = client.exec_command(
    f"curl -s {endpoint}/databases/{db}/collections "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-H 'X-Appwrite-Key: {key}'"
)
result = stdout.read().decode()
try:
    collections = json.loads(result)
    print("Collections:")
    for col in collections.get('collections', []):
        print(f"  - {col.get('id')} ({col.get('name')})")
except:
    print("Error:", result[:200])

# Vérifier si user_profiles existe
stdin, stdout, stderr = client.exec_command(
    f"curl -s {endpoint}/databases/{db}/collections/user_profiles "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-H 'X-Appwrite-Key: {key}'"
)
result = stdout.read().decode()
print(f"\nuser_profiles collection:\n{result[:500]}")

# Vérifier si le document admin-wimrux existe
stdin, stdout, stderr = client.exec_command(
    f"curl -s {endpoint}/databases/{db}/collections/user_profiles/documents/admin-wimrux "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-H 'X-Appwrite-Key: {key}'"
)
result = stdout.read().decode()
print(f"\nadmin-wimrux profile:\n{result[:500]}")

client.close()
