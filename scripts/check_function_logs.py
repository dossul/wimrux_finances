import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# 1. Vérifier si la fonction a des logs dans la DB
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES LIKE \"%execution%\"'"
)
print("Tables:")
print(stdout.read().decode())

# 2. Dernières exécutions de la fonction
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, status, responseStatusCode, responseBody, logs, errors, duration FROM _1_executions WHERE functionId=\"send-otp-whatsapp\" ORDER BY _createdAt DESC LIMIT 3'"
)
print("\nDernières exécutions:")
print(stdout.read().decode())

# 3. Vérifier la collection otp_codes existe
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES LIKE \"%otp%\"'"
)
print("\nTables OTP:")
print(stdout.read().decode())

# 4. Vérifier si WHAPI_TOKEN est configuré
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-main sh -c 'env | grep WHAPI'"
)
print("\nWHAPI env:")
print(stdout.read().decode())

# 5. Vérifier le secret dans la DB
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, value FROM _1_variables WHERE name LIKE \"%WHAPI%\"'"
)
print("\nVariables WHAPI:")
print(stdout.read().decode())

client.close()
