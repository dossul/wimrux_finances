import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Tester l'accès Internet depuis le runtime (executor_runtimes)
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network executor_runtimes openruntimes/node:v3-18.0 sh -c 'wget -qO- https://httpbin.org/ip 2>&1 || echo failed'"
)
print("Internet depuis executor_runtimes:")
print(stdout.read().decode())

# Tester l'accès à appwrite.benga.live depuis le runtime
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network executor_runtimes openruntimes/node:v3-18.0 sh -c 'wget -qO- https://appwrite.benga.live/v1/health 2>&1 || echo failed'"
)
print("\nAppwrite externe depuis executor_runtimes:")
print(stdout.read().decode())

# Vérifier les conteneurs connectés à executor_runtimes
stdin, stdout, stderr = client.exec_command(
    "docker network inspect executor_runtimes --format '{{json .Containers}}' | python3 -m json.tool 2>/dev/null | grep Name"
)
print("\nConteneurs sur executor_runtimes:")
print(stdout.read().decode())

client.close()
