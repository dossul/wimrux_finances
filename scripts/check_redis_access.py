import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier l'IP de Redis
stdin, stdout, stderr = client.exec_command(
    "docker inspect appwrite-redis --format '{{.NetworkSettings.Networks.appwrite-main_default.IPAddress}}'"
)
redis_ip = stdout.read().decode().strip()
print(f"Redis IP: {redis_ip}")

# Tester l'accès à Redis depuis executor_runtimes
stdin, stdout, stderr = client.exec_command(
    f"docker run --rm --network executor_runtimes openruntimes/node:v3-18.0 sh -c 'wget -qO- http://{redis_ip}:6379 2>&1 || echo failed'"
)
print(f"\nAccès Redis depuis executor_runtimes:")
print(stdout.read().decode())

# Tester depuis default network
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network appwrite-main_default openruntimes/node:v3-18.0 sh -c 'wget -qO- http://appwrite-redis:6379 2>&1 || echo failed'"
)
print(f"\nAccès Redis depuis default network:")
print(stdout.read().decode())

# Connecter executor_runtimes à appwrite-redis
stdin, stdout, stderr = client.exec_command(
    "docker network connect executor_runtimes appwrite-redis 2>&1 || true"
)
print(f"\nConnect Redis to executor_runtimes:")
print(stdout.read().decode())

# Tester à nouveau
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network executor_runtimes openruntimes/node:v3-18.0 sh -c 'wget -qO- http://appwrite-redis:6379 2>&1 || echo failed'"
)
print(f"\nAccès Redis après connection:")
print(stdout.read().decode())

client.close()
