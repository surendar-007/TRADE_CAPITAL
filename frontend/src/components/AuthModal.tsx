import React, { useState } from 'react';
import { X, Lock, Mail, Building, User as UserIcon, Phone, Briefcase, ArrowRight, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserSafeProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSafeProfile, token: string) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'signin'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Sign up fields
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Authentication failed. Please check your credentials.');
        return;
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage('Network error while connecting to authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!companyName.trim() || !name.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          industry: industry.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Registration failed. Please try again.');
        return;
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage('Network error while creating supplier account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setIsDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Unable to authenticate demo supplier account.');
        return;
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage('Network error during demo login.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px'
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            {mode === 'signin' ? 'Sign In' : 'Create Supplier Account'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {mode === 'signin' 
              ? 'Access your TradeCapital financing portal & clearing pipeline.' 
              : 'Register your enterprise to unlock invoice working capital.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            padding: '10px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sign In Form */}
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-faint)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. demo.supplier@apex.com"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-faint)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '9px',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginTop: '4px',
                justifyContent: 'center'
              }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('signup');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-blue)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.8rem'
                }}
              >
                Sign Up
              </button>
            </div>
          </form>
        ) : (
          /* Sign Up Form */
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Company Name *
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-faint)' }} />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Precision Engineering Ltd"
                  required
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.825rem',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Contact Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-faint)' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    required
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-medium)',
                      fontSize: '0.825rem',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-faint)' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-medium)',
                      fontSize: '0.825rem',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Business Sector / Industry
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-faint)' }} />
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Automotive Tooling & CNC"
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.825rem',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-faint)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supplier@company.com"
                  required
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.825rem',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Password (min 6 characters) *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-faint)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.825rem',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '9px',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginTop: '4px',
                justifyContent: 'center'
              }}
            >
              {isLoading ? 'Creating Account...' : 'Register & Sign In'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('signin');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-blue)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.8rem'
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '20px 0 16px 0'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.725rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Demo Quick Login
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Demo Quick Login Button */}
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDemoLogin}
            disabled={isDemoLoading || isLoading}
            style={{
              width: '100%',
              padding: '9px',
              fontSize: '0.85rem',
              fontWeight: 600,
              justifyContent: 'center',
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
              color: 'var(--primary-blue)'
            }}
          >
            <Zap size={14} color="var(--primary-blue)" />
            {isDemoLoading ? 'Entering Demo...' : 'Enter Demo'}
          </button>
        </div>
      </div>
    </div>
  );
};
