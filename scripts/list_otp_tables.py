import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Lister les tables contenant otp
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES LIKE \"%otp%\"'"
)
print("OTP tables:")
print(stdout.read().decode())

client.close()
