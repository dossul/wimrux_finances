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
api_key = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"

headers = f"-H 'X-Appwrite-Project: {project}' -H 'X-Appwrite-Key: {api_key}' -H 'Content-Type: application/json'"

# 1. Créer la collection otp_codes
stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST {endpoint}/databases/wimrux_finances/collections "
    f"{headers} "
    f"-d '{{\"collectionId\":\"otp_codes\",\"name\":\"OTP Codes\"}}'"
)
result = stdout.read().decode()
print(f"Create collection result:\n{result}")

# 2. Créer les attributs
attrs = [
    ('user_id', 'string', 255, True),
    ('phone', 'string', 50, True),
    ('code', 'string', 10, True),
    ('purpose', 'string', 50, True),
    ('used', 'boolean', None, True),
    ('expires_at', 'string', 255, True),
]

for key, typ, size, req in attrs:
    if typ == 'boolean':
        attr_url = f"{endpoint}/databases/wimrux_finances/collections/otp_codes/attributes/boolean"
        payload = f'{{"key":"{key}","required":true,"default":false}}'
    else:
        attr_url = f"{endpoint}/databases/wimrux_finances/collections/otp_codes/attributes/string"
        payload = f'{{"key":"{key}","size":{size},"required":true}}'
    
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -X POST {attr_url} {headers} -d '{payload}'"
    )
    print(f"\nCreate attribute {key}:\n{stdout.read().decode()}")

client.close()
