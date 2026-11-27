import React, { useState } from 'react';
import './Signup.css'; 

const API_URL = '/api';

export default function Signup({ onRegisterSuccess, switchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred during registration.');
      }

      setSuccessMsg('Registration successful! You can now log in.');
      
      setTimeout(() => {
        if (switchToLogin) {
          switchToLogin();
        }
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-card">
      <h2 className="signup-title">Create an Account</h2>

      {error && <div className="signup-error-message">{error}</div>}
      {successMsg && <div className="signup-success-message">{successMsg}</div>}

      <form onSubmit={handleSubmit} className="signup-form">
        <div className="signup-input-group">
          <label className="signup-label">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Juan Cruz"
            required
            className="signup-input"
          />
        </div>

        <div className="signup-input-group">
          <label className="signup-label">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="enter@example.com"
            required
            className="signup-input"
          />
        </div>

        <div className="signup-input-group">
          <label className="signup-label">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            className="signup-input"
          />
        </div>

        <button type="submit" disabled={loading} className="signup-button">
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      {switchToLogin && (
        <p className="signup-toggle-text">
          Already have an account?{' '}
          <span onClick={switchToLogin} className="signup-link">
            Login here
          </span>
        </p>
      )}
    </div>
  );
}