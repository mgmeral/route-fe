import { Navigate, createBrowserRouter } from 'react-router-dom';
import { RequireAdmin } from '../auth/RequireAdmin';
import { RequireAuth } from '../auth/RequireAuth';
import { Shell } from '../layout/Shell';
import { LocationsPage } from '../pages/LocationsPage';
import { LoginPage } from '../pages/LoginPage';
import { RoutesPage } from '../pages/RoutesPage';
import { TransportationsPage } from '../pages/TransportationsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <Shell />,
        children: [
          { index: true, element: <Navigate to="/routes" replace /> },
          { path: '/routes', element: <RoutesPage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: '/locations', element: <LocationsPage /> },
              { path: '/transportations', element: <TransportationsPage /> }
            ]
          }
        ]
      }
    ]
  },
  { path: '*', element: <Navigate to="/routes" replace /> }
]);
