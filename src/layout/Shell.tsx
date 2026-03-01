import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { registerAuthFailureHandler } from '../api/fetcher';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Shell = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    registerAuthFailureHandler(() => {
      logout();
      navigate('/login');
    });
  }, [logout, navigate]);

  return (
    <div className="app-shell">
      <Header onMenuClick={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="main-content" onClick={() => setMobileOpen(false)}>
        <Outlet />
      </main>
    </div>
  );
};
