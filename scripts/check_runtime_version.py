import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier le runtime de la fonction
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, runtime, entrypoint FROM _1_functions WHERE id=\"send-otp-whatsapp\"'"
)
print("Function runtime:")
print(stdout.read().decode())

# Vérifier l'executor et les images disponibles
stdin, stdout, stderr = client.exec_command(
    "docker images | grep openruntimes"
)
print("\nRuntime images:")
print(stdout.read().decode())

# Vérifier si la fonction utilise le bon entrypoint
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor env | grep -i 'runtime\|entrypoint' | head -10"
)
print("\nExecutor env:")
print(stdout.read().decode())

# Vérifier les logs de l'executor pour cette exécution spécifique
stdin, stdout, stderr = client.exec_command(
    "docker logs appwrite-executor --tail 100 2>&1 | grep -i 'send-otp\|whatsapp\|otp\|error\|fail' | head -20"
)
print("\nExecutor logs:")
print(stdout.read().decode())

client.close()
