import bcrypt from 'bcrypt';
import { db } from './db';

/** Legt beim allerersten Start (leere users-Tabelle) den Admin aus den Env-Variablen an. */
export async function seed(): Promise<void> {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  if (c > 0) return;

  const username = process.env.ADMIN_USERNAME?.trim() || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      'Die Datenbank ist leer, aber ADMIN_PASSWORD ist nicht gesetzt. ' +
        'Bitte ADMIN_USERNAME/ADMIN_PASSWORD als Umgebungsvariablen angeben, ' +
        'damit der erste Admin-Benutzer angelegt werden kann.'
    );
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare(
    "INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, 'admin')"
  ).run(username, hash, username);
  console.log(`Admin-Benutzer "${username}" wurde angelegt.`);
}
