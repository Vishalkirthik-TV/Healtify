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

    const features = [
        {
            title: 'Smart Summary',
            description: 'AI-generated real-time summaries updated every 15 seconds. Capture every decision without taking a single note.',
            icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: '#684CFE',
            bgColor: '#F0ECFF',
            route: '/summary-call',
            cta: 'Learn more',
        },
        {
            title: 'Global Voice',
            description: 'Speak in your language and understand everyone instantly. Breaking language barriers in real-time.',
            icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
            ),
            color: '#0EA5E9',
            bgColor: '#E0F2FE',
            route: '/multicall',
            cta: 'Try translation',
        },
        {
            title: 'Sign Avatar',
            description: 'Bi-directional: Speech to 3D Sign Avatar & Sign Gestures to Voice. True inclusivity for the Deaf community.',
            icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            ),
            color: '#10B981',
            bgColor: '#D1FAE5',
            route: '/dashboard',
            cta: 'Start call',
        },
    ];

    const stats = [
        { value: '50+', label: 'Languages' },
        { value: '99.9%', label: 'Uptime' },
        { value: '<200ms', label: 'Latency' },
        { value: '10k+', label: 'Meetings' },
    ];

    return (
        <div className="min-h-screen bg-[#FAFBFC] flex flex-col font-sans overflow-x-hidden">
            {/* ────────────────────── HEADER ─────────────────────── */}
            <header
                className={`fixed top-0 z-50 w-full flex justify-center transition-all duration-500 ease-in-out ${scrolled ? 'pt-3 pb-1' : 'pt-0'}`}
            >
                <div
                    className={`
                        w-full transition-all duration-500 ease-in-out flex items-center justify-between
                        ${scrolled
                            ? 'max-w-[95%] sm:max-w-7xl mx-auto bg-white/95 backdrop-blur-sm rounded-full shadow-[0_2px_20px_rgba(0,0,0,0.06)] py-2.5 px-6 sm:px-8 border border-gray-100'
                            : 'max-w-7xl mx-auto bg-transparent py-5 px-4 sm:px-6 lg:px-8'
                        }
                    `}
                >
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <img src={logo} alt="Linzo" className="h-[38px] sm:h-[42px] w-auto object-contain" />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-5">
                        {user ? (
                            <div className="flex items-center gap-3 sm:gap-4 animate-fade-in">
                                <Link to="/dashboard" className="hidden sm:block text-sm font-semibold text-gray-600 hover:text-[#684CFE] transition-colors">
                                    Dashboard
                                </Link>
                                <div className="relative group z-50">
                                    <button
                                        onClick={() => navigate('/profile')}
                                        className="w-10 h-10 rounded-full bg-[#684CFE] text-white flex items-center justify-center text-sm font-bold shadow-sm transition-transform hover:scale-105 cursor-pointer"
                                    >
                                        {user.name?.[0] || 'U'}
                                    </button>
                                    <div className="absolute right-0 top-full pt-3 w-56 hidden group-hover:block z-50 animate-fade-in-up">
                                        <div className="bg-white rounded-2xl shadow-xl py-1.5 border border-gray-100 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/80">
                                                <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            </div>
                                            <Link
                                                to="/profile"
                                                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#684CFE] transition-colors font-medium"
                                            >
                                                👤 View Profile
                                            </Link>
                                            <Link
                                                to="/dashboard"
                                                className="block sm:hidden px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#684CFE] transition-colors font-medium"
                                            >
                                                📊 Dashboard
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/80 transition-colors font-medium"
                                            >
                                                🚪 Log out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 sm:gap-4 animate-fade-in">
                                <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-[#684CFE] transition-colors hidden sm:block">
                                    Log in
                                </Link>
                                <Link to="/register" className="px-5 py-2.5 text-sm font-bold text-white bg-[#684CFE] hover:bg-[#5839f2] rounded-full shadow-sm transition-all hover:shadow-md active:scale-95">
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ────────────────────── MAIN CONTENT ─────────────────────── */}
            <main className="flex-1 w-full">
                {/* ─── HERO SECTION ─── */}
                <section className="relative pt-32 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
                    {/* Subtle background shapes */}
                    <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-[#684CFE]/5 blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#0EA5E9]/5 blur-3xl pointer-events-none"></div>

                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center lg:items-center gap-12 lg:gap-16">
                        {/* Left: Text */}
                        <div className="flex-1 text-center lg:text-left pt-4 lg:pt-0">
                            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-[#F0ECFF] text-sm font-semibold text-[#684CFE] mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#684CFE] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#684CFE]"></span>
                                </span>
                                The Future of Inclusive Meetings
                            </div>

                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.2rem] font-extrabold tracking-tight text-[#0F172A] mb-6 leading-[1.1] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                AI Communication <br className="hidden md:block" />
                                <span className="text-[#684CFE]">for Everyone</span>
                            </h1>

                            <p className="mt-5 text-lg sm:text-xl text-[#64748B] max-w-xl mx-auto lg:mx-0 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                Real-time sign language avatars, multilingual translation, and AI summaries — connect without barriers.
                            </p>

                            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                                <Link
                                    to={user ? "/dashboard" : "/login"}
                                    className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-white bg-[#684CFE] hover:bg-[#5839f2] rounded-xl shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                                >
                                    Start Meeting Now
                                </Link>
                                <Link
                                    to="/demo"
                                    className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-[#0F172A] bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm"
                                >
                                    Watch Demo
                                </Link>
                            </div>

                            {/* Stats bar */}
                            <div className="mt-14 flex items-center justify-center lg:justify-start gap-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                                {stats.map((stat, i) => (
                                    <div key={i} className="text-center lg:text-left">
                                        <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">{stat.value}</p>
                                        <p className="text-xs sm:text-sm text-[#94A3B8] font-medium mt-0.5">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Hero Image */}
                        <div className="flex-1 w-full max-w-xl lg:max-w-none relative flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: '0.5s' }}>
                            <div className="relative w-full max-w-md lg:max-w-lg">
                                <div className="absolute -inset-4 bg-[#684CFE]/6 rounded-3xl blur-2xl"></div>
                                <img
                                    src={landingImg1}
                                    alt="Linzo Meeting Interface"
                                    className="relative w-full h-auto object-contain z-10 drop-shadow-lg"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── FEATURES SECTION ─── */}
                <section className="py-24 bg-white relative">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16 animate-fade-in-up">
                            <p className="text-sm font-bold text-[#684CFE] tracking-wide uppercase mb-3">Features</p>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mb-4">Everything in One Platform</h2>
                            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">Accessible, seamless communication tools that make every meeting inclusive.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                            {features.map((feature, i) => (
                                <div
                                    key={i}
                                    onClick={() => navigate(feature.route)}
                                    className="group relative p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                                >
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
                                        style={{ backgroundColor: feature.bgColor, color: feature.color }}
                                    >
                                        {feature.icon}
                                    </div>
                                    <h3
                                        className="text-xl font-bold text-[#0F172A] mb-3 transition-colors group-hover:text-[${feature.color}]"
                                        style={{ '--hover-color': feature.color }}
                                    >
                                        {feature.title}
                                    </h3>
                                    <p className="text-[#64748B] leading-relaxed mb-6 text-[15px]">
                                        {feature.description}
                                    </p>
                                    <div
                                        className="flex items-center font-semibold text-sm group-hover:translate-x-1 transition-transform"
                                        style={{ color: feature.color }}
                                    >
                                        {feature.cta} <span className="ml-2 text-base">→</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── HOW IT WORKS ─── */}
                <section className="py-24 bg-[#FAFBFC]">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <p className="text-sm font-bold text-[#0EA5E9] tracking-wide uppercase mb-3">How It Works</p>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mb-4">Three Steps to Inclusive Meetings</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { step: '01', title: 'Create a Room', desc: 'Start or join a meeting with a single click. Share the room link with participants.', color: '#684CFE' },
                                { step: '02', title: 'Enable AI Tools', desc: 'Turn on sign language avatars, live translation, or AI summaries as needed.', color: '#0EA5E9' },
                                { step: '03', title: 'Communicate Freely', desc: 'Everyone participates equally — regardless of language or hearing ability.', color: '#10B981' },
                            ].map((item, i) => (
                                <div key={i} className="text-center lg:text-left">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-5 text-lg font-extrabold text-white" style={{ backgroundColor: item.color }}>
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl font-bold text-[#0F172A] mb-3">{item.title}</h3>
                                    <p className="text-[#64748B] leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── CTA SECTION ─── */}
                <section className="py-20 bg-[#0F172A]">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5">
                            Ready to Make Every Voice Heard?
                        </h2>
                        <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-10">
                            Join thousands of teams using Linzo to create truly inclusive meeting experiences.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to={user ? "/dashboard" : "/register"}
                                className="px-8 py-4 text-base font-bold text-[#0F172A] bg-white hover:bg-gray-100 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                            >
                                Get Started Free
                            </Link>
                            <Link
                                to="/demo"
                                className="px-8 py-4 text-base font-semibold text-white border border-white/20 hover:border-white/40 rounded-xl transition-all"
                            >
                                See it in Action
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* ────────────────────── FOOTER ─────────────────────── */}
            <footer className="bg-white border-t border-gray-100 py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Linzo" className="h-9 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-gray-400 text-sm">
                        &copy; {new Date().getFullYear()} Linzo. All rights reserved.
                    </p>
                    <div className="flex gap-8 text-sm font-medium text-gray-400">
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
