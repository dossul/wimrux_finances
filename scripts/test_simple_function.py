import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Créer une fonction temporaire très simple
simple_code = '''module.exports = async function(context) {
  const { req, res } = context;
  return res.json({ ok: true, method: req.method });
};
'''

# Remplacer temporairement le code de send-otp-whatsapp
mountpoint = '/var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7'

stdin, stdout, stderr = client.exec_command(
    f"echo '{simple_code}' > {mountpoint}/index.js_simple && "
    f"cp {mountpoint}/index.js {mountpoint}/index.js_backup && "
    f"cp {mountpoint}/index.js_simple {mountpoint}/index.js && "
    f"for f in {mountpoint}/*.gz; do gzip -c {mountpoint}/index.js > \"$f\"; done && "
    f"echo 'replaced with simple function'"
)
print("Replace:", stdout.read().decode())

# Restart executor
stdin, stdout, stderr = client.exec_command("docker restart appwrite-executor")
print("Restart:", stdout.read().decode())

# Test
endpoint = "https://appwrite.benga.live/v1"
project = "6a29285200015cd421c7"

stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST {endpoint}/account/sessions/email "
    f"-H 'Content-Type: application/json' "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-d '{{\"email\":\"admin@wimrux.app\",\"password\":\"WimruxAdmin2026!\"}}' "
    f"-D /tmp/login_headers2.txt"
)
print("Login:", stdout.read().decode()[:100])

stdin, stdout, stderr = client.exec_command(
    "cat /tmp/login_headers2.txt | grep -i '^set-cookie: a_session' | head -1 | sed 's/set-cookie: //i' | sed 's/;.*//'"
)
session_cookie = stdout.read().decode().strip()
print("Cookie:", session_cookie[:50])

if session_cookie:
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -X POST {endpoint}/functions/send-otp-whatsapp/executions "
        f"-H 'Content-Type: application/json' "
        f"-H 'X-Appwrite-Project: {project}' "
        f"-b '{session_cookie}' "
        f"-d '{{\"data\":\"{{\\\"phone\\\":\\\"+22665599195\\\"}}\",\"async\":false}}'"
    )
    result = stdout.read().decode()
    print("\nResult:", result)

# Restore original
stdin, stdout, stderr = client.exec_command(
    f"cp {mountpoint}/index.js_backup {mountpoint}/index.js && "
    f"for f in {mountpoint}/*.gz; do gzip -c {mountpoint}/index.js > \"$f\"; done && "
    f"echo 'restored'"
)
print("\nRestore:", stdout.read().decode())

client.close()
