import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier les variables d'env de l'executor
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor env | sort"
)
print("Executor env:")
print(stdout.read().decode())

# Vérifier le docker-compose
stdin, stdout, stderr = client.exec_command(
    "cat /opt/stacks/appwrite-main/docker-compose.yml | grep -A30 'appwrite-executor:'"
)
print("\nDocker-compose executor:")
print(stdout.read().decode())

# Vérifier si l'executor a accès au socket Docker
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor ls -la /var/run/docker.sock"
)
print("\nDocker socket:")
print(stdout.read().decode())

client.close()
