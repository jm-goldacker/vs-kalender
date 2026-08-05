import { Link } from 'react-router-dom';

/** Datenschutz- und Impressum-Link, auf Login- und Hauptseite sichtbar (Zwei-Klick-Regel). */
export function LegalFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-6 text-xs text-gray-500">
      <Link to="/datenschutz" className="hover:underline">
        Datenschutz
      </Link>
      <a
        href="https://vs-msh.de/impressum/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        Impressum
      </a>
    </footer>
  );
}
