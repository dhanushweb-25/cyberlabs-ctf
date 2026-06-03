import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Menu, X, LogOut, User as UserIcon, Trophy, BookOpen, LayoutDashboard } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinks = isAuthenticated
    ? [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Challenges', path: '/challenges', icon: BookOpen },
        { name: 'Scoreboard', path: '/scoreboard', icon: Trophy },
        { name: 'Profile', path: '/profile', icon: UserIcon },
        ...(user?.is_admin ? [{ name: 'Admin', path: '/admin', icon: Shield }] : [])
      ]
    : [
        { name: 'Home', path: '/', icon: Shield },
        { name: 'Challenges', path: '/challenges', icon: BookOpen },
        { name: 'Scoreboard', path: '/scoreboard', icon: Trophy },
      ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Logo Section */}
          <div className="flex flex-shrink-0 items-center">
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Shield className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-primary">
                Cyber<span className="text-secondary">Labs</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                    isActive(link.path)
                      ? 'bg-primary/5 text-primary'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right actions (auth details / login buttons) */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-2 pr-3 border border-slate-200 hover:border-primary/30 transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                    {user.username.substring(0, 2)}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-slate-800 leading-none">{user.username}</div>
                    <div className="text-[10px] text-secondary font-bold leading-none mt-0.5">{user.points} pts</div>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-danger transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-light transition-all hover:scale-[1.02]"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Hamburger Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-2 pt-2 pb-4 space-y-1 shadow-inner">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-base font-medium rounded-lg transition-colors ${
                  isActive(link.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.name}
              </Link>
            );
          })}
          
          <div className="border-t border-slate-100 pt-4 mt-4 px-3">
            {isAuthenticated && user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm uppercase">
                    {user.username.substring(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm leading-tight">{user.username}</div>
                    <div className="text-secondary font-bold text-xs leading-none">{user.points} points</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-center text-sm font-semibold text-danger hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full py-2.5 text-center text-sm font-semibold text-slate-700 hover:text-primary"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-light"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
