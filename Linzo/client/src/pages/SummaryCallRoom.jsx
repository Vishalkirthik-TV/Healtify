import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../lib/api';
import LinzoLogo from '../assets/linzo-logo.png';

export default function SummaryCallRoom() {
    const { roomId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const [participants, setParticipants] = useState([]); // {id, stream}
    const [muted, setMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [userName, setUserName] = useState(''); // Store real user name
    const userNameRef = useRef('');

    // Keep ref in sync
    useEffect(() => {
        userNameRef.current = userName;
    }, [userName]);

    // ... (rest of state)

    // ...



    // Transcript State
    const [captions, setCaptions] = useState([]); // {id, text, speaker, timestamp}
    const [isSpeechActive, setIsSpeechActive] = useState(false);
    const [socketStatus, setSocketStatus] = useState('Disconnected');

    const socketRef = useRef(null);
    const selfIdRef = useRef(null);
    const pcsRef = useRef({});
    const remoteStreamsRef = useRef({});
    const localStreamRef = useRef(null);
    const localVideoRef = useRef(null);
    const speechRecRef = useRef(null);
    const allowSpeechRestartRef = useRef(false);
    const recentTranscriptsRef = useRef([]);

    const signalingUrl = useMemo(() => {
        const userUrl = params.get('sig');
        if (userUrl) return userUrl;
        try {
            const origin = window.location.origin.replace(/\/$/, '');
            return origin.replace(':5173', ':5000');
        } catch {
            return undefined;
        }
    }, [params]);

    // Helper to check for duplicates (Echo cancellation / Same machine testing)
    const isDuplicate = (text, excludeSource) => {
        const now = Date.now();
        // Clean up old entries (> 5 seconds)
        recentTranscriptsRef.current = recentTranscriptsRef.current.filter(t => now - t.timestamp < 5000);

        // Check for similarity
        const normalizedNew = text.toLowerCase().trim();
        return recentTranscriptsRef.current.some(t => {
            if (t.source === excludeSource) return false; // Only check against the OTHER source
            const normalizedExisting = t.text.toLowerCase().trim();
            return normalizedNew.includes(normalizedExisting) || normalizedExisting.includes(normalizedNew);
        });
    };

    // Fetch current user name
    useEffect(() => {
        api.get('/auth/me')
            .then(res => {
                if (res.data.user && res.data.user.name) {
                    setUserName(res.data.user.name);
                }
            })
            .catch(err => console.error('Failed to fetch user profile:', err));
    }, []);

    useEffect(() => {
        socketRef.current = io(signalingUrl || undefined, { withCredentials: true });
        socketRef.current.on('connect', () => {
            selfIdRef.current = socketRef.current.id;
            setSocketStatus('Connected');
            console.log('🔌 WebSocket connected, ID:', selfIdRef.current);

            // Join the meeting on backend for tracking
            api.post(`/meetings/${roomId}/join`, {
                username: 'Participant ' + selfIdRef.current.slice(0, 4)
            }).catch(console.error);
        });

        socketRef.current.on('disconnect', () => {
            setSocketStatus('Disconnected');
            console.log('🔌 WebSocket disconnected');
        });

        socketRef.current.on('user-joined', handleUserJoined);
        socketRef.current.on('user-left', handleUserLeft);
        socketRef.current.on('offer', handleOffer);
        socketRef.current.on('answer', handleAnswer);
        socketRef.current.on('ice-candidate', handleCandidate);

        // Handle meeting ended event
        socketRef.current.on('meeting-ended', () => {
            console.log('🛑 [WEBSOCKET] Meeting ended by host/peer');
            alert('The meeting has been ended.');
            navigate(`/summary-call/${roomId}/details`);
        });

        // Listen for peer transcripts via the existing speech-translation event
        socketRef.current.on('speech-translation', (data) => {
            console.log('🔊 [WEBSOCKET] Received transcript:', data);
            if (data.from !== selfIdRef.current && data.text) {
                // Check for duplicates (if we already captured this locally, or if it's an echo)
                if (isDuplicate(data.text, 'remote')) {
                    console.log('🚫 [DEDUPE] Ignoring remote transcript (duplicate of local):', data.text);
                    return;
                }

                const caption = {
                    id: Date.now() + Math.random(),
                    text: data.text,
                    speaker: data.speakerName || ('Participant ' + data.from.slice(0, 4)),
                    timestamp: new Date().toLocaleTimeString()
                };

                setCaptions(prev => [...prev, caption].slice(-50));
                recentTranscriptsRef.current.push({ text: data.text, source: 'remote', timestamp: Date.now() });
            }
        });

        async function getMediaAndJoin() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.play().catch(() => { });
                }
                if (socketRef.current?.connected) {
                    socketRef.current.emit('join-room', roomId);
                } else {
                    socketRef.current?.once('connect', () => socketRef.current.emit('join-room', roomId));
                }
            } catch (e) {
                console.error(e);
            }
        }
        getMediaAndJoin();

        return () => {
            Object.values(pcsRef.current).forEach(pc => pc.close());
            pcsRef.current = {};
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
            socketRef.current?.disconnect();
            if (speechRecRef.current) speechRecRef.current.stop();
        };
    }, [roomId, signalingUrl]);

    // Enhanced Speech Recognition Setup (matching MultiCallRoom robustness)
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.log('❌ Speech Recognition not supported');
            return;
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        speechRecRef.current = rec;

        rec.onstart = () => {
            console.log('🎤 Speech recognition started');
            setIsSpeechActive(true);
        };

        rec.onend = () => {
            console.log('🎤 Speech recognition ended');
            setIsSpeechActive(false);
            // Auto restart if allowed
            if (allowSpeechRestartRef.current && socketRef.current?.connected) {
                console.log('🎤 Attempting auto-restart...');
                setTimeout(() => {
                    try { rec.start(); } catch (e) { console.error('Restart failed:', e); }
                }, 100);
            }
        };

        rec.onerror = (event) => {
            console.error('🎤 Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                allowSpeechRestartRef.current = false;
                setIsSpeechActive(false);
            }
        };

        rec.onresult = async (event) => {
            const last = event.results.length - 1;
            const text = event.results[last][0].transcript;
            const isFinal = event.results[last].isFinal;

            if (isFinal && text.trim()) {
                console.log('🎤 [SPEECH] Final:', text);

                // Check for duplicates (if this is an echo of a remote message)
                if (isDuplicate(text, 'local')) {
                    console.log('🚫 [DEDUPE] Ignoring local transcript (echo of remote):', text);
                    return;
                }

                // Add to local captions
                const caption = {
                    id: Date.now(),
                    text,
                    speaker: 'You',
                    timestamp: new Date().toLocaleTimeString()
                };
                setCaptions(prev => [...prev, caption].slice(-50));
                recentTranscriptsRef.current.push({ text, source: 'local', timestamp: Date.now() });

                // Broadcast to peers via Socket
                if (socketRef.current?.connected) {
                    socketRef.current.emit('speech-translation', {
                        text: text,
                        sourceLang: 'en', // Defaulting to en for summary call
                        targetLang: 'en',
                        from: selfIdRef.current,
                        speakerName: userNameRef.current // Send real name to peers
                    });
                }

                // Send to backend for summary generation
                try {
                    await fetch(`/api/meetings/${roomId}/transcript`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            speaker: userNameRef.current || ('Participant ' + selfIdRef.current?.slice(0, 4)),
                            text
                        }),
                        credentials: 'include'
                    });
                } catch (err) {
                    console.error('Failed to send transcript:', err);
                }
            }
        };

        // Start initially
        allowSpeechRestartRef.current = true;
        try {
            rec.start();
        } catch (e) {
            console.error('Failed to start speech recognition:', e);
        }

        return () => {
            allowSpeechRestartRef.current = false;
            rec.stop();
        };
    }, [roomId]);

    // WebRTC Handlers
    const buildPeer = (peerId) => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pcsRef.current[peerId] = pc;

        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        pc.ontrack = (e) => {
            let remote = remoteStreamsRef.current[peerId];
            if (!remote) {
                remote = new MediaStream();
                remoteStreamsRef.current[peerId] = remote;
            }
            if (e.track) remote.addTrack(e.track);

            setParticipants(prev => {
                const existing = prev.find(p => p.id === peerId);
                if (existing) return prev.map(p => p.id === peerId ? { ...p, stream: remote } : p);
                return [...prev, { id: peerId, stream: remote }];
            });
        };

        pc.onicecandidate = (ev) => {
            if (ev.candidate) socketRef.current.emit('ice-candidate', { candidate: ev.candidate, to: peerId });
        };

        return pc;
    };

    const handleUserJoined = async (peerId) => {
        console.log('User joined:', peerId, 'Self ID:', selfIdRef.current);
        if (pcsRef.current[peerId]) return;
        const pc = buildPeer(peerId);
        const selfId = selfIdRef.current;

        if (selfId && selfId < peerId) {
            // Offerer creates the offer (Polite Peer strategy)
            console.log('Creating offer for peer:', peerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit('offer', { offer, to: peerId });
        } else {
            console.log('Waiting for offer from peer:', peerId);
        }
    };

    const handleOffer = async ({ offer, from }) => {
        console.log('Received offer from:', from);
        let pc = pcsRef.current[from];
        if (!pc) pc = buildPeer(from);

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit('answer', { answer, to: from });
    };

    const handleAnswer = async ({ answer, from }) => {
        console.log('Received answer from:', from);
        const pc = pcsRef.current[from];
        if (pc) await pc.setRemoteDescription(answer);
    };

    const handleCandidate = async ({ candidate, from }) => {
        const pc = pcsRef.current[from];
        if (pc && candidate) await pc.addIceCandidate(candidate);
    };

    const handleUserLeft = (peerId) => {
        setParticipants(prev => prev.filter(p => p.id !== peerId));
        if (pcsRef.current[peerId]) {
            pcsRef.current[peerId].close();
            delete pcsRef.current[peerId];
        }
    };

    const toggleMic = () => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setMuted(!track.enabled);
        }
    };

    const toggleCam = () => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setCamOff(!track.enabled);
        }
    };

    const endCall = async () => {
        if (window.confirm('Are you sure you want to end the call?')) {
            setIsEnding(true);
            try {
                // Navigate immediately to avoid UI delay perception
                // The server will handle the actual ending and summary generation in background
                await fetch(`/api/meetings/${roomId}/end`, {
                    method: 'POST',
                    credentials: 'include'
                });
                navigate(`/summary-call/${roomId}/details`);
            } catch (error) {
                console.error('Error ending call:', error);
                setIsEnding(false);
                alert('Failed to end meeting. Please try again.');
            }
        }
    };

    const leave = () => {
        navigate('/summary-call');
    };

    return (
        <div className="min-h-screen h-auto lg:h-screen bg-[#f8fafc] flex flex-col font-sans overflow-x-hidden overflow-y-auto lg:overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shadow-sm z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <img src={LinzoLogo} alt="Linzo Logo" className="h-[45px] sm:h-[55px] w-auto" />
                    <div>
                        <h1 className="text-gray-900 font-bold text-lg leading-tight">Summary Call</h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">ID: {roomId}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span className={socketStatus === 'Connected' ? 'text-emerald-600 font-medium' : 'text-red-500'}>
                                {socketStatus}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const url = window.location.href;
                            navigator.clipboard.writeText(url);
                            alert('Link copied to clipboard!');
                        }}
                        className="px-4 py-2 bg-white ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium text-sm transition-colors shadow-sm"
                    >
                        Share Link
                    </button>
                    <button
                        onClick={endCall}
                        disabled={isEnding}
                        className={`px-5 py-2 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 shadow-sm ${isEnding
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                            }`}
                    >
                        {isEnding ? (
                            <>
                                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Ending Meeting...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                                </svg>
                                End & Summarize
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Grid */}
            <main className="flex-1 flex flex-col lg:flex-row p-4 sm:p-6 gap-4 sm:gap-6 overflow-visible lg:overflow-hidden">
                {/* Video Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
                    {/* Local Video */}
                    <div className="relative bg-white ring-1 ring-gray-200 rounded-2xl overflow-hidden shadow-lg">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm font-medium">
                            You {muted && '(Muted)'}
                        </div>
                    </div>

                    {/* Remote Videos */}
                    {participants.map(p => (
                        <div key={p.id} className="relative bg-white ring-1 ring-gray-200 rounded-2xl overflow-hidden shadow-lg">
                            <VideoPlayer stream={p.stream} />
                            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm font-medium">
                                Participant {p.id.slice(0, 4)}
                            </div>
                        </div>
                    ))}

                    {participants.length === 0 && (
                        <div className="bg-white ring-1 ring-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
                            <div className="text-center p-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 font-medium">Waiting for others to join...</p>
                                <p className="text-gray-400 text-sm mt-2">Share the link to invite participants</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Transcript Panel */}
                <aside className="w-full lg:w-96 bg-white ring-1 ring-gray-200 rounded-2xl p-0 flex flex-col shadow-lg overflow-hidden h-[500px] lg:h-auto">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#684CFE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Live Transcript
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isSpeechActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                            <span className="text-xs text-gray-500 font-medium">{isSpeechActive ? 'Listening' : 'Paused'}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/30">
                        {captions.length === 0 ? (
                            <div className="text-center text-gray-400 py-12">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <p className="text-sm">Start speaking to see live captions...</p>
                            </div>
                        ) : (
                            captions.map(c => {
                                const isMe = c.speaker === 'You';
                                return (
                                    <div key={c.id} className={`flex w-full ${isMe ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isMe
                                            ? 'bg-[#684CFE] text-white rounded-tl-none'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-tr-none'
                                            }`}>
                                            <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isMe ? 'text-indigo-200' : 'text-[#684CFE]'}`}>
                                                {c.speaker}
                                            </div>
                                            <p className="text-sm leading-relaxed">{c.text}</p>
                                            <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                {c.timestamp}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>
            </main>

            {/* Controls Bar */}
            <div className="bg-white border-t border-gray-200 p-4">
                <div className="max-w-3xl mx-auto flex justify-center gap-6">
                    <button
                        onClick={toggleMic}
                        className={`p-4 rounded-full transition-all shadow-sm ${muted ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700'}`}
                        title={muted ? "Unmute" : "Mute"}
                    >
                        {muted ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={toggleCam}
                        className={`p-4 rounded-full transition-all shadow-sm ${camOff ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700'}`}
                        title={camOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                        {camOff ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={() => {
                            if (isSpeechActive) {
                                allowSpeechRestartRef.current = false;
                                try { speechRecRef.current?.stop(); } catch { }
                                setIsSpeechActive(false);
                            } else {
                                allowSpeechRestartRef.current = true;
                                try { speechRecRef.current?.start(); } catch { }
                                setIsSpeechActive(true);
                            }
                        }}
                        className={`p-4 rounded-full transition-all shadow-sm ${isSpeechActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        title={isSpeechActive ? "Stop Transcription" : "Start Transcription"}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </button>

                    <button
                        onClick={endCall}
                        className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm shadow-red-200"
                        title="Leave Call"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Simple Video Player Component
function VideoPlayer({ stream }) {
    const ref = useRef();
    useEffect(() => {
        if (ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);
    return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
}
