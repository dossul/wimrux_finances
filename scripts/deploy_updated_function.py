import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Lire le fichier index.js local
with open('c:/wamp64/www/wimrux_finances/edge_functions/send-otp-whatsapp/index.js', 'r', encoding='utf-8') as f:
    func_code = f.read()

# Upload to server
sftp = client.open_sftp()
with sftp.file('/tmp/index.js', 'w') as f:
    f.write(func_code)
sftp.close()

# Remplacer tous les fichiers .gz WHAPI et l'index.js
mountpoint = '/var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7'

# 1. Remplacer index.js
stdin, stdout, stderr = client.exec_command(
    f"cp /tmp/index.js {mountpoint}/index.js && echo 'index.js replaced'"
)
print(f"Index: {stdout.read().decode()}")

# 2. Remplacer tous les builds .gz
stdin, stdout, stderr = client.exec_command(
    f"for f in {mountpoint}/*.gz; do if zcat \"$f\" | grep -q WHAPI; then gzip -c {mountpoint}/index.js > \"$f\" && echo \"Replaced $f\"; fi; done"
)
print(f"Builds:\n{stdout.read().decode()}")

# 3. Remplacer tous les builds dans le volume builds
stdin, stdout, stderr = client.exec_command(
    f"for f in /var/lib/docker/volumes/appwrite-main_appwrite-builds/_data/app-6a29285200015cd421c7/*.gz; do if zcat \"$f\" | grep -q WHAPI; then gzip -c {mountpoint}/index.js > \"$f\" && echo \"Replaced build $f\"; fi; done"
)
print(f"Builds dir:\n{stdout.read().decode()}")

# 4. Clear Redis cache
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-redis redis-cli EVAL \"return redis.call('del', unpack(redis.call('keys', 'default-cache-_1::deployments:6a2d517f40634331deb1:*')))\" 0 2>/dev/null || true"
)
print(f"Clear cache: {stdout.read().decode()}")

# 5. Restart executor
stdin, stdout, stderr = client.exec_command("docker restart appwrite-executor")
print(f"Restart: {stdout.read().decode()}")

# 6. Verify
stdin, stdout, stderr = client.exec_command(
    f"zcat {mountpoint}/6a2d517f40634331deb1.gz | grep 'APPWRITE_PROJECT'"
)
print(f"Verify: {stdout.read().decode()}")

client.close()
