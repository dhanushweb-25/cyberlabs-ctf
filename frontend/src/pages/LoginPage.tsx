import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!username || !password) {
      setValidationError("Please enter both your credentials and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(username, password, rememberMe);
      navigate('/dashboard');
    } catch (err: any) {
      setValidationError(err.message || "Invalid credentials. Please verify and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100-16)] items-center justify-center bg-ctfBg py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* Branding header */}
        <div className="flex flex-col items-center justify-center text-center">
          <Link to="/" className="flex items-center gap-2 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-md">
              <Shield className="h-7 w-7" />
            </div>
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Sign In to CyberLabs
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Welcome back, Operator. Access your training dashboard.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Validation Banner */}
            {validationError && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-danger flex items-start gap-2 border border-red-100 animate-shake">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Username / Email field */}
            <div className="space-y-1.5">
              <label htmlFor="usernameOrEmail" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="usernameOrEmail"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-lg border border-slate-350 pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                  placeholder="haxor_99 or you@example.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); alert("Password reset link (mocked) has been sent to your email."); }} className="text-xs font-semibold text-secondary hover:text-secondary-dark transition-colors">
                  Forgot Password?
                </a>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-350 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember_me"
                name="remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="remember_me" className="ml-2 block text-sm text-slate-600">
                Remember Me
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary py-3 text-center text-sm font-semibold text-white shadow-lg hover:bg-primary-light transition-all hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-slate-500">New to CyberLabs? </span>
            <Link to="/register" className="font-semibold text-secondary hover:text-secondary-dark transition-colors">
              Create Account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
