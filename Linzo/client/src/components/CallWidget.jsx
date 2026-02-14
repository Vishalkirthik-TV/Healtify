import React, { useState, useEffect, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';
import api from '../lib/api';

const CallWidget = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('dialpad'); // dialpad, history
    const [phoneNumber, setPhoneNumber] = useState('');
    const [device, setDevice] = useState(null);
    const [token, setToken] = useState(null);
    const [callStatus, setCallStatus] = useState('idle'); // idle, connecting, connected, disconnecting
    const [activeCall, setActiveCall] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    const [callLogs, setCallLogs] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const durationIntervalRef = useRef(null);

    // Initialize Twilio Device
    useEffect(() => {
        if (isOpen && !device) {
            setupDevice();
        }
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen]);

    const setupDevice = async () => {
        try {
            const response = await api.get('/twilio/token');
            const data = response.data;
            setToken(data.token);

            const newDevice = new Device(data.token, {
                codecPreferences: ['opus', 'pcmu'],
                fakeLocalDTMF: true,
                enableRingingState: true
            });

            newDevice.on('ready', () => console.log('📞 Twilio Device ready'));
            newDevice.on('error', (error) => {
                console.error('📞 Twilio Device error:', error);
                // alert(`Twilio Device Error: ${error.message}`); // Optional: alert on device error
            });

            // Handle incoming calls
            newDevice.on('incoming', (conn) => {
                setCallStatus('incoming');
                setActiveCall(conn);

                conn.on('accept', () => {
                    setCallStatus('connected');
                    startDurationTimer();
                });

                conn.on('disconnect', () => {
                    handleDisconnect();
                });

                // Auto-reject incoming for now logic or show UI popup? 
                // For this widget, let's assume we handle outbound primarily but show connecting UI for inbound
            });

            setDevice(newDevice);
        } catch (error) {
            console.error('Failed to setup Twilio device:', error);
            alert(`Call Setup Failed: ${error.message}`);
        }
    };

    const fetchLogs = async () => {
        try {
            const response = await api.get('/twilio/logs');
            setCallLogs(response.data);
        } catch (error) {
            console.error('Failed to fetch call logs:', error);
        }
    };

    const saveLog = async (logData) => {
        try {
            await api.post('/twilio/logs', logData);
            fetchLogs(); // Refresh logs
        } catch (error) {
            console.error('Failed to save call log:', error);
        }
    };

    const handleCall = async () => {
        if (!device || !phoneNumber) return;

        // Format number if needed (basic check)
        let numberToCall = phoneNumber;
        if (!numberToCall.startsWith('+')) {
            // Assuming user might type without + prefix, maybe default to +1 or similar? 
            // For now, let's trust user types it right or add visual hint
            // numberToCall = '+' + numberToCall; 
        }

        try {
            setCallStatus('connecting');
            const conn = await device.connect({ params: { To: numberToCall } });
            setActiveCall(conn);

            conn.on('accept', async () => {
                setCallStatus('connected');
                startDurationTimer();
                console.log('📞 Call accepted');

                // Notify backend that call has started (for transcription tracking)
                try {
                    const callSid = conn.parameters.CallSid;
                    console.log('📞 Notifying backend of call start, CallSid:', callSid);
                    await api.post('/twilio/call-started', {
                        callSid,
                        phoneNumber: numberToCall,
                        roomId: null // Can be enhanced later to pass current room if user is in one
                    });
                } catch (error) {
                    console.error('Failed to notify backend of call start:', error);
                }
            });

            conn.on('disconnect', () => {
                handleDisconnect();
                console.log('📞 Call disconnected');
            });

            conn.on('error', (error) => {
                console.error('Call connection error:', error);
                handleDisconnect();
            });

        } catch (error) {
            console.error('Failed to make call:', error);
            alert(`Call Failed: ${error.message || 'Unknown error'}`);
            setCallStatus('idle');
        }
    };

    const handleHangup = () => {
        if (activeCall) {
            activeCall.disconnect();
        }
        handleDisconnect();
    };

    const handleDisconnect = async () => {
        setCallStatus('idle');
        setIsMuted(false);

        // Notify backend that call has ended
        if (activeCall) {
            try {
                const callSid = activeCall.parameters?.CallSid;
                if (callSid) {
                    console.log('📞 Notifying backend of call end, CallSid:', callSid);
                    await api.post('/twilio/call-ended', { callSid });
                }
            } catch (error) {
                console.error('Failed to notify backend of call end:', error);
            }
        }

        // Stop timer
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }

        // Save log if there was a call
        if (phoneNumber) {
            saveLog({
                recipientNumber: phoneNumber,
                direction: 'outbound',
                status: 'completed', // Simplified
                duration: callDuration, // We need to capture the current state value properly
                // Note: Use a ref for duration if we need strict accuracy inside callbacks
            });
        }

        // Reset duration state after a momentary delay or immediately?
        // Doing it immediately resets UI
        setCallDuration(0);
        setActiveCall(null);
    };

    const startDurationTimer = () => {
        setCallDuration(0);
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

        const startTime = Date.now();
        durationIntervalRef.current = setInterval(() => {
            setCallDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
    };

    const toggleMute = () => {
        if (activeCall) {
            const newState = !isMuted;
            activeCall.mute(newState);
            setIsMuted(newState);
        }
    };

    const handleBackspace = () => {
        setPhoneNumber(prev => prev.slice(0, -1));
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Dialpad component
    const DialButton = ({ value, sub = '', onClick }) => (
        <button
            onClick={() => onClick(value)}
            className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex flex-col items-center justify-center transition-colors shadow-sm ring-1 ring-gray-200"
        >
            <span className="text-2xl font-semibold text-gray-800">{value}</span>
            {sub && <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{sub}</span>}
        </button>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 sm:absolute sm:inset-auto sm:right-0 sm:top-16 w-full sm:w-80 h-full sm:h-auto sm:max-h-[85vh] bg-white sm:bg-white/90 backdrop-blur-xl rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl ring-0 sm:ring-1 ring-gray-200 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right mr-0 sm:mr-6">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/50">
                <div className="flex gap-1 bg-gray-100/50 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('dialpad')}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'dialpad' ? 'bg-white shadow text-[#684CFE]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Keypad
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'history' ? 'bg-white shadow text-[#684CFE]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Recent
                    </button>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {activeTab === 'dialpad' ? (
                <div className="flex flex-col h-full sm:h-auto">
                    {/* Display Area */}
                    <div className="px-6 py-6 flex flex-col items-center justify-center border-b border-gray-50 bg-gradient-to-b from-white to-gray-50/50 min-h-[100px]">
                        {callStatus === 'idle' ? (
                            <div className="w-full relative flex items-center justify-center">
                                <input
                                    type="text"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="Enter number..."
                                    className="text-3xl font-light text-center bg-transparent border-none outline-none w-full placeholder:text-gray-300 text-gray-800"
                                />
                                {phoneNumber && (
                                    <button onClick={handleBackspace} className="absolute right-0 text-gray-400 hover:text-gray-600 p-2">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3 ring-4 ring-gray-50">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <div className="text-xl font-semibold text-gray-900 mb-1">{phoneNumber}</div>
                                <div className={`text-sm font-medium px-3 py-1 rounded-full ${callStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {callStatus === 'connected' ? formatDuration(callDuration) : 'Calling...'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Keypad or Active Controls */}
                    <div className="flex-1 flex flex-col justify-center p-6 bg-white">
                        {callStatus === 'idle' ? (
                            <>
                                <div className="grid grid-cols-3 gap-x-4 gap-y-3 mb-6">
                                    <DialButton value="1" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="2" sub="ABC" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="3" sub="DEF" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="4" sub="GHI" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="5" sub="JKL" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="6" sub="MNO" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="7" sub="PQRS" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="8" sub="TUV" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="9" sub="WXYZ" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="*" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="0" sub="+" onClick={(v) => setPhoneNumber(p => p + v)} />
                                    <DialButton value="#" onClick={(v) => setPhoneNumber(p => p + v)} />
                                </div>
                                <div className="flex justify-center">
                                    <button
                                        onClick={handleCall}
                                        disabled={!phoneNumber}
                                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl shadow-lg transition-transform active:scale-95 ${phoneNumber ? 'bg-green-500 hover:bg-green-600 shadow-green-500/30' : 'bg-gray-300 cursor-not-allowed'}`}
                                    >
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-3 gap-6 mb-6">
                                <button onClick={toggleMute} className={`flex flex-col items-center justify-center gap-2 ${isMuted ? 'text-white' : 'text-gray-700'}`}>
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white/20 ring-2 ring-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                        {isMuted ? (
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                                        ) : (
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium">Mute</span>
                                </button>

                                <div className="col-span-2 flex justify-center"></div>
                                {/* Placeholder for future features like keypad in-call */}

                                <div className="col-start-2 flex justify-center mt-8">
                                    <button
                                        onClick={handleHangup}
                                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-transform active:scale-95"
                                    >
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.228 8.028A1 1 0 007.28 7.344H4z" /></svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <HistoryView callLogs={callLogs} onClose={() => setActiveTab('dialpad')} onCall={(number) => {
                    setPhoneNumber(number);
                    setActiveTab('dialpad');
                }} />
            )}
        </div>
    );
};

// Sub-component for structured history
const HistoryView = ({ callLogs, onClose, onCall }) => {
    const [selectedNumber, setSelectedNumber] = useState(null);

    // Group logs by number
    const groupedLogs = callLogs.reduce((acc, log) => {
        if (!acc[log.recipientNumber]) {
            acc[log.recipientNumber] = [];
        }
        acc[log.recipientNumber].push(log);
        return acc;
    }, {});

    const sortedNumbers = Object.keys(groupedLogs).sort((a, b) => {
        // Sort by most recent call timestamp
        const lastCallA = new Date(groupedLogs[a][0].timestamp);
        const lastCallB = new Date(groupedLogs[b][0].timestamp);
        return lastCallB - lastCallA;
    });

    if (selectedNumber) {
        // Detail View
        const numberLogs = groupedLogs[selectedNumber];
        return (
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 min-h-[300px]">
                <div className="flex items-center mb-4 sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 z-10">
                    <button onClick={() => setSelectedNumber(null)} className="mr-3 text-gray-500 hover:text-gray-700 bg-white p-1.5 rounded-full shadow-sm ring-1 ring-gray-200 transition-all hover:ring-gray-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="font-semibold text-gray-800 text-lg">{selectedNumber}</h3>
                </div>
                <div className="space-y-3 pb-2">
                    {numberLogs.map((log) => (
                        <div key={log._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.direction === 'outbound' ? 'bg-[#684CFE]/10 text-[#684CFE]' : 'bg-green-50 text-green-500'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {log.direction === 'outbound'
                                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />
                                        }
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 font-medium mb-0.5">{new Date(log.timestamp).toLocaleDateString()}</div>
                                    <div className="text-sm font-medium text-gray-700">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-gray-100/50 text-xs font-semibold text-gray-600">
                                {Math.floor(log.duration / 60)}:{(log.duration % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // List View (Grouped)
    return (
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 min-h-[300px]">
            {sortedNumbers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span className="text-sm font-medium">No recent calls</span>
                </div>
            ) : (
                <div className="space-y-3 pb-2">
                    {sortedNumbers.map((number) => {
                        const logs = groupedLogs[number];
                        const lastLog = logs[0];
                        const count = logs.length;
                        return (
                            <div key={number} onClick={() => setSelectedNumber(number)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-white hover:shadow-md hover:border-[#684CFE]/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#684CFE]/10 to-[#684CFE]/20 text-[#684CFE] flex items-center justify-center font-bold text-lg shadow-inner ring-1 ring-[#684CFE]/30">
                                        {count > 1 ? count : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-lg">{number}</div>
                                        <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                            <span>{lastLog.direction === 'outbound' ? 'Outgoing' : 'Incoming'}</span>
                                            <span>•</span>
                                            <span>{new Date(lastLog.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity scale-95 group-hover:scale-100 duration-200">
                                    <button onClick={(e) => { e.stopPropagation(); onCall(number); }} className="p-3 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all active:scale-95">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CallWidget;
