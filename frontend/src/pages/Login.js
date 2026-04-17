import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogo, MicrosoftOutlookLogo, EnvelopeSimple, Lock, User } from '@phosphor-icons/react';

function formatApiError(detail) {
  if (detail == null) return 'Something went wrong.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(' ');
  return String(detail);
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: 'var(--text-primary)' }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 flex items-center justify-center text-lg font-bold" style={{ background: 'var(--brand)', color: '#FFFFFF' }}>N</div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--bg)', fontFamily: 'Outfit' }}>NEXUS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-none mb-6" style={{ color: 'var(--bg)', fontFamily: 'Outfit' }}>
            Institute<br />Coaching<br />Management
          </h1>
          <p className="text-base leading-relaxed max-w-md" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
            Streamline your institute operations. Manage courses, track attendance, handle fees, and empower students and faculty with a unified platform.
          </p>
        </div>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
          Nexus Institute Platform v1.0
        </p>
      </div>

      {/* Right panel - auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--brand)' }}>N</div>
            <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>NEXUS</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
            {isRegister ? 'Sign up to get started' : 'Sign in to your account'}
          </p>

          {error && (
            <div className="mb-4 p-3 border text-sm" data-testid="auth-error" style={{ borderColor: 'var(--alert)', color: 'var(--alert)', background: 'var(--surface)', fontFamily: 'IBM Plex Sans' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-xs uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Full Name</label>
                <div className="flex items-center border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                  <User size={16} className="ml-3" style={{ color: 'var(--text-secondary)' }} />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    data-testid="register-name-input"
                    className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm"
                    style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Email</label>
              <div className="flex items-center border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <EnvelopeSimple size={16} className="ml-3" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  data-testid="login-email-input"
                  className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>Password</label>
              <div className="flex items-center border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <Lock size={16} className="ml-3" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  data-testid="login-password-input"
                  className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}
                  placeholder="Enter password"
                />
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              data-testid="auth-submit-btn"
              className="w-full py-2.5 text-sm font-medium text-white transition-colors duration-150"
              style={{ background: 'var(--brand)', fontFamily: 'IBM Plex Sans' }}
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              data-testid="google-login-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium border transition-colors duration-150 hover:bg-[var(--surface)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}
            >
              <GoogleLogo size={18} weight="bold" /> Continue with Google
            </button>
            <button
              disabled
              data-testid="microsoft-login-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium border opacity-50 cursor-not-allowed"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}
            >
              <MicrosoftOutlookLogo size={18} weight="bold" /> Microsoft (Coming Soon)
            </button>
          </div>

          <p className="text-sm mt-6 text-center" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              data-testid="toggle-auth-mode-btn"
              className="font-medium underline transition-colors duration-150"
              style={{ color: 'var(--brand)' }}
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
