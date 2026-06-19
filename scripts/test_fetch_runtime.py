import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Tester fetch depuis le runtime Node.js
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network executor_runtimes openruntimes/node:v3-18.0 node -e "
    "'const start = Date.now(); "
    "fetch(\"https://appwrite.benga.live/v1/health\").then(r => {"
    "  console.log(\"Status:\", r.status, \"Time:\", Date.now() - start, \"ms\");"
    "}).catch(e => {"
    "  console.log(\"Error:\", e.message, \"Time:\", Date.now() - start, \"ms\");"
    "})'"
)
print("Fetch test from runtime:")
print(stdout.read().decode())

# Tester un POST vers la DB API
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network executor_runtimes openruntimes/node:v3-18.0 node -e "
    "'const start = Date.now(); "
    "fetch(\"https://appwrite.benga.live/v1/databases/wimrux_finances/collections/otp_codes/documents\", {"
    "  method: \"POST\","
    "  headers: { \"Content-Type\": \"application/json\", \"X-Appwrite-Project\": \"6a29285200015cd421c7\" },"
    "  body: JSON.stringify({ documentId: \"unique()\", data: { user_id: \"test\", phone: \"test\", code: \"123456\", purpose: \"test\", used: false, expires_at: \"2026-06-13T20:00:00Z\" } })"
    "}).then(async r => {"
    "  const text = await r.text();"
    "  console.log(\"Status:\", r.status, \"Body:\", text.substring(0, 100), \"Time:\", Date.now() - start, \"ms\");"
    "}).catch(e => {"
    "  console.log(\"Error:\", e.message, \"Time:\", Date.now() - start, \"ms\");"
    "})'"
)
print("\nDB API test from runtime:")
print(stdout.read().decode())

client.close()
