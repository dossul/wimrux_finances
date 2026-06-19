import paramiko

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

# Créer le profil admin-wimrux avec tous les champs requis
stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST {endpoint}/databases/{db}/collections/user_profiles/documents "
    f"-H 'Content-Type: application/json' "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-H 'X-Appwrite-Key: {key}' "
    f"-d '{{\"documentId\":\"admin-wimrux\",\"data\":{{\"user_id\":\"admin-wimrux\",\"company_id\":\"admin-company\",\"role\":\"admin\",\"full_name\":\"Admin Wimrux\",\"phone\":\"+22665599195\"}}}}'"
)
result = stdout.read().decode()
print("Create profile result:")
print(result)

client.close()
