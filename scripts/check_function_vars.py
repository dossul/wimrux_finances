import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# 1. Vérifier les variables de la fonction
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, functionId, name, value FROM _1_variables WHERE functionId=\"send-otp-whatsapp\"'"
)
print("Variables fonction:")
print(stdout.read().decode())

# 2. Toutes les variables
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT name, value FROM _1_variables LIMIT 20'"
)
print("\nToutes variables:")
print(stdout.read().decode())

# 3. Vérifier les collections
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES LIKE \"%otp%\"'"
)
print("\nTables OTP:")
print(stdout.read().decode())

# 4. Lister toutes les tables
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES' | grep -i otp"
)
print("\nTables avec OTP:")
print(stdout.read().decode())

# 5. Vérifier la structure de la DB pour les collections
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES LIKE \"wimrux%\"' | head -20"
)
print("\nTables wimrux:")
print(stdout.read().decode())

client.close()
