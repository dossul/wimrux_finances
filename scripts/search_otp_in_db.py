import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Chercher des documents avec code ou user_id admin-wimrux dans toutes les tables
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e \""
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='appwrite' AND TABLE_NAME LIKE '_1_%';\" "
    "| grep -v 'perms\|_metadata\|bucket\|audit\|abuse\|attributes\|authenticators' | head -20"
)
print("Data tables:")
print(stdout.read().decode())

# Chercher dans chaque table
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e \""
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='appwrite' AND TABLE_NAME LIKE '_1_%';\" "
    "| grep -v 'perms\|_metadata\|bucket\|audit\|abuse\|attributes\|authenticators' | "
    "while read t; do "
    "  count=$(docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e \"SELECT COUNT(*) FROM $t WHERE _id LIKE '%otp%'\" 2>/dev/null); "
    "  [ \"$count\" != '0' ] && echo \"$t: $count\"; "
    "done"
)
print("\nTables with otp:")
print(stdout.read().decode())

client.close()
