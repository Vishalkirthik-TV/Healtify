import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { setAuthToken } from '../lib/api';
import logo from '../assets/linzo-logo.png';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };
  const checkPasswordStrength = (password) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) return 'strong';
    return 'medium';
  };
  const getPasswordStrengthColor = (strength) => {
    switch (strength) {
      case 'weak': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'strong': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };
  const getPasswordStrengthText = (strength) => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return '';
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions');
      setLoading(false);
      return;
    }
    try {
      // Legacy MongoDB Auth Registration
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      if (response.data.token) {
        setAuthToken(response.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h2>
          <p className="text-sm text-slate-600 mt-1">Join the future of inclusive video meetings</p>
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
            <label htmlFor="name" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
              placeholder="Enter your email address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
                placeholder="Password"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Confirm</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
                placeholder="Confirm"
              />
            </div>
          </div>

          {passwordStrength && (
            <div className="mt-1">
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                    passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                      'w-full bg-green-500'
                    }`}
                />
              </div>
              <p className={`text-xs mt-1 text-right ${getPasswordStrengthColor(passwordStrength)}`}>
                {getPasswordStrengthText(passwordStrength)}
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 pt-1">
            <div className="flex h-5 items-center">
              <input
                id="agree-terms"
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#684CFE] focus:ring-[#684CFE]"
              />
            </div>
            <label htmlFor="agree-terms" className="text-xs text-slate-600 leading-tight pt-0.5">
              I agree to the <a href="#" className="font-medium text-[#684CFE] hover:text-[#533bdb] transition-colors">Terms</a> and <a href="#" className="font-medium text-[#684CFE] hover:text-[#533bdb] transition-colors">Privacy Policy</a>
            </label>
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
                Creating...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Or sign up with</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <span className="text-lg">G</span>
            <span className="text-xs font-medium text-slate-700">Google</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-[#684CFE] hover:text-[#533bdb] transition-colors">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
