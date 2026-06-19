import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Lire before-start.sh
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /usr/local/server/helpers/before-start.sh"
)
print("before-start.sh:")
print(stdout.read().decode())

# Lire le reste de server.js (après line 50)
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 sed -n '50,150p' /usr/local/server/src/server.js"
)
print("\nserver.js (lines 50-150):")
print(stdout.read().decode())

# Lire docker-entrypoint.sh
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /docker-entrypoint.sh"
)
print("\ndocker-entrypoint.sh:")
print(stdout.read().decode())

client.close()
