import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Brand section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Cyber<span className="text-secondary">Labs</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              Learn cybersecurity hands-on. Experience real-world vulnerability scenarios, network troubleshooting, and SOC log analysis.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to={isAuthenticated ? "/dashboard" : "/"} className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/challenges" className="hover:text-primary transition-colors">
                  Challenges
                </Link>
              </li>
              <li>
                <Link to="/scoreboard" className="hover:text-primary transition-colors">
                  Scoreboard
                </Link>
              </li>
              {!isAuthenticated && (
                <>
                  <li>
                    <Link to="/login" className="hover:text-primary transition-colors">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-primary transition-colors">
                      Register
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Community Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Join the fight</h3>
            <p className="text-sm">
              Join thousands of learners mastering security concepts daily through gamified challenges.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors" title="Twitter">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors" title="GitHub">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} CyberLabs CTF Platform. All rights reserved.
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            Built for security education with <Heart className="h-3.5 w-3.5 text-red-500 fill-current" />
          </p>
        </div>
      </div>
    </footer>
  );
};
