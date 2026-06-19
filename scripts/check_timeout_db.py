import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier le timeout de la fonction
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT id, name, timeout FROM _1_functions WHERE id=\"send-otp-whatsapp\"'"
)
print("Function timeout:")
print(stdout.read().decode())

# Vérifier les variables globales
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW VARIABLES LIKE \"%timeout%\"' | head -10"
)
print("\nDB timeouts:")
print(stdout.read().decode())

client.close()
