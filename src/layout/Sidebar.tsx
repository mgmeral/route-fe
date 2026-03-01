import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <nav>
          <NavLink to="/routes" onClick={onClose} className={({ isActive }) => (isActive ? 'active' : '')}>
            Routes
          </NavLink>
          {currentUser.role === 'ADMIN' ? (
            <>
              <NavLink to="/locations" onClick={onClose} className={({ isActive }) => (isActive ? 'active' : '')}>
                Locations
              </NavLink>
              <NavLink
                to="/transportations"
                onClick={onClose}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Transportations
              </NavLink>
            </>
          ) : null}
        </nav>
      </aside>
      {mobileOpen ? <button className="drawer-backdrop" type="button" onClick={onClose} aria-label="Close" /> : null}
    </>
  );
};
