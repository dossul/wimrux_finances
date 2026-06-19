import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Tester l'insertion DB depuis le runtime Node.js
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network executor_runtimes openruntimes/node:v3-18.0 node -e "
    "'const start = Date.now(); "
    "fetch(\"https://appwrite.benga.live/v1/databases/wimrux_finances/collections/otp_codes/documents\", {"
    "  method: \"POST\","
    "  headers: { \"Content-Type\": \"application/json\", \"X-Appwrite-Project\": \"6a29285200015cd421c7\", \"X-Appwrite-Key\": \"cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57\" },"
    "  body: JSON.stringify({ documentId: \"unique()\", data: { user_id: \"test\", phone: \"test\", code: \"123456\", purpose: \"test\", used: false, expires_at: \"2026-06-13T20:00:00Z\" } })"
    "}).then(async r => {"
    "  const text = await r.text();"
    "  console.log(\"Status:\", r.status, \"Body:\", text.substring(0, 200), \"Time:\", Date.now() - start, \"ms\");"
    "}).catch(e => {"
    "  console.log(\"Error:\", e.message, \"Time:\", Date.now() - start, \"ms\");"
    "})'"
)
print("DB insert from runtime:")
print(stdout.read().decode())

# Tester WHAPI depuis le runtime
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network executor_runtimes openruntimes/node:v3-18.0 node -e "
    "'const start = Date.now(); "
    "fetch(\"https://gate.whapi.cloud/messages/text\", {"
    "  method: \"POST\","
    "  headers: { \"Content-Type\": \"application/json\", \"Authorization\": \"Bearer 7oUdVCMwhatfvWgRZJBner9bKvCfPq9t\" },"
    "  body: JSON.stringify({ to: \"22665599195@s.whatsapp.net\", body: \"Test\" })"
    "}).then(async r => {"
    "  const text = await r.text();"
    "  console.log(\"Status:\", r.status, \"Body:\", text.substring(0, 200), \"Time:\", Date.now() - start, \"ms\");"
    "}).catch(e => {"
    "  console.log(\"Error:\", e.message, \"Time:\", Date.now() - start, \"ms\");"
    "})'"
)
print("\nWHAPI from runtime:")
print(stdout.read().decode())

client.close()
