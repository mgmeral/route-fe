import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './layout/Toast';
import 'leaflet/dist/leaflet.css';
import './styles.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: unknown }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Unhandled error in React tree:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '16px' }}>
          <h1>Something went wrong 😞</h1>
          <pre>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  </ErrorBoundary>
);
