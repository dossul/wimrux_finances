import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Lire le vrai start.sh
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /usr/local/server/helpers/start.sh"
)
print("start.sh:")
print(stdout.read().decode())

# Lire le package.json
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /usr/local/server/package.json"
)
print("\npackage.json:")
print(stdout.read().decode())

# Lire le server.js
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /usr/local/server/src/server.js | head -50"
)
print("\nserver.js (first 50 lines):")
print(stdout.read().decode())

client.close()
