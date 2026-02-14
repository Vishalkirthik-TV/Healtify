import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import LinzoLogo from '../assets/linzo-logo.png';
import DashboardCarousel from '../components/DashboardCarousel';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetingCode, setMeetingCode] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user || response.data);
      } catch (error) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [navigate]);

  const createMeeting = () => {
    const roomId = Math.random().toString(36).substring(7);
    navigate(`/integrated-room/${roomId}`);
  };

  const joinMeeting = () => {
    if (meetingCode.trim()) {
      const roomId = meetingCode.split('/').pop();
      navigate(`/integrated-room/${roomId}`);
    }
  };

  const menuItems = [
    { name: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', path: '/dashboard', active: true },
    { name: 'Multi-Lingual', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129', path: '/multicall' },
    { name: 'Summary', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', path: '/summary-call' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFF]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#684CFE]/20 border-t-[#684CFE] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] selection:bg-[#684CFE] selection:text-white font-sans text-slate-800 overflow-hidden relative">

      {/* 1. Background Ambience (Animated Blobs) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* 2. Floating Sidebar (Glassmorphism) */}
      <aside className="fixed bottom-4 left-4 right-4 md:top-4 md:bottom-4 md:w-20 lg:w-64 md:right-auto z-50 glass-panel rounded-[2rem] shadow-2xl shadow-slate-200/50 flex flex-row md:flex-col justify-between items-center md:items-stretch py-2 px-4 md:py-8 md:px-0 md:border-r-0 border border-white/60">

        {/* Logo Area */}
        <div className="hidden md:flex flex-col items-center mb-8 gap-3">
          <div className="p-2 bg-gradient-to-br from-[#684CFE] to-blue-500 rounded-2xl shadow-lg shadow-[#684CFE]/30">
            <img src={LinzoLogo} alt="Linzo" className="w-8 h-8 brightness-0 invert" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">Linzo</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 w-full flex md:flex-col justify-around md:justify-center gap-2 md:gap-4 md:px-4">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`group relative flex items-center md:gap-3 p-3 md:px-4 md:py-3 rounded-2xl transition-all duration-300 ${item.active
                  ? 'bg-[#684CFE] text-white shadow-xl shadow-[#684CFE]/30 scale-105'
                  : 'text-slate-500 hover:bg-white/50 hover:text-[#684CFE]'
                }`}
            >
              <svg className={`w-6 h-6 ${item.active ? 'stroke-2' : 'stroke-[1.5]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className={`hidden lg:block text-sm font-medium ${item.active ? 'font-semibold' : ''}`}>{item.name}</span>

              {/* Hover Tooltip for Tablet */}
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 hidden md:block lg:hidden pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.name}
              </div>
            </button>
          ))}
        </nav>

        {/* User Profile (Bottom of Sidebar) */}
        <div className="hidden md:flex flex-col items-center mt-auto pt-6 border-t border-slate-200/30 md:px-4">
          <button onClick={() => navigate('/profile')} className="flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-white/50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-pink-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-tr from-orange-400 to-pink-500">
                  {user?.name?.[0]?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="hidden lg:block text-left overflow-hidden">
              <p className="text-sm font-bold text-slate-700 truncate group-hover:text-[#684CFE] transition-colors">{user?.name?.split(' ')[0]}</p>
              <p className="text-[10px] text-slate-400 font-medium">View Profile</p>
            </div>
          </button>
        </div>
      </aside>

      {/* 3. Main Content Area */}
      <main className="relative z-10 flex-1 md:ml-20 lg:ml-64 p-6 md:p-10 lg:p-12 pb-24 md:pb-12 min-h-screen flex flex-col">

        {/* Header (Top Right) */}
        <header className="flex justify-between md:justify-end items-center mb-8 md:mb-12">

          {/* Mobile Logo */}
          <div className="flex md:hidden items-center gap-2">
            <img src={LinzoLogo} alt="Linzo" className="w-8 h-8" />
            <span className="font-bold text-lg text-slate-800">Linzo</span>
          </div>

          <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-4 shadow-sm">
            <span className="hidden sm:block text-sm font-medium text-slate-500">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="w-px h-4 bg-slate-300 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              {/* Mobile: Small Avatar */}
              <button onClick={() => navigate('/profile')} className="md:hidden w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-pink-500 p-[1.5px]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <span className="text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Hero & Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-7xl mx-auto w-full">

          {/* Left: Content */}
          <div className="space-y-10 animate-fade-in-up">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#684CFE]/10 text-[#684CFE] text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#684CFE] animate-pulse"></span>
                Live Translation Capable
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                Connect <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#684CFE] to-blue-500">Without Limits</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-500 max-w-lg leading-relaxed">
                The world's most inclusive meeting platform. Real-time Sign Language interpretation and multilingual voice translation.
              </p>
            </div>

            {/* Action Card: Glass Effect */}
            <div className="glass-panel p-2 rounded-[2rem] shadow-xl shadow-[#684CFE]/10 max-w-md">
              <div className="bg-white/50 rounded-[1.5rem] p-6 space-y-6 border border-white/50">

                {/* New Meeting Button */}
                <button
                  onClick={createMeeting}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#684CFE] to-blue-600 p-[1px] shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 hover:scale-[1.02]"
                >
                  <div className="relative flex items-center justify-between bg-transparent px-6 py-4 transition-all group-hover:bg-white/10">
                    <div className="flex items-center gap-4 text-white">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-lg">New Meeting</span>
                        <span className="text-blue-100 text-sm opacity-90">Start an instant room</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>

                {/* Join Input */}
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400 group-focus-within:text-[#684CFE] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <input
                      type="text"
                      value={meetingCode}
                      onChange={(e) => setMeetingCode(e.target.value)}
                      placeholder="Enter room code"
                      className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#684CFE]/20 focus:border-[#684CFE] transition-all"
                    />
                  </div>
                  <button
                    onClick={joinMeeting}
                    disabled={!meetingCode.trim()}
                    className={`px-6 rounded-xl font-bold transition-all ${meetingCode.trim()
                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:-translate-y-0.5'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                  >
                    Join
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* Right: Creative Visual (Carousel) */}
          <div className="relative hidden lg:block animate-fade-in animation-delay-200">
            {/* Decorative Elements behind carousel */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/30 backdrop-blur-3xl rounded-full z-0"></div>

            <div className="relative z-10 glass-panel p-8 rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-white/80 transform rotate-1 hover:rotate-0 transition-transform duration-700">
              <DashboardCarousel />
            </div>

            {/* Floating Badges */}
            <div className="absolute -top-10 -right-10 glass-card p-4 rounded-2xl animate-float animation-delay-2000 hidden xl:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Secure</p>
                  <p className="text-[10px] text-slate-500">End-to-end</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-10 -left-16 glass-card p-4 rounded-2xl animate-float hidden xl:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9" /></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Global</p>
                  <p className="text-[10px] text-slate-500">Translation</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
};

export default Dashboard;
