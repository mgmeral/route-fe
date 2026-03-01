import { useAuth } from '../auth/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { currentUser, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        <button className="hamburger" onClick={onMenuClick} type="button" aria-label="Open menu">
          ☰
        </button>
        <strong>HEADER</strong>
      </div>
      {currentUser ? (
        <div className="header-right">
          <span>Role: {currentUser.role}</span>
          <button type="button" className="btn" onClick={logout}>
            Logout
          </button>
        </div>
      ) : null}
    </header>
  );
};
