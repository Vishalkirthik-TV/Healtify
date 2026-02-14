import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LinzoLogo from '../assets/linzo-logo.png';

export default function SummaryCallLobby() {
    const navigate = useNavigate();
    const [roomCode, setRoomCode] = useState('');
    // Auto-configure signaling URL from env or default dev logic
    const [signalingUrl] = useState(import.meta.env.VITE_SIGNALING_URL || window.location.origin.replace('5173', '5000'));

    const createRoom = () => {
        const id = Math.random().toString(36).slice(2, 10);
        const params = new URLSearchParams();
        if (signalingUrl) params.set('sig', signalingUrl);
        const url = `/summary-call/room/${id}?${params.toString()}`;
        navigate(url);
    };

    const joinRoom = () => {
        if (!roomCode.trim()) return;
        const id = roomCode.includes('/') ? roomCode.split('/').pop() : roomCode.trim();
        const params = new URLSearchParams();
        if (signalingUrl) params.set('sig', signalingUrl);
        const url = `/summary-call/room/${id}?${params.toString()}`;
        navigate(url);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
            {/* Header - Matching Dashboard style */}
            <header className="sticky top-0 z-10 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <img src={LinzoLogo} alt="Linzo Logo" className="h-[45px] sm:h-[55px] w-auto" />
                        </a>
                    </div>
                    <nav className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar justify-center sm:justify-start">
                        <a href="/summary-call" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-medium text-[#684CFE] bg-[#684CFE]/10 rounded-lg transition-colors">Summary</a>
                        <a href="/summary-call/history" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#684CFE] rounded-lg transition-colors">History</a>
                        <a href="/dashboard" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#684CFE] rounded-lg transition-colors">Sign Language</a>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full px-4 sm:px-6">
                <div className="mx-auto max-w-7xl py-10">
                    {/* Hero Section */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-[#684CFE]/20 text-xs font-medium text-[#684CFE] bg-[#684CFE]/10 mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#684CFE]/60 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#684CFE]"></span>
                            </span>
                            Real-time Summary Call communication
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
                            Smart Meeting Summaries
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            Connect with your team and get automatic meeting summaries, action items, and transcripts.
                        </p>
                    </div>

                    {/* Main Action Card */}
                    <div className="mx-auto max-w-2xl">
                        <div className="relative rounded-3xl p-8 bg-white ring-1 ring-slate-200 shadow-xl shadow-[#684CFE]/30">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#684CFE]/10 text-[#684CFE] mb-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Start Summary Call</h2>
                                <p className="text-slate-600 mt-2">Create a new room or join an existing one</p>
                            </div>

                            <div className="space-y-6">
                                {/* Signaling Server URL logic is now hidden/automated */}

                                <button
                                    onClick={createRoom}
                                    className="w-full inline-flex items-center justify-center gap-2 bg-[#684CFE] hover:bg-[#533bdb] text-white font-semibold py-4 rounded-xl shadow-lg shadow-[#684CFE]/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    Create New Room
                                </button>

                                <div className="relative my-8">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-slate-500 font-medium">or join existing</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Join Existing Room
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={roomCode}
                                            onChange={(e) => setRoomCode(e.target.value)}
                                            placeholder="Enter room code or link"
                                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#684CFE] focus:border-[#684CFE] transition-all"
                                        />
                                        <button
                                            onClick={joinRoom}
                                            disabled={!roomCode.trim()}
                                            className={`inline-flex items-center justify-center gap-2 bg-[#684CFE] hover:bg-[#533bdb] text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-all ${!roomCode.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0 shadow-[#684CFE]/30'
                                                }`}
                                        >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M5 12h14M12 5l7 7-7 7" />
                                            </svg>
                                            Join
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
