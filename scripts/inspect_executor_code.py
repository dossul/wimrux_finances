import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Chercher le timeout dans le code de l'executor
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor grep -r 'timeout' /usr/local/app/ --include='*.php' | head -20"
)
print("Timeout references in executor code:")
print(stdout.read().decode())

# Chercher les références à curl
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor grep -r 'curl' /usr/local/app/ --include='*.php' | head -10"
)
print("\nCurl references:")
print(stdout.read().decode())

# Chercher les constantes de timeout
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor grep -r 'TIMEOUT\|timeout' /usr/local/app/ --include='*.php' | head -20"
)
print("\nTimeout constants:")
print(stdout.read().decode())

client.close()
