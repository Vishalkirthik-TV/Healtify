import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { setAuthToken } from '../lib/api';
import logo from '../assets/linzo-logo.png';
import landingImg1 from '../assets/linzo-landing-img2.png';

const LandingPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const response = await api.get('/auth/me');
                    setUser(response.data.user);
                }
            } catch (error) {
                console.log("Not logged in");
            }
        };
        fetchUser();

        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        setAuthToken(null);
        setUser(null);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50/50 to-purple-50 flex flex-col font-sans overflow-x-hidden">
            {/* Header */}
            <header
                className={`fixed top-0 z-50 w-full flex justify-center transition-all duration-500 ease-in-out ${scrolled ? 'pt-4 pb-2' : 'pt-0'
                    }`}
            >
                <div
                    className={`
                        w-full transition-all duration-500 ease-in-out flex items-center justify-between
                        ${scrolled
                            ? 'max-w-[95%] sm:max-w-7xl mx-auto bg-white/80 backdrop-blur-xl rounded-full shadow-lg shadow-indigo-500/10 py-2 px-6 sm:px-8'
                            : 'max-w-7xl mx-auto bg-transparent py-4 px-4 sm:px-6 lg:px-8'
                        }
                    `}
                >
                    <div className="flex items-center gap-3">
                        <div className="h-[40px] sm:h-[45px] w-auto flex items-center justify-center transition-transform hover:scale-105 cursor-pointer" onClick={() => navigate('/')}>
                            <img src={logo} alt="Linzo Logo" className="w-full h-full object-contain drop-shadow-sm" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-6">
                        {user ? (
                            <div className="flex items-center gap-3 sm:gap-4 animate-fade-in">
                                <Link to="/dashboard" className="hidden sm:block text-sm font-semibold text-gray-700 hover:text-[#684CFE] transition-colors relative group">
                                    Dashboard
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#684CFE] transition-all duration-300 group-hover:w-full"></span>
                                </Link>
                                <div className="relative group z-50">
                                    <button
                                        onClick={() => navigate('/profile')}
                                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#684CFE] to-[#9F7AEA] text-white flex items-center justify-center text-sm font-bold ring-2 ring-white shadow-md transition-transform hover:scale-105 hover:shadow-lg cursor-pointer transform"
                                    >
                                        {user.name?.[0] || 'U'}
                                    </button>
                                    {/* Dropdown with invisible bridge */}
                                    <div className="absolute right-0 top-full pt-4 w-60 hidden group-hover:block z-50 animate-fade-in-up">
                                        <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl py-2 border border-white/50 overflow-hidden ring-1 ring-black/5">
                                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                                                <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            </div>
                                            <Link
                                                to="/profile"
                                                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-[#684CFE] transition-colors font-medium"
                                            >
                                                👤 View Profile
                                            </Link>
                                            <Link
                                                to="/dashboard"
                                                className="block sm:hidden px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-[#684CFE] transition-colors font-medium"
                                            >
                                                📊 Dashboard
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                                            >
                                                🚪 Log out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 sm:gap-4 animate-fade-in">
                                <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-[#684CFE] transition-colors hidden sm:block relative group">
                                    Log in
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#684CFE] transition-all duration-300 group-hover:w-full"></span>
                                </Link>
                                <Link to="/register" className="px-5 py-2 sm:py-2.5 text-sm font-bold text-white bg-[#684CFE] hover:bg-[#5839f2] rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-indigo-500/40 active:scale-95">
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full">
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 lg:pt-32 lg:pb-32 overflow-hidden bg-white">

                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center lg:items-center gap-12 lg:gap-20">
                        {/* Left: Text Content */}
                        <div className="flex-1 text-center lg:text-left pt-8 lg:pt-0">
                            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 ring-1 ring-indigo-200 bg-white/60 backdrop-blur-sm text-sm font-medium text-[#684CFE] mb-6 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#684CFE] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#684CFE]"></span>
                                </span>
                                The Future of Inclusive Meetings
                            </div>

                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.15] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                AI Communication <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#684CFE] to-[#b794f4]">for Everyone</span>
                            </h1>

                            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                Experience real-time sign language avatars, multilingual translation, and AI summaries. Connect without barriers.
                            </p>

                            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                                <Link
                                    to={user ? "/dashboard" : "/login"}
                                    className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#684CFE] to-[#5839f2] hover:bg-gradient-to-l rounded-2xl shadow-xl shadow-indigo-500/30 transition-all transform hover:-translate-y-1 hover:shadow-2xl active:translate-y-0"
                                >
                                    Start Meeting Now
                                </Link>
                                <button className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-slate-700 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-2xl transition-all shadow-sm hover:shadow-md">
                                    Watch Demo
                                </button>
                            </div>

                            {/* Trust badging / Social Proof could go here */}
                            <div className="mt-12 flex items-center justify-center lg:justify-start gap-4 opacity-60 grayscale hover:grayscale-0 transition-all duration-500 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                                {/* Placeholders for partner logos if needed */}
                            </div>
                        </div>

                        {/* Right: Hero Image */}
                        <div className="flex-1 w-full max-w-xl lg:max-w-none relative flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: '0.5s' }}>
                            <div className="relative w-full aspect-square max-w-md lg:max-w-lg">
                                {/* Decorative circle */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full blur-2xl opacity-40"></div>
                                <img
                                    src={landingImg1}
                                    alt="Linzo Meet Interface Preview"
                                    className="relative w-full h-auto object-contain z-10"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Modules */}
                <section className="py-24 bg-white/50 backdrop-blur-sm relative">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16 animate-fade-in-up">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Powerful Features</h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Everything you need for accessible, seamless communication in one platform.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">

                            {/* Meeting Summary */}
                            <div className="group relative p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100/50 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 transform hover:-translate-y-2 cursor-pointer overflow-hidden" onClick={() => navigate('/summary-call')}>
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-[#684CFE] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:bg-[#684CFE] group-hover:text-white transition-all duration-500">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-[#684CFE] transition-colors">Smart Summary</h3>
                                    <p className="text-slate-600 leading-relaxed mb-6 group-hover:text-slate-700">
                                        AI-generated real-time summaries updated every 15 seconds. Capture every decision without taking a single note.
                                    </p>
                                    <div className="flex items-center text-[#684CFE] font-semibold group-hover:translate-x-2 transition-transform">
                                        Learn more <span className="ml-2">→</span>
                                    </div>
                                </div>
                            </div>

                            {/* Multilingual Translations */}
                            <div className="group relative p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100/50 shadow-lg hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 transform hover:-translate-y-2 cursor-pointer overflow-hidden" onClick={() => navigate('/multicall')}>
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#9F7AEA] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:bg-[#9F7AEA] group-hover:text-white transition-all duration-500">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-[#9F7AEA] transition-colors">Global Voice</h3>
                                    <p className="text-slate-600 leading-relaxed mb-6 group-hover:text-slate-700">
                                        Speak in your language and understand everyone instantly. Breaking language barriers in real-time.
                                    </p>
                                    <div className="flex items-center text-[#9F7AEA] font-semibold group-hover:translate-x-2 transition-transform">
                                        Try translation <span className="ml-2">→</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sign Language Video Call */}
                            <div className="group relative p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100/50 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 transform hover:-translate-y-2 cursor-pointer overflow-hidden" onClick={() => navigate('/dashboard')}>
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-[#684CFE] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:bg-[#684CFE] group-hover:text-white transition-all duration-500">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-[#684CFE] transition-colors">Sign Avatar</h3>
                                    <p className="text-slate-600 leading-relaxed mb-6 group-hover:text-slate-700">
                                        Bi-directional: Speech to 3D Sign Avatar & Sign Gestures to Voice. True inclusivity for the Deaf community.
                                    </p>
                                    <div className="flex items-center text-[#684CFE] font-semibold group-hover:translate-x-2 transition-transform">
                                        Start call <span className="ml-2">→</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                <section className="py-20 bg-[#f8fafc]">
                    {/* Placeholder for testimonials or additional content if needed */}
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-auto opacity-80 hover:opacity-100 transition-opacity">
                            <img src={logo} alt="Linzo Logo" className="w-full h-full object-contain grayscale hover:grayscale-0 transition-all" />
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm">
                        &copy; {new Date().getFullYear()} Linzo Meet. All rights reserved.
                    </p>
                    <div className="flex gap-8 text-sm font-medium text-gray-500">
                        <a href="#" className="hover:text-[#684CFE] transition-colors">Privacy</a>
                        <a href="#" className="hover:text-[#684CFE] transition-colors">Terms</a>
                        <a href="#" className="hover:text-[#684CFE] transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
