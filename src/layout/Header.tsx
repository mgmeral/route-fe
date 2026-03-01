import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <button className="hamburger" onClick={onMenuClick} type="button" aria-label="Open menu">
          ☰
        </button>
        <svg className="header-logo" viewBox="0 0 40 40" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#e81932" />
          <path d="M12 26 C14 18, 22 12, 32 14 C24 14, 18 18, 15 24 Z" fill="#fff" />
          <ellipse cx="20" cy="20" rx="6" ry="5" fill="none" stroke="#fff" strokeWidth="1.2" transform="rotate(-20 20 20)" />
        </svg>
        <strong>TURKISH AIRLINES</strong>
      </div>
      {currentUser ? (
        <div className="header-right" ref={menuRef}>
          <button
            type="button"
            className="user-menu-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {currentUser.username} ▾
          </button>
          {menuOpen ? (
            <div className="user-dropdown">
              <button type="button" onClick={() => { logout(); setMenuOpen(false); }}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
};
