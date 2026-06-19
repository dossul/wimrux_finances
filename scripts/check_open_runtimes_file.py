import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

func_dir = '/var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7'

# Vérifier si le fichier .open-runtimes existe
stdin, stdout, stderr = client.exec_command(
    f"ls -la {func_dir}/.open-runtimes 2>&1 || echo 'NOT FOUND'"
)
print(".open-runtimes in volume:")
print(stdout.read().decode())

# Vérifier dans le conteneur runtime (si on peut le capturer)
stdin, stdout, stderr = client.exec_command(
    "docker ps -a --filter 'ancestor=openruntimes/node:v3-18.0' --format '{{.Names}}' | head -1"
)
runtime_name = stdout.read().decode().strip()
print(f"\nRuntime: {runtime_name}")

if runtime_name:
    stdin, stdout, stderr = client.exec_command(
        f"docker exec {runtime_name} ls -la /usr/local/server/src/function/ 2>&1 || echo 'cannot exec'"
    )
    print(f"\nFiles in runtime function dir:\n{stdout.read().decode()}")

# Vérifier les permissions du volume
stdin, stdout, stderr = client.exec_command(
    f"ls -la {func_dir} | head -5"
)
print(f"\nVolume permissions:\n{stdout.read().decode()}")

client.close()
