import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api, ApiError } from '../api/client';
import { Modal } from './Modal';

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.put('/auth/password', { oldPassword, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Passwort konnte nicht geändert werden');
    }
  };

  return (
    <Modal title="Passwort ändern" onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-green-700">Dein Passwort wurde geändert.</p>
          <button onClick={onClose} className="btn-primary">
            Schließen
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="label">Aktuelles Passwort</span>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="input"
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className="label">Neues Passwort (mind. 8 Zeichen)</span>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              autoComplete="new-password"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary">
            Passwort ändern
          </button>
        </form>
      )}
    </Modal>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-2 py-1.5 text-sm ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'}`;

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-3 text-base ${isActive ? 'bg-white/20 text-white' : 'text-white/85'}`;

  const mobileButtonClass = 'block w-full rounded-lg px-3 py-3 text-left text-base text-white/85';

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="bg-brand">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <NavLink
            to="/"
            className="shrink-0 font-mono text-sm font-semibold uppercase tracking-[0.25em] text-white"
            onClick={() => setMenuOpen(false)}
          >
            Bus·Kalender
          </NavLink>

          {/* Desktop-Navigation */}
          <nav className="hidden items-center gap-1 sm:flex">
            <span className="mr-3 text-sm text-white/70">{user?.displayName}</span>
            <NavLink to="/" className={navClass} end>
              Kalender
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navClass}>
                Verwaltung
              </NavLink>
            )}
            <button
              onClick={() => setShowPassword(true)}
              className="rounded px-2 py-1.5 text-sm text-white/80 hover:text-white"
            >
              Passwort
            </button>
            <button
              onClick={handleLogout}
              className="rounded px-2 py-1.5 text-sm text-white/80 hover:text-white"
            >
              Abmelden
            </button>
          </nav>

          {/* Burger-Button für schmale Bildschirme */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white sm:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Aufklappbares mobiles Menü */}
        {menuOpen && (
          <nav className="border-t border-white/20 px-3 pb-3 pt-2 sm:hidden">
            <p className="px-3 py-2 text-sm text-white/70">Angemeldet als {user?.displayName}</p>
            <NavLink to="/" className={mobileNavClass} end onClick={() => setMenuOpen(false)}>
              Kalender
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={mobileNavClass} onClick={() => setMenuOpen(false)}>
                Verwaltung
              </NavLink>
            )}
            <button
              onClick={() => {
                setMenuOpen(false);
                setShowPassword(true);
              }}
              className={mobileButtonClass}
            >
              Passwort ändern
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                void handleLogout();
              }}
              className={mobileButtonClass}
            >
              Abmelden
            </button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4">{children}</main>
      {showPassword && <PasswordDialog onClose={() => setShowPassword(false)} />}
    </div>
  );
}
