import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LinzoLogo from '../assets/linzo-logo.png';

export default function MultiCallLobby() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  // Auto-configure signaling URL from env or default dev logic
  const [signalingUrl] = useState(import.meta.env.VITE_SIGNALING_URL || window.location.origin.replace('5173', '5000'));
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [supportedLanguages, setSupportedLanguages] = useState([
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' }
  ]);

  // Load supported languages from API
  useEffect(() => {
    const loadSupportedLanguages = async () => {
      try {
        const apiUrl = '/api/translate/supported-languages';
        const response = await fetch(apiUrl, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSupportedLanguages(data.languages);
        }
      } catch (error) {
        console.log('⚠️ [LANGUAGES] Could not load supported languages, using defaults:', error.message);
      }
    };
    loadSupportedLanguages();
  }, []);

  const createRoom = () => {
    const id = Math.random().toString(36).slice(2, 10);
    const params = new URLSearchParams();
    if (signalingUrl) params.set('sig', signalingUrl);
    params.set('lang', preferredLanguage);
    const url = `/multicall/room/${id}?${params.toString()}`;
    navigate(url);
  };

  const joinRoom = () => {
    if (!roomCode.trim()) return;
    const id = roomCode.includes('/') ? roomCode.split('/').pop() : roomCode.trim();
    const params = new URLSearchParams();
    if (signalingUrl) params.set('sig', signalingUrl);
    params.set('lang', preferredLanguage);
    const url = `/multicall/room/${id}?${params.toString()}`;
    navigate(url);
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] flex flex-col font-sans">
      {/* Header - Matching Dashboard style */}
      <header className="sticky top-0 z-10 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src={LinzoLogo} alt="Linzo Logo" className="h-[45px] sm:h-[55px] w-auto" />
            </a>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar justify-center sm:justify-start">
            <a href="/summary-call" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#684CFE] rounded-lg transition-colors">Summary Call</a>
            <a href="/multicall" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-medium text-[#684CFE] bg-[#684CFE]/10 rounded-lg transition-colors">Multilingual</a>
            <a href="/dashboard" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#684CFE] rounded-lg transition-colors">Sign Language</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6">
        <div className="mx-auto max-w-7xl py-10">
          {/* Hero Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-[#684CFE]/30 text-xs font-medium text-[#684CFE] bg-[#684CFE]/10 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#684CFE]/60 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#684CFE]"></span>
              </span>
              Real-time multilingual updates
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Breaking Language Barriers
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Connect with anyone, anywhere. Real-time speech translation in multiple languages with automatic text-to-speech.
            </p>
          </div>

          {/* Main Action Card - Consistent Dashboard Style */}
          <div className="mx-auto max-w-2xl mb-12">
            <div className="relative rounded-2xl p-6 sm:p-8 bg-white ring-1 ring-gray-200 shadow-xl">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#684CFE]/10 text-[#684CFE] mb-4 ring-1 ring-[#684CFE]/20">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Start Multilingual Call</h2>
                <p className="text-slate-600 mt-2">Select your language and start connecting</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Your Preferred Language
                  </label>
                  <div className="relative">
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border-0 bg-slate-50 text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-[#684CFE] transition-all appearance-none cursor-pointer hover:bg-slate-100 font-medium"
                    >
                      {supportedLanguages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name} ({lang.nativeName})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#684CFE]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Your speech will be automatically translated to other participants' languages
                  </p>
                </div>

                <button
                  onClick={createRoom}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#684CFE] hover:bg-[#533bdb] text-white font-semibold py-4 rounded-xl shadow-lg shadow-[#684CFE]/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                      className="flex-1 px-4 py-3.5 rounded-xl border-0 bg-slate-50 text-slate-900 ring-1 ring-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-[#684CFE] transition-all font-medium"
                    />
                    <button
                      onClick={joinRoom}
                      disabled={!roomCode.trim()}
                      className={`inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg transition-all ${!roomCode.trim() ? 'opacity-50 cursor-not-allowed shadow-none' : 'hover:-translate-y-0.5 active:translate-y-0 shadow-slate-200'
                        }`}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
