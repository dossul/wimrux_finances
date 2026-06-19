import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

func_dir = '/var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7'
build_dir = '/var/lib/docker/volumes/appwrite-main_appwrite-builds/_data/app-6a29285200015cd421c7'

# Copier le fichier local sur le serveur
local_file = 'c:/wamp64/www/wimrux_finances/edge_functions/send-otp-whatsapp/index.js'
sftp = client.open_sftp()
sftp.put(local_file, f"{func_dir}/index.js")
sftp.close()
print("Uploaded index.js")

# Créer un tar.gz correct (inclure .open-runtimes avec structure ./)
stdin, stdout, stderr = client.exec_command(
    f"cd {func_dir} && tar -czf /tmp/build_fixed.tar.gz ./index.js ./.open-runtimes && echo 'tar created'"
)
print("Create tar:", stdout.read().decode())

# Vérifier le contenu du tar
stdin, stdout, stderr = client.exec_command(
    "tar -tzf /tmp/build_fixed.tar.gz"
)
print("Tar contents:", stdout.read().decode())

# Remplacer tous les builds .gz
stdin, stdout, stderr = client.exec_command(
    f"for f in {func_dir}/*.gz; do cp /tmp/build_fixed.tar.gz \"$f\" && echo \"Replaced $f\"; done"
)
print("\nFunctions builds:")
print(stdout.read().decode())

# Remplacer tous les builds dans le volume builds
stdin, stdout, stderr = client.exec_command(
    f"for f in {build_dir}/*.gz; do cp /tmp/build_fixed.tar.gz \"$f\" && echo \"Replaced build $f\"; done"
)
print("\nBuilds dir:")
print(stdout.read().decode())

# Clear Redis cache
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-redis redis-cli EVAL \"return redis.call('del', unpack(redis.call('keys', 'default-cache-_1::deployments:6a2d517f40634331deb1:*')))\" 0 2>/dev/null || true"
)
print("\nClear cache:", stdout.read().decode())

# Restart executor
stdin, stdout, stderr = client.exec_command("docker restart appwrite-executor")
print("\nRestart:", stdout.read().decode())

client.close()
