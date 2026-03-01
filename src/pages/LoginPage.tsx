import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/fetcher';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../layout/Toast';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  if (currentUser) {
    return <Navigate to="/routes" replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await login(username.trim(), password);
      navigate('/routes', { replace: true });
    } catch (loginError) {
      if (loginError instanceof ApiError) {
        showToast(loginError.message, 'error');
      } else {
        showToast('Unable to login.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <h1>Login</h1>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};
