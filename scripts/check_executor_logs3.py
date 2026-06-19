import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier les logs de l'executor
stdin, stdout, stderr = client.exec_command(
    "docker logs appwrite-executor --tail 100 2>&1 | tail -50"
)
print("Executor logs:")
print(stdout.read().decode())

# Vérifier l'env de l'executor
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor env | grep OPR"
)
print("\nExecutor env:")
print(stdout.read().decode())

client.close()
