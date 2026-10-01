# Installing the server version / Installer la version serveur

The server version stores all data in a **PostgreSQL** database and adds **sign-in**:

- **Facilitator accounts** see and edit every organisation, manage accounts and calculation settings.
- **Organisation accounts** see and edit only their own organisation.

The app keeps a copy in the browser, so work continues when the connection drops; changes are sent when it is back (status shown in the header: *Synchronisé*, *Hors ligne*…).

Without a server (opening `index.html`, the offline file `dist/barometre-offline.html` or GitHub Pages) the tool works as before, in the browser only, without sign-in.

## What you need

- A server (rented VPS or your own machine) with **Linux** (Ubuntu 22.04/24.04 recommended), 1 CPU, 1 GB RAM, 10 GB disk are enough to start.
- **Docker** with the Compose plugin: `curl -fsSL https://get.docker.com | sh`
- The project files (`git clone` of the repository, or the zip).

## Install (about 10 minutes)

```bash
cd outil-diagnostic-organisationnel      # the project folder
cp .env.example .env
nano .env                                # set DB_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d --build
```

Open `http://<server-address>:8080` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Then change that password in **My account** (click your name, top right).

Check that everything runs: `docker compose ps` (the three services `db`, `app`, `backup` must be *Up*; `app` and `db` *healthy*).

## First steps as facilitator

1. **Bring existing data**: in the Facilitator space, *Import* the organisation files (`.json`) or *Restore* a workspace backup made with the browser version. Organisations and their PDF evidence are sent to the server.
2. **Create one account per organisation**: Facilitator space → *User accounts* → name, e-mail, role *Organisation*, the organisation, initial password (generated). Give the e-mail and password to the person; they can change the password in *My account*.
3. Add other facilitators with the role *Facilitator* if needed.

Forgotten password: Facilitator space → *User accounts* → *New password*. If every facilitator password is lost:

```bash
docker compose exec app node server/cli.js set-password facilitateur@example.org NewPassword123
```

## HTTPS (recommended on the internet)

Passwords must not travel unencrypted over the internet. With a domain name pointing to the server (DNS *A* record) and ports 80 and 443 open:

```
# in .env
DOMAIN=diagnostic.example.org
TRUST_PROXY=1
COOKIE_SECURE=1
```

```bash
docker compose --profile https up -d --build
```

Caddy obtains and renews the certificate automatically. The app is then at `https://diagnostic.example.org`. Close port 8080 in the firewall (or set `HTTP_PORT=127.0.0.1:8080`) so it is only reachable through HTTPS.

On a local network only (physical server in the office, no internet access), plain `http://<server-ip>:8080` is acceptable.

## Backups

- The `backup` service writes a compressed dump of the database **every day** to the `backups/` folder (kept `BACKUP_KEEP_DAYS` days, 30 by default). Copy that folder regularly to another place (USB disk, another server, cloud storage).
- In addition, the database keeps earlier versions of each organisation (one per hour of activity, the latest 100), and a copy of any deleted organisation, in the `org_versions` table.
- The facilitator can still download a full workspace backup (`.json`) from the Facilitator space.

Restore a daily dump (replaces the current data):

```bash
gunzip -c backups/diagnostic-2026-10-01_0300.sql.gz | docker compose exec -T db psql -U diagnostic -d diagnostic
```

## Updating

```bash
git pull                     # or copy the new files
docker compose up -d --build
```

The database schema is updated automatically at start. Data is kept in the `db-data` Docker volume (do **not** run `docker compose down -v`, which deletes it).

## Useful commands

| Task | Command |
|---|---|
| Status | `docker compose ps` |
| Logs | `docker compose logs -f app` |
| Stop / start | `docker compose stop` / `docker compose start` |
| List accounts | `docker compose exec app node server/cli.js list-users` |
| Create a facilitator | `docker compose exec app node server/cli.js create-facilitator email password "Name"` |
| Change a password | `docker compose exec app node server/cli.js set-password email password` |
| Manual backup | `docker compose exec backup sh -c 'pg_dump --no-owner --clean --if-exists \| gzip > /backups/manual.sql.gz'` |

## Without Docker

Requirements: Node.js 18+ and PostgreSQL 13+.

```bash
cd server && npm ci --omit=dev && cd ..
createdb diagnostic
DATABASE_URL=postgres://user:password@localhost:5432/diagnostic \
ADMIN_EMAIL=facilitateur@example.org ADMIN_PASSWORD=change-me-now \
node server/index.js
```

Run it as a service (systemd) and put a reverse proxy with HTTPS (Caddy, nginx) in front, with `TRUST_PROXY=1`.

## Security notes

- Passwords are hashed (scrypt); sessions use an HttpOnly cookie valid 14 days (sliding), removed at sign-out.
- After 10 failed sign-ins for an e-mail from the same address, sign-in is blocked for 15 minutes.
- Organisation accounts can only read and write their own organisation and evidence files; the server checks every request.
- Changing a password, disabling an account or changing its rights signs that account out everywhere.
- At least one active facilitator account always remains; an organisation that still has accounts cannot be deleted.
- On a shared computer, always **sign out**: this also removes the local copy from the browser.
