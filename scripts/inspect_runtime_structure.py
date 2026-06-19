import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Chercher le start.sh dans l'image
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 find / -name 'start.sh' 2>/dev/null | head -10"
)
print("start.sh locations:")
print(stdout.read().decode())

# Chercher les helpers
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 find / -type d -name 'helpers' 2>/dev/null | head -10"
)
print("\nhelpers dirs:")
print(stdout.read().decode())

# Voir la structure de /usr/local/server
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 ls -la /usr/local/server/"
)
print("\n/usr/local/server:")
print(stdout.read().decode())

# Voir la structure de /usr/local/server/src
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 ls -laR /usr/local/server/src/ 2>/dev/null | head -30"
)
print("\n/usr/local/server/src:")
print(stdout.read().decode())

# Entrypoint de l'image
stdin, stdout, stderr = client.exec_command(
    "docker inspect openruntimes/node:v3-18.0 --format '{{json .Config.Entrypoint}} {{json .Config.Cmd}} {{json .Config.WorkingDir}}'"
)
print("\nImage config:")
print(stdout.read().decode())

client.close()
