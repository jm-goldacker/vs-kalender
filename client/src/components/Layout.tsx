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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-2 py-1.5 text-sm ${isActive ? 'bg-white/15 text-amber' : 'text-gray-200 hover:text-white'}`;

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="bg-[#17181c]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:px-4">
          <NavLink
            to="/"
            className="font-mono text-sm font-semibold uppercase tracking-[0.25em] text-amber"
          >
            Bus·Kalender
          </NavLink>
          <span className="ml-auto hidden text-sm text-gray-400 sm:block">{user?.displayName}</span>
          <nav className="flex items-center gap-1 sm:ml-4 ml-auto">
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
              className="rounded px-2 py-1.5 text-sm text-gray-200 hover:text-white"
            >
              Passwort
            </button>
            <button
              onClick={handleLogout}
              className="rounded px-2 py-1.5 text-sm text-gray-200 hover:text-white"
            >
              Abmelden
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4">{children}</main>
      {showPassword && <PasswordDialog onClose={() => setShowPassword(false)} />}
    </div>
  );
}
