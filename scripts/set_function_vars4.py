import paramiko
import time

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

project_id = "6a29285200015cd421c7"
api_key = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"

vars_to_set = [
    ("APPWRITE_PROJECT", project_id),
    ("APPWRITE_API_KEY", api_key),
    ("WHAPI_TOKEN", "7oUdVCMwhatfvWgRZJBner9bKvCfPq9t"),
    ("APPWRITE_ENDPOINT", "https://appwrite.benga.live/v1"),
    ("APPWRITE_DATABASE", "wimrux_finances"),
]

for key, value in vars_to_set:
    uid = f"var_{key.lower().replace('_','')}_{project_id[:8]}"
    now = int(time.time())
    
    # Utiliser un fichier SQL pour chaque variable
    sql = f"""INSERT INTO _1_variables (_uid, _createdAt, _updatedAt, resourceType, resourceId, key, value, search)
VALUES ("{uid}", FROM_UNIXTIME({now}), FROM_UNIXTIME({now}), "functions", "send-otp-whatsapp", "{key}", "{value}", "{key} {value}")
ON DUPLICATE KEY UPDATE value="{value}", _updatedAt=FROM_UNIXTIME({now});"""
    
    # Écrire dans un fichier temporaire
    stdin, stdout, stderr = client.exec_command(f"cat > /tmp/var_{key}.sql << 'EOF'")
    stdin.write(sql)
    stdin.close()
    
    # Exécuter
    stdin, stdout, stderr = client.exec_command(
        f"docker exec -i appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite < /tmp/var_{key}.sql"
    )
    print(f"Set {key}:")
    print(stdout.read().decode())
    print(stderr.read().decode()[:200])

# Vérifier les variables
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT key, value FROM _1_variables WHERE resourceId=send-otp-whatsapp'"
)
print(f"\nVariables après mise à jour:\n{stdout.read().decode()}")

# Restart executor
stdin, stdout, stderr = client.exec_command("docker restart appwrite-executor")
print(f"\nRestart executor: {stdout.read().decode()}")

client.close()
