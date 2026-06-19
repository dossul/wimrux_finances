import paramiko
import secrets
import string

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Générer une clé API aléatoire
api_key = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
print(f"Generated API key: {api_key}")

# Créer la clé dans la DB Appwrite (table _1_keys)
# Structure: _uid, _createdAt, _updatedAt, _permissions, name, secret, expire, scopes, userId, projectId

# D'abord vérifier la structure de la table
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'DESCRIBE _1_keys'"
)
print("\nStructure _1_keys:")
print(stdout.read().decode())

# Créer la clé
project_id = "6a29285200015cd421c7"
import time
created_at = int(time.time())

stdin, stdout, stderr = client.exec_command(
    f"docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e "
    f"'INSERT INTO _1_keys (_uid, _createdAt, _updatedAt, name, secret, expire, scopes, userId, projectId) VALUES (\"{api_key[:16]}\", {created_at}, {created_at}, \"Server Functions\", \"{api_key}\", \"\", \"[\\\"databases.documents\\\"]\", \"\", \"{project_id}\")'"
)
print("\nInsert key:")
print(stdout.read().decode())
print(stderr.read().decode())

# Vérifier que la clé a été créée
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, scopes FROM _1_keys WHERE name=\"Server Functions\"'"
)
print("\nVerify key:")
print(stdout.read().decode())

client.close()
