import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Rollback to 0.4.8
stdin, stdout, stderr = client.exec_command(
    "cp /opt/stacks/appwrite-main/docker-compose.yml.bak /opt/stacks/appwrite-main/docker-compose.yml && echo 'rollback done'"
)
print("Rollback:", stdout.read().decode())

# Restart
stdin, stdout, stderr = client.exec_command(
    "cd /opt/stacks/appwrite-main && docker compose stop appwrite-executor && docker compose rm -f appwrite-executor && docker compose up -d appwrite-executor"
)
print("Restart:", stdout.read().decode())

import time
time.sleep(5)

stdin, stdout, stderr = client.exec_command(
    "docker logs appwrite-executor --tail 10 2>&1"
)
print("\nLogs:", stdout.read().decode())

client.close()
