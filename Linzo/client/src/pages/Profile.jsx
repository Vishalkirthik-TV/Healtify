import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { setAuthToken } from '../lib/api';
import LinzoLogo from '../assets/linzo-logo.png';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data?.user || res.data);
      } catch (e) {
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  const logout = () => {
    setAuthToken(null);
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#684CFE] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] overflow-hidden relative font-sans text-slate-900">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#684CFE]/20 rounded-full blur-3xl opacity-60"></div>
      </div>

      <header className="relative z-10 w-full flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <img src={LinzoLogo} alt="Linzo Profile" className="h-[45px] sm:h-[55px] w-auto" />
        </div>
        <Link
          to="/dashboard"
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-[#684CFE]/30 transition-all duration-200"
        >
          <svg className="w-4 h-4 text-slate-500 group-hover:text-[#684CFE] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium text-slate-600 group-hover:text-[#684CFE]">Dashboard</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 sm:p-12 transition-all duration-300">

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden shadow-2xl shadow-[#684CFE]/30 ring-4 ring-white transition-transform duration-300 group-hover:scale-[1.02]">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#684CFE] to-purple-600 flex items-center justify-center">
                    <span className="text-5xl font-bold text-white opacity-90 select-none">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              {/* Status Badge */}
              <div className="absolute -bottom-3 left-1/2 sm:left-auto sm:right-[-10px] transform -translate-x-1/2 sm:translate-x-0">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-lg border border-white/50 backdrop-blur-md ${user?.isFirebaseUser ? 'bg-orange-100/90 text-orange-700' : 'bg-emerald-100/90 text-emerald-700'}`}>
                  <span className={`w-2 h-2 rounded-full ${user?.isFirebaseUser ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
                  {user?.isFirebaseUser ? 'Firebase' : 'Database'}
                </span>
              </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 text-center sm:text-left space-y-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                  {user?.name || 'User'}
                </h1>
                <p className="text-slate-500 font-medium text-lg mt-1">{user?.email}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center sm:items-start">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Account Type</span>
                  <span className="text-sm font-semibold text-slate-700 capitalize">{user?.isFirebaseUser ? 'Social / Email' : 'Standard'}</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center sm:items-start">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Member Since</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recently'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <p className="text-sm text-slate-400 text-center sm:text-left">
                User ID: <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 select-all">{user?._id}</code>
              </p>

              <button
                onClick={logout}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-rose-50 text-rose-600 font-semibold hover:bg-rose-100 hover:text-rose-700 hover:shadow-lg hover:shadow-rose-100 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
