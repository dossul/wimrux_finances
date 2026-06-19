import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier les variables de la fonction dans Appwrite DB
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, value FROM _1_variables WHERE functionId=\"send-otp-whatsapp\"'"
)
print("Variables fonction:")
print(stdout.read().decode())

# Vérifier toutes les variables
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT functionId, name, value FROM _1_variables LIMIT 50'"
)
print("\nToutes variables (50):")
print(stdout.read().decode())

# Vérifier la structure de _1_variables
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'DESCRIBE _1_variables'"
)
print("\nStructure _1_variables:")
print(stdout.read().decode())

client.close()
