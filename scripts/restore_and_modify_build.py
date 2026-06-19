import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

func_dir = '/var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7'
build_dir = '/var/lib/docker/volumes/appwrite-main_appwrite-builds/_data/app-6a29285200015cd421c7'
backup = f"{build_dir}/6a2b1487e5f00.gz.bak_build"

# Extraire le backup dans /tmp/build_src
stdin, stdout, stderr = client.exec_command(
    "mkdir -p /tmp/build_src && cd /tmp/build_src && tar -xzf {} && ls -la".format(backup)
)
print("Extract backup:")
print(stdout.read().decode())

# Vérifier le contenu de .open-runtimes
stdin, stdout, stderr = client.exec_command(
    "cat /tmp/build_src/.open-runtimes"
)
print("\n.open-runtimes content:")
print(stdout.read().decode())

# Vérifier le contenu de index.js dans le backup
stdin, stdout, stderr = client.exec_command(
    "cat /tmp/build_src/index.js | head -20"
)
print("\nBackup index.js:")
print(stdout.read().decode())

# Copier notre nouveau index.js
local_file = 'c:/wamp64/www/wimrux_finances/edge_functions/send-otp-whatsapp/index.js'
sftp = client.open_sftp()
sftp.put(local_file, '/tmp/build_src/index.js')
sftp.close()
print("\nUploaded new index.js")

# Recréer le tar.gz avec la bonne structure
stdin, stdout, stderr = client.exec_command(
    "cd /tmp/build_src && tar -czf /tmp/build_fixed.tar.gz ./.open-runtimes ./index.js && echo 'created'"
)
print("Create tar:", stdout.read().decode())

# Vérifier
stdin, stdout, stderr = client.exec_command(
    "tar -tzf /tmp/build_fixed.tar.gz"
)
print("\nTar contents:")
print(stdout.read().decode())

# Remplacer tous les builds
stdin, stdout, stderr = client.exec_command(
    f"for f in {func_dir}/*.gz; do cp /tmp/build_fixed.tar.gz \"$f\" && echo \"Replaced $f\"; done"
)
print("\nFunctions builds:")
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command(
    f"for f in {build_dir}/*.gz; do cp /tmp/build_fixed.tar.gz \"$f\" && echo \"Replaced build $f\"; done"
)
print("\nBuilds dir:")
print(stdout.read().decode())

# Clear cache
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-redis redis-cli EVAL \"return redis.call('del', unpack(redis.call('keys', 'default-cache-_1::deployments:6a2d517f40634331deb1:*')))\" 0 2>/dev/null || true"
)
print("\nClear cache:", stdout.read().decode())

client.close()
