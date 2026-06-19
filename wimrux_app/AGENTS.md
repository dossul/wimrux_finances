# AGENTS.md

## Appwrite Backend

This project uses [Appwrite](https://appwrite.io) 1.5.7 as its backend (BaaS): database, authentication, file storage, edge functions, realtime, and AI model gateway.

- **Project:** **Wimrux Finances**
- **Endpoint:** `https://appwrite.benga.live/v1`
- **Project ID:** `6a29285200015cd421c7`
- **Database:** `wimrux_finances`
- **Credentials:** app code reads keys from `.env` / `.env.local`. Never hardcode or commit keys.

Key patterns:

- Database operations use the Appwrite SDK (`Databases`, `Query`, `ID`).
- Reference users with `auth.users(id)`.
- Storage uploads return both `url` and `$id`.
- Edge Functions are deployed to Appwrite via the CLI.

