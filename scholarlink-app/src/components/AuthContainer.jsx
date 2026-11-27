import React, { useState } from 'react';
import { requestJson } from '../services/api.js';
import '../styles/AuthContainer.css';

export default function AuthContainer({ onLoginSuccess }) {
  const [loginMode, setLoginMode] = useState('student');
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationKey, setRegistrationKey] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const endpoint = isLogin
      ? `/${loginMode === 'admin' ? 'admin/login' : 'login'}`
      : `/${loginMode === 'admin' ? 'admin/register' : 'register'}`;
    const payload = isLogin
      ? { email, password }
      : loginMode === 'admin'
        ? { name, email, password, registrationKey }
        : { name, email, password };

    try {
      const data = await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (isLogin) {
        localStorage.setItem('scholarlink_token', data.token);
        localStorage.setItem('scholarlink_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setSuccessMsg(
          loginMode === 'admin'
            ? 'Administrator registered. You can now log in.'
            : 'Registration successful! You can now log in.'
        );
        setIsLogin(true);
        setPassword('');
        setRegistrationKey('');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-container">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">S</span>
          <span>ScholarLink</span>
        </div>
        <p className="auth-eyebrow">
          {loginMode === 'admin' ? 'ADMINISTRATION PORTAL' : 'STUDENT PORTAL'}
        </p>
        <h1 className="auth-title">
          {isLogin
            ? <>{loginMode === 'admin' ? 'Administrator' : 'Welcome'} <span>{loginMode === 'admin' ? 'access' : 'back'}</span></>
            : 'Create your account'}
        </h1>
        <p className="auth-subtitle">
          {isLogin
            ? loginMode === 'admin'
              ? 'Sign in to manage ScholarLink.'
              : 'Sign in to continue your scholarship journey.'
            : 'Create an account to get started with ScholarLink.'}
        </p>

        <div className="auth-mode-toggle" role="group" aria-label="Choose account type">
          <button
            type="button"
            className={loginMode === 'student' ? 'auth-mode-button active' : 'auth-mode-button'}
            onClick={() => {
              setLoginMode('student');
              setIsLogin(true);
              setError('');
              setSuccessMsg('');
            }}
          >
            Student
          </button>
          <button
            type="button"
            className={loginMode === 'admin' ? 'auth-mode-button active' : 'auth-mode-button'}
            onClick={() => {
              setLoginMode('admin');
              setIsLogin(true);
              setError('');
              setSuccessMsg('');
            }}
          >
            Admin
          </button>
        </div>

        {error && <p className="auth-error-message" role="alert">{error}</p>}
        {successMsg && <p className="auth-success-message" role="status">{successMsg}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your full name"
                required
                className="auth-input"
              />
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="auth-input"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="auth-password">
              {loginMode === 'admin' && !isLogin
                ? 'Create your admin password'
                : loginMode === 'admin'
                  ? 'Admin password'
                  : 'Password'}
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={!isLogin && loginMode === 'admin' ? 12 : !isLogin ? 6 : undefined}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="Enter your password"
              required
              className="auth-input"
            />
            {!isLogin && loginMode === 'admin' && (
              <small className="auth-helper-text">
                Use at least 12 characters.
              </small>
            )}
          </div>
          {!isLogin && loginMode === 'admin' && (
            <div className="auth-field">
              <label htmlFor="auth-registration-key">Administrator registration key</label>
              <input
                id="auth-registration-key"
                type="password"
                value={registrationKey}
                onChange={(e) => setRegistrationKey(e.target.value)}
                required
                autoComplete="off"
                placeholder="Enter the registration key"
                className="auth-input"
              />
              <small className="auth-helper-text">
                Use the key configured as ADMIN_REGISTRATION_KEY on the API server.
              </small>
            </div>
          )}
          <button type="submit" className="auth-submit-button">
            {isLogin ? 'Sign in' : 'Create account'}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        {loginMode === 'student' && (
          <p className="auth-account-toggle">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
              className="auth-account-link"
            >
              {isLogin ? 'Create account' : 'Sign in'}
            </button>
          </p>
        )}
        {loginMode === 'admin' && (
          <p className="auth-account-toggle">
            {isLogin ? 'Need an administrator account?' : 'Already registered?'}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccessMsg('');
              }}
              className="auth-account-link"
            >
              {isLogin ? 'Register with a key' : 'Administrator sign in'}
            </button>
          </p>
        )}
      </section>
    </main>
  );
}