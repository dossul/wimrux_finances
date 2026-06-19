import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier les logs détaillés de l'executor
stdin, stdout, stderr = client.exec_command(
    "docker logs appwrite-executor --tail 200 2>&1 | tail -100"
)
print("Executor logs (last 200):")
print(stdout.read().decode())

# Vérifier si des conteneurs runtime sont créés
stdin, stdout, stderr = client.exec_command(
    "docker ps -a --format '{{.Names}} {{.Image}} {{.Status}} {{.Networks}}' | grep -i runtime | head -20"
)
print("\nRuntime containers:")
print(stdout.read().decode())

# Vérifier le réseau executor_runtimes
stdin, stdout, stderr = client.exec_command(
    "docker network inspect executor_runtimes"
)
print("\nNetwork inspect:")
print(stdout.read().decode())

client.close()
