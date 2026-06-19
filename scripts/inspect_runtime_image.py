import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Inspecter le contenu de l'image runtime
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /usr/local/server/src/function/helpers/start.sh"
)
print("start.sh:")
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 ls -la /usr/local/server/src/function/helpers/"
)
print("\nhelpers dir:")
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /usr/local/server/src/function/helpers/before-start.sh 2>/dev/null || echo 'no before-start'"
)
print("\nbefore-start.sh:")
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /usr/local/server/src/function/helpers/after-build.sh 2>/dev/null || echo 'no after-build'"
)
print("\nafter-build.sh:")
print(stdout.read().decode())

client.close()
