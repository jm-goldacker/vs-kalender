import { Link } from 'react-router-dom';

export function DatenschutzPage() {
  return (
    <div className="min-h-dvh bg-paper px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-t-2xl bg-brand px-6 py-5 text-center">
          <span className="font-mono text-lg font-semibold uppercase tracking-[0.3em] text-white">
            VS·Kalender
          </span>
        </div>
        <div className="space-y-6 rounded-b-2xl bg-white p-6 shadow-md text-sm leading-relaxed text-gray-700 sm:p-8">
          <h1 className="text-xl font-semibold text-ink">Datenschutzhinweis zum VS-Kalender</h1>
          <p>
            Dieser Hinweis beschreibt, welche personenbezogenen Daten bei der Nutzung des
            VS-Kalenders (dieser Buchungsanwendung für Vereinsressourcen) verarbeitet werden. Für
            die allgemeine Vereinswebsite{' '}
            <a
              href="https://vs-msh.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-dark underline"
            >
              vs-msh.de
            </a>{' '}
            gilt die dortige{' '}
            <a
              href="https://vs-msh.de/datenschutzerklaerung/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-dark underline"
            >
              Datenschutzerklärung
            </a>
            .
          </p>

          <section className="space-y-2">
            <h2 className="font-semibold text-ink">1. Verantwortlicher</h2>
            <p>
              Volkssolidarität Kreisverband „Mansfeld-Südharz" e.V.
              <br />
              Weg zum Hutberg 12, 06295 Lutherstadt Eisleben
              <br />
              Telefon: 03475 65 88 0
              <br />
              E-Mail:{' '}
              <a href="mailto:info@vs-msh.de" className="text-brand-dark underline">
                info@vs-msh.de
              </a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-ink">2. Welche Daten wir verarbeiten</h2>
            <p>Für die Nutzung des VS-Kalenders verarbeiten wir folgende Daten:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Benutzername und Anzeigename (bei der Kontoanlage durch einen Administrator vergeben)</li>
              <li>Passwort (ausschließlich als verschlüsselter Hash gespeichert, nicht im Klartext)</li>
              <li>Rolle (Mitglied oder Administrator) und Kontostatus (aktiv/deaktiviert)</li>
              <li>
                Buchungsdaten: gebuchte Ressource, Zeitraum, Zweck, optionale Notizen sowie die
                gebuchte Menge, jeweils zugeordnet zum buchenden Konto
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-ink">3. Zweck und Rechtsgrundlage</h2>
            <p>
              Die Daten werden ausschließlich zur Verwaltung der Buchungen von Vereinsressourcen
              (z.B. Fahrzeuge, Geräte) durch Vereinsmitglieder verarbeitet. Rechtsgrundlage ist Art.
              6 Abs. 1 lit. b DSGVO (Nutzung im Rahmen der Mitgliedschaft) sowie Art. 6 Abs. 1 lit. f
              DSGVO (berechtigtes Interesse an einer funktionierenden Ressourcenverwaltung).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-ink">4. Cookies</h2>
            <p>
              Der VS-Kalender verwendet ein einziges, technisch notwendiges Sitzungscookie, um Sie
              nach der Anmeldung als eingeloggt zu erkennen. Es läuft nach höchstens 30 Tagen
              automatisch ab oder endet mit der Abmeldung. Es werden keine Analyse-, Tracking- oder
              Werbecookies eingesetzt und keine Daten an Dritte (z.B. Google Analytics) übermittelt.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-ink">5. Weitergabe an Dritte</h2>
            <p>
              Ihre Daten werden nicht an Dritte weitergegeben. Der VS-Kalender läuft auf einem vom
              Verein betriebenen bzw. beauftragten Server; ein Zugriff durch das dortige Hosting ist
              technisch nicht auszuschließen, erfolgt aber nicht zu eigenen Zwecken des Hosters.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-ink">6. Speicherdauer</h2>
            <p>
              Konto- und Buchungsdaten werden gespeichert, solange das Nutzerkonto besteht. Bei
              Deaktivierung oder Löschung eines Kontos durch einen Administrator werden die
              zugehörigen Daten nicht mehr für neue Buchungen verwendet; bereits bestehende
              Buchungen können aus organisatorischen Gründen (Nachvollziehbarkeit der
              Ressourcenplanung) bestehen bleiben.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-ink">7. Ihre Rechte</h2>
            <p>
              Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
              Verarbeitung Ihrer Daten sowie auf Datenübertragbarkeit und Widerspruch gegen die
              Verarbeitung. Zudem haben Sie das Recht, sich bei einer
              Datenschutz-Aufsichtsbehörde zu beschweren.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-ink">8. Kontakt</h2>
            <p>
              Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte wenden Sie sich bitte an{' '}
              <a href="mailto:info@vs-msh.de" className="text-brand-dark underline">
                info@vs-msh.de
              </a>
              .
            </p>
          </section>

          <div className="pt-2">
            <Link to="/" className="text-sm text-brand-dark underline">
              ← Zurück zum Kalender
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
