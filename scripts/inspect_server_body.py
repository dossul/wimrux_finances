import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Lire le server.js complet
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /usr/local/server/src/server.js"
)
server_js = stdout.read().decode()

# Chercher comment le body est passé à la fonction utilisateur
print("=== server.js (body handling) ===")
for i, line in enumerate(server_js.split('\n')):
    if 'body' in line.lower() or 'bodyJson' in line or 'bodyText' in line or 'bodyRaw' in line:
        print(f"{i+1}: {line}")

client.close()
