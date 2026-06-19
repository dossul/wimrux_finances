import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier les volumes montés dans l'executor
stdin, stdout, stderr = client.exec_command(
    "docker inspect appwrite-executor --format '{{json .Mounts}}' | python3 -m json.tool 2>/dev/null | grep -E 'Source|Destination'"
)
print("Executor mounts:")
print(stdout.read().decode())

# Vérifier les vrais noms des volumes
stdin, stdout, stderr = client.exec_command(
    "docker volume ls | grep -E 'builds|functions'"
)
print("\nVolumes:")
print(stdout.read().decode())

# Vérifier si l'executor voit les fichiers
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor ls -la /storage/functions/app-6a29285200015cd421c7/ | head -5"
)
print("\nFunctions in executor:")
print(stdout.read().decode())

# Vérifier les builds
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor ls -la /storage/builds/app-6a29285200015cd421c7/ | head -5"
)
print("\nBuilds in executor:")
print(stdout.read().decode())

client.close()
