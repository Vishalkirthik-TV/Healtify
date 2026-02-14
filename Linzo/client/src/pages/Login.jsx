import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { setAuthToken } from '../lib/api';
import logo from '../assets/linzo-logo.png';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Legacy MongoDB Auth Login
      const response = await api.post('/auth/login', formData);
      if (response.data.token) {
        setAuthToken(response.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 font-sans py-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl shadow-indigo-100/50 px-6 py-6 sm:px-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-28 w-auto mb-4">
            <img src={logo} alt="Linzo Logo" className="h-full w-auto object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-sm text-slate-600 mt-1">Sign in to your Linzo Meet account</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#684CFE] focus:border-[#684CFE] transition-all bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#684CFE] focus:border-[#684CFE] transition-all bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 select-none cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#684CFE] focus:ring-[#684CFE]" />
              <span className="text-xs text-slate-600">Remember me</span>
            </label>
            <a href="#" className="text-xs font-medium text-[#684CFE] hover:text-[#533bdb] transition-colors">Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl bg-[#684CFE] hover:bg-[#533bdb] active:bg-[#4a34c9] text-white font-semibold py-3 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Or continue with</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <span className="text-lg">G</span>
            <span className="text-xs font-medium text-slate-700">Google</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#684CFE] hover:text-[#533bdb] transition-colors">Sign up</Link>
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <div className="flex justify-center gap-4 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            <span className="flex items-center gap-1"><span className="text-[#684CFE]">✓</span> HD Video</span>
            <span className="flex items-center gap-1"><span className="text-[#684CFE]">✓</span> Sign Language</span>
            <span className="flex items-center gap-1"><span className="text-[#684CFE]">✓</span> Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
