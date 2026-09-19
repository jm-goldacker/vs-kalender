# VS-Kalender

Gemeinsamer Buchungskalender für Vereinsressourcen. Jeder der ca. 15 Nutzer kann sehen, wann welche Ressource frei ist, und eigene Buchungen anlegen. Doppelbuchungen werden automatisch verhindert.

**Funktionen**

- Login mit Benutzername + Passwort, Rollen: Admin und Mitglied
- Beliebige Ressourcen buchbar: Fahrzeuge (mit Kennzeichen und Sitzplätzen) sowie Geräte wie Hüpfburg oder Bierzeltgarnitur, jeweils mit eigener Kalenderfarbe
- Mengenbasierte Buchung für Geräte mit mehreren Exemplaren (z.B. mehrere Bierzeltgarnituren gleichzeitig buchbar)
- Monats-, Wochen- und Listenansicht (auf dem Handy automatisch Listenansicht)
- Konfliktprüfung: keine Ressource kann für überlappende Zeiträume doppelt gebucht werden; Verfügbarkeit im Buchungsformular wird live nachgeladen
- Wöchentlich wiederkehrende Termine (mit Enddatum), einzelne Termine oder ganze Serien änderbar/löschbar
- Jeder bearbeitet nur eigene Buchungen, Admins alle
- Admin-Bereich für Benutzer- und Ressourcenverwaltung
- Datenschutzhinweis und Impressum-Link auf Login- und Hauptseite

**Technik:** React + FullCalendar + Tailwind (Frontend), Node.js/Express + SQLite (Backend), alles in einem Docker-Container.

**Lizenz:** [GNU AGPLv3](LICENSE)

📖 Für die Vereinsmitglieder gibt es eine bebilderte **[Benutzeranleitung](docs/BENUTZERANLEITUNG.md)**.

## Deployment auf dem Server (Docker)

1. Projekt auf den Server kopieren (z.B. per `git clone` oder `scp`).
2. `.env`-Datei anlegen (Vorlage: `.env.example`):

   ```bash
   cp .env.example .env
   # SESSION_SECRET z.B. erzeugen mit: openssl rand -hex 32
   # ADMIN_PASSWORD setzen (wird nur beim allerersten Start verwendet)
   ```

3. Starten:

   ```bash
   docker compose up -d --build
   ```

Die App läuft dann auf **Port 3001** (`http://<server>:3001`). Beim ersten Start wird der Admin-Benutzer aus `ADMIN_USERNAME`/`ADMIN_PASSWORD` angelegt. Danach im Admin-Bereich („Verwaltung“) die Busse und die übrigen Benutzer anlegen.

Hinter einem Reverse-Proxy mit HTTPS zusätzlich `COOKIE_SECURE=true` in der `.env` setzen.

### Backup

Alle Daten liegen in der SQLite-Datenbank im Ordner `./data`. Für ein Backup genügt es, diesen Ordner zu kopieren (am besten bei gestopptem Container oder per `sqlite3 data/bus-kalender.db ".backup backup.db"`).

### Update

```bash
git pull
docker compose up -d --build
```

## Lokale Entwicklung

```bash
npm install
ADMIN_PASSWORD=irgendwas npm run dev   # PowerShell: $env:ADMIN_PASSWORD='irgendwas'; npm run dev
```

- Backend: http://localhost:3001 (tsx watch)
- Frontend: http://localhost:5173 (Vite mit Proxy auf das Backend)
- Tests: `npm test` (vitest, Konfliktprüfung + Serienexpansion inkl. Sommerzeit)

Die SQLite-Datei liegt in der Entwicklung unter `./data/bus-kalender.db`.
