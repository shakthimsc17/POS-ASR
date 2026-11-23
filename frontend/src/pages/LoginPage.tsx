import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shirt, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const user = await login(username, password);
      
      // Auto-route: Salesperson straight to POS fast billing, Admin to Dashboard
      if (user.role === 'SALESPERSON') {
        navigate('/pos');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Banner */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-15">
            <Shirt className="w-36 h-36" />
          </div>
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-4 shadow-inner">
            <Shirt className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">ASRTEX POS</h2>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            Textile & Readymade Retail Management
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900">Welcome Back</h3>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your employee account to start billing
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or sales"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In to POS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
            <p>Demo Accounts:</p>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              Admin: <span className="font-bold text-slate-700">admin</span> / <span className="text-slate-700">admin123</span> &nbsp;|&nbsp; Sales: <span className="font-bold text-slate-700">sales</span> / <span className="text-slate-700">sales123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
