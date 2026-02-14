import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Webcam from 'react-webcam';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../lib/api';
import SignLanguageAvatar from '../components/SignLanguageAvatar';
import NativeSpeechRecognition from '../components/NativeSpeechRecognition';
import TextInput from '../components/TextInput';
import VideoWithPoseDetection from '../components/VideoWithPoseDetection'; // Keeping for legacy reference, can be removed if fully replaced
import GeminiLiveStream from '../components/GeminiLiveStream';
import { getSuggestions, nextSuggestion } from '../lib/suggest';
import CallWidget from '../components/CallWidget';
import LinzoLogo from '../assets/linzo-logo.png';

const IntegratedRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSTT, setShowSTT] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [isSignLanguageActive, setIsSignLanguageActive] = useState(false);
  const [avatarType, setAvatarType] = useState('xbot');
  const [animationSpeed, setAnimationSpeed] = useState(0.1);
  const [pauseTime, setPauseTime] = useState(800);
  const [drawerTab, setDrawerTab] = useState('chat');
  const [user, setUser] = useState({ name: 'You', avatar: '' });
  const [isBackgroundListening, setIsBackgroundListening] = useState(false);
  const [backgroundRecognition, setBackgroundRecognition] = useState(null);
  const [isSignToVoiceActive, setIsSignToVoiceActive] = useState(false);
  const [isISLTypingActive, setIsISLTypingActive] = useState(false);
  const [useClientAlphabetModel, setUseClientAlphabetModel] = useState(true);
  const [typedPrefix, setTypedPrefix] = useState('');
  const [currentSuggestion, setCurrentSuggestion] = useState('');
  const [composedSentence, setComposedSentence] = useState('');

  // Multilingual Translation State
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState('en-US'); // Default to English (US)
  const [supportedLanguages, setSupportedLanguages] = useState([]);

  // Meeting Summary State
  const [isSummaryEnabled, setIsSummaryEnabled] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(false); // New UI state
  const [captions, setCaptions] = useState([]); // {id, text, speaker, timestamp}
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const speechRecRef = useRef(null);
  const allowSpeechRestartRef = useRef(false);
  const recentTranscriptsRef = useRef([]);
  const userNameRef = useRef('');

  // Conflict Resolution: Disable other speech features when summary is enabled
  useEffect(() => {
    if (isSummaryEnabled) {
      if (isBackgroundListening) {
        setIsBackgroundListening(false);
        console.log('🔇 Auto-disabled Background Listening to prevent conflicts');
      }
      setShowTranscripts(true); // Auto-open panel
    }
  }, [isSummaryEnabled]);

  // Refs for State (to avoid stale closures in socket listeners)
  const isTranslationEnabledRef = useRef(isTranslationEnabled);
  const preferredLanguageRef = useRef(preferredLanguage);

  // Sync refs with state
  useEffect(() => {
    isTranslationEnabledRef.current = isTranslationEnabled;
    preferredLanguageRef.current = preferredLanguage;
  }, [isTranslationEnabled, preferredLanguage]);

  const socketRef = useRef(null);
  const selfIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const baseStreamRef = useRef(null); // Persistent reference to the original webcam stream
  const remoteStreamsRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const hasJoinedRef = useRef(false);
  const lastSpokenTextRef = useRef(''); // Track last spoken text to avoid repetition
  const dataChannelsRef = useRef({});
  const [dataChannelStatus, setDataChannelStatus] = useState('Disconnected');
  const [isCallWidgetOpen, setIsCallWidgetOpen] = useState(false);

  const participantVideoRefs = useRef({}); // START_LINE: 52

  // Stable video ref callback to prevent flickering
  const setParticipantVideoRef = useCallback((participantId, element) => {
    if (element && participantVideoRefs.current[participantId] !== element) {
      participantVideoRefs.current[participantId] = element;
      console.log(`🎥 Ref updated for participant ${participantId}`);

      // Find the participant and set their stream
      const participant = participants.find(p => p.id === participantId);
      if (participant && participant.stream) {
        console.log(`🎥 Setting stream for ${participantId} (Tracks: ${participant.stream.getTracks().length})`);
        element.srcObject = participant.stream;
        const playPromise = element.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch((e) => {
            console.log('❌ Video play failed for participant:', participantId, e);
          });
        }
      } else {
        console.log(`🎥 No stream found yet for ${participantId} in ref callback`);
      }
    }
  }, [participants]);

  // Update video streams when participants change without causing re-renders
  useEffect(() => {
    // Get current participant IDs
    const currentParticipantIds = new Set(participants.map(p => p.id));

    // Clean up video elements for participants who left
    Object.keys(participantVideoRefs.current).forEach(participantId => {
      if (!currentParticipantIds.has(participantId)) {
        const videoElement = participantVideoRefs.current[participantId];
        if (videoElement) {
          videoElement.srcObject = null;
          delete participantVideoRefs.current[participantId];
        }
      }
    });

    // Update streams for current participants
    participants.forEach(participant => {
      const videoElement = participantVideoRefs.current[participant.id];
      if (videoElement && participant.stream) {
        if (videoElement.srcObject !== participant.stream) {
          console.log(`🎥 Updating stream for ${participant.id} in effect (Tracks: ${participant.stream.getTracks().length})`);
          videoElement.srcObject = participant.stream;
          const playPromise = videoElement.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch((e) => {
              console.log('❌ Video play failed for participant:', participant.id, e);
            });
          }
        }
      }
    });
  }, [participants]);

  // Cleanup video elements on unmount
  useEffect(() => {
    return () => {
      // Clean up all video elements
      Object.values(participantVideoRefs.current).forEach(videoElement => {
        if (videoElement) {
          videoElement.srcObject = null;
        }
      });
      participantVideoRefs.current = {};
    };
  }, []);

  useEffect(() => {
    // Fetch user info for avatar
    api.get('/auth/me').then(res => {
      const userName = res.data?.user?.name || res.data?.name || 'You';
      setUser({
        name: userName,
        avatar: res.data?.user?.avatar || res.data?.avatar || '',
      });
      // Sync userNameRef for meeting summary
      userNameRef.current = userName;

      // Register meeting presence in DB (Create if not exists)
      api.post(`/meetings/${roomId}/join`, { username: userName })
        .then(() => console.log('✅ [SUMMARY] Meeting registered in DB'))
        .catch(e => console.error('❌ [SUMMARY] Failed to register meeting:', e));
    }).catch(() => { });

    // Fetch supported languages for translation
    api.get('/translate/supported-languages').then(res => {
      if (res.data?.languages) {
        setSupportedLanguages(res.data.languages);
      }
    }).catch(err => console.error('Failed to load languages', err));
  }, []);

  const signalingUrl = useMemo(() => {
    const userUrl = searchParams.get('sig');
    if (userUrl) {
      console.log('🔌 Using custom signaling URL from params:', userUrl);
      return userUrl;
    }
    // Default fallback logic
    try {
      const origin = window.location.origin.replace(/\/$/, '');
      // If we are on port 5173 (dev), try 5000. Otherwise assume same origin/port or specific env.
      return import.meta.env.VITE_SIGNALING_URL || origin.replace(':5173', ':5000');
    } catch (e) {
      console.error('Error deriving signaling URL:', e);
      return 'http://localhost:5000';
    }
  }, [searchParams]);

  useEffect(() => {
    console.log('🔌 Connecting to signaling server:', signalingUrl);

    socketRef.current = io(signalingUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to server:', roomId, 'Socket ID:', socketRef.current.id);
      console.log('✅ Connected to server:', roomId, 'Socket ID:', socketRef.current.id);
      setIsConnected(true);
      selfIdRef.current = socketRef.current.id;
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setIsConnected(false);

      // Log more details about the connection attempt
      console.log('🔍 Connection details:', {
        attemptedUrl: signalingUrl,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    socketRef.current.on('user-disconnected', (userId) => {
      console.log(`👤 User disconnected: ${userId}`);
      setParticipants((prev) => prev.filter((p) => p.id !== userId));
      // Cleanup peer connection
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
      }
      if (remoteStreamsRef.current[userId]) {
        delete remoteStreamsRef.current[userId];
      }
    });

    // REMOVED: Duplicate speech-translation listener. Logic merged below.
    // This closes the useEffect callback function.
    socketRef.current.on('user-joined', handleUserJoined);
    socketRef.current.on('user-left', handleUserLeft);
    socketRef.current.on('offer', handleOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidate);
    socketRef.current.on('chat-message', handleChatMessage);
    socketRef.current.on('broadcast-sign-language', handleBroadcastSignLanguage);
    socketRef.current.on('broadcast-animation-complete', handleBroadcastAnimationComplete);
    socketRef.current.on('broadcast-tts', handleBroadcastTTS);
    socketRef.current.on('media-state', handleMediaState);

    // Shared Transcription State Listener
    socketRef.current.on('transcription-state', ({ enabled }) => {
      console.log(`🎤 Received transcription-state sync: ${enabled}`);
      setIsSummaryEnabled(enabled);
    });

    // Twilio transcription listener - for deaf/mute users to see what callee is saying
    socketRef.current.on('twilio-transcription', (data) => {
      console.log('📞 Received Twilio transcription:', data);

      if (data.text && data.text.trim()) {
        // Display transcription in chat
        const message = {
          id: Date.now(),
          text: `📞 Phone: "${data.text}"`,
          sender: 'Twilio Call',
          timestamp: new Date().toLocaleTimeString()
        };
        setChatMessages(prev => [...prev, message]);

        // Trigger sign language avatar animation
        setCurrentText(data.text.trim());
        setIsSignLanguageActive(true);

        console.log('✅ Twilio transcription displayed and avatar activated');
      }
    });

    // MERGED: Single listener for speech-translation to handle both Avatar/TTS and Transcripts
    socketRef.current.on('speech-translation', async (data) => {
      console.log('🔊 [SOCKET] Received speech-translation:', data);
      const { text, sender, type, sourceLang, from, id } = data;

      // 1. Handle "Transcript" Type (Meeting Summary / Captions)
      if (type === 'transcript') {
        console.log('📝 [TRANSCRIPT] Processing transcript from:', sender);

        // Ignore self if we already added it locally (but data.from check is safer)
        if (from === socketRef.current?.id) {
          console.log('🔇 [TRANSCRIPT] Ignoring self-transcript (already handled locally)');
          return;
        }

        if (text) {
          // Check for duplicates (echo prevention)
          if (isDuplicate(text, 'remote')) {
            console.log('🚫 [DEDUPE] Ignoring remote transcript (duplicate):', text);
            return;
          }

          const caption = {
            id: Date.now() + Math.random(),
            text: text,
            speaker: data.speakerName || sender || 'Participant',
            timestamp: new Date().toLocaleTimeString()
          };

          setCaptions(prev => {
            console.log('➕ [TRANSCRIPT] Adding caption:', caption);
            return [...prev, caption].slice(-50);
          });

          recentTranscriptsRef.current.push({ text: text, source: 'remote', timestamp: Date.now() });

          // Auto-show panel so passive users see it
          setShowTranscripts(true);
        }
        return; // Stop here, do not process as speech/avatar
      }

      // 2. Handle "Speech" Type (Avatar & TTS)
      // IGNORE self-messages (prevents "hearing myself")
      if (from === socketRef.current?.id) {
        console.log(`🔇 Ignoring speech from self (${from})`);
        return;
      }

      console.log(`🔊 Received speech from ${sender}: ${text}`);

      // Show original immediately (Optimistic UI)
      const messageId = id || Date.now();

      // Check if we already have this message (dedupe) - though ID should be unique from event
      setChatMessages(prev => {
        if (prev.some(m => m.id === messageId)) return prev;
        return [...prev, {
          id: messageId,
          sender: sender || 'Signer',
          text: `🤟 ${text} (Translating...)`, // Immediate feedback
          timestamp: new Date().toLocaleTimeString()
        }];
      });

      // Also track for summary since we have the text now (redundant if using 'transcript' type properly, but keeping for safety in legacy mode)
      // recentTranscriptsRef.current.push({ ... }); 

      let spokenText = text;

      // Translate if enabled
      if (isTranslationEnabledRef.current && text) {
        // Prevent translating if source and target are same
        const targetLang = preferredLanguageRef.current.split('-')[0];
        const sourceLangCode = (sourceLang || 'en').split('-')[0];

        if (targetLang !== sourceLangCode) {
          console.log(`🌐 Translating incoming speech: "${text}" (${sourceLangCode} -> ${targetLang})`);
          const translated = await translateIncomingText(text);
          if (translated) {
            spokenText = translated;

            // Update UI with translated text
            setChatMessages(prev => prev.map(m =>
              m.id === messageId ? { ...m, text: `🤟 ${translated}` } : m
            ));
          }
        } else {
          // Same lang, just remove loading state
          setChatMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, text: `🤟 ${text}` } : m
          ));
        }
      } else {
        // Translation disabled
        setChatMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, text: `🤟 ${text}` } : m
        ));
      }

      // Speak it!
      speakText(spokenText, isTranslationEnabledRef.current ? preferredLanguageRef.current : (sourceLang || 'en-US'));
    });

    // 🔊 GLOBAL GEMINI AUDIO LISTENER (For Remote Participants)
    // This allows everyone in the room to hear the ISL translation
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    let nextStartTime = 0;

    socketRef.current.on('gemini-audio', async (data) => {
      if (data.audio) {
        try {
          if (audioCtx.state === 'suspended') await audioCtx.resume();

          // Decode Base64 -> Raw PCM (Int16)
          const binaryString = window.atob(data.audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const int16Data = new Int16Array(bytes.buffer);

          // Convert Int16 -> Float32
          const float32Data = new Float32Array(int16Data.length);
          for (let i = 0; i < int16Data.length; i++) {
            float32Data[i] = int16Data[i] / 32768.0;
          }

          // Play
          const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
          buffer.getChannelData(0).set(float32Data);

          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);

          const currentTime = audioCtx.currentTime;
          if (nextStartTime < currentTime) nextStartTime = currentTime;
          source.start(nextStartTime);
          nextStartTime += buffer.duration;

        } catch (e) {
          console.error("Global Audio Decode Error:", e);
        }
      }
    });

    // Defer local media acquisition to react-webcam (VideoWithPoseDetection)
    // We'll join the room once onStreamReady provides the stream
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      socketRef.current?.disconnect();
    };
  }, [roomId, signalingUrl]);

  // Helper to switch the active local stream (e.g. between Webcam and AI Video)
  const switchStream = useCallback((newStream) => {
    if (!newStream) return;

    console.log('🔄 Switching local stream. Tracks:', newStream.getTracks().length);
    localStreamRef.current = newStream;
    setLocalStream(newStream);

    // 1. Update local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }

    // 2. Apply current mute/video state to the new stream
    newStream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    newStream.getVideoTracks().forEach(track => { track.enabled = !isVideoOff; });

    // 3. Update all existing peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => {
      const senders = pc.getSenders();
      const videoTrack = newStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];

      if (videoTrack) {
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) videoSender.replaceTrack(videoTrack).catch(e => console.error('Error replacing video track:', e));
      }
      if (audioTrack) {
        const audioSender = senders.find(s => s.track?.kind === 'audio');
        if (audioSender) audioSender.replaceTrack(audioTrack).catch(e => console.error('Error replacing audio track:', e));
      }
    });
  }, [isMuted, isVideoOff]);

  // Helper to check for duplicates (Echo cancellation for meeting summary)
  // MOVED UP or ENSURE ONLY ONE COPY EXISTS.
  // Scanning file... I will keep this one and ensure no others exist.
  const isDuplicate = useCallback((text, excludeSource) => {
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
  }, []);

  // Monitor mode changes to restore base stream when both modes are off
  useEffect(() => {
    if (!isSignToVoiceActive && !isISLTypingActive) {
      // If both modes are off, revert to the base stream if available
      if (baseStreamRef.current && localStreamRef.current !== baseStreamRef.current) {
        console.log('↩️ Reverting to base webcam stream');
        switchStream(baseStreamRef.current);
      }
    }
  }, [isSignToVoiceActive, isISLTypingActive, switchStream]);

  const handleMediaState = ({ socketId, micOn, camOn }) => {
    console.log(`📡 Media state update for ${socketId}: Mic=${micOn}, Cam=${camOn}`);
    setParticipants(prev => prev.map(p => {
      if (p.id === socketId) {
        return { ...p, isMicOn: micOn, isCamOn: camOn };
      }
      return p;
    }));
  };

  const buildPeer = (peerId) => {
    // 1. Create RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    peerConnectionsRef.current[peerId] = pc;

    // 2. Add local tracks
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    // 3. Handle remote tracks
    pc.ontrack = (e) => {
      console.log(`🎥 Received remote track from ${peerId}:`, e.track.kind);
      let remote = remoteStreamsRef.current[peerId];
      if (!remote) {
        remote = new MediaStream();
        remoteStreamsRef.current[peerId] = remote;
      }
      if (e.track && !remote.getTracks().some(t => t.id === e.track.id)) {
        remote.addTrack(e.track);
      }

      const s = e.streams?.[0] || remote;
      // Update participants state with the new stream
      setParticipants(prev => {
        // If participant exists, update stream. If not, add them.
        const exists = prev.some(p => p.id === peerId);
        if (exists) {
          return prev.map(p => p.id === peerId ? { ...p, stream: s } : p);
        } else {
          console.log('Detected new participant via track:', peerId);
          return [...prev, { id: peerId, stream: s, isMicOn: true, isCamOn: true }];
        }
      });
    };

    // 4. Handle ICE candidates
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        socketRef.current.emit('ice-candidate', { candidate: ev.candidate, to: peerId });
      }
    };

    // 5. Data Channel (for consistency with MultiCallRoom, though mainly for alignment)
    pc.ondatachannel = (event) => {
      console.log('Using data channel from peer:', peerId, event.channel.label);
      const channel = event.channel;
      dataChannelsRef.current[peerId] = channel;
      channel.onopen = () => setDataChannelStatus('Connected');
      channel.onerror = (err) => console.error('Data channel error:', err);
    };

    return pc;
  };

  const handleUserJoined = async (userId) => {
    console.log('👥 User joined:', userId);
    // Broadcast my current media state to the new user
    if (socketRef.current) {
      socketRef.current.emit('media-state', {
        roomId,
        micOn: !isMuted,
        camOn: !isVideoOff
      });
    }

    // Avoid duplicates in the participants list
    setParticipants(prev => {
      if (prev.some(p => p.id === userId)) {
        console.log('⚠️ User already in participants list:', userId);
        return prev;
      }
      console.log('✅ Added new participant:', userId);
      // Initialize with assumed defaults (Mic On, Cam On) until they send an update
      return [...prev, { id: userId, stream: null, isMicOn: true, isCamOn: true }];
    });

    // If we already have a connection with this user, do nothing
    if (peerConnectionsRef.current[userId]) {
      return;
    }

    // Use shared buildPeer to create connection
    const peerConnection = buildPeer(userId);

    // Glare avoidance: only the client with the LOWER socket id creates the offer
    const selfId = selfIdRef.current;
    if (selfId && selfId < userId) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current.emit('offer', { offer, to: userId });
    }
  };
  const handleUserLeft = (userId) => {
    console.log('👋 User left:', userId);
    setParticipants(prev => {
      const filtered = prev.filter(p => p.id !== userId);
      console.log('📊 Participants after user left:', filtered.length);
      return filtered;
    });
    if (peerConnectionsRef.current[userId]) {
      console.log('🔌 Closing peer connection for:', userId);
      peerConnectionsRef.current[userId].close();
      delete peerConnectionsRef.current[userId];
    }
  };



  const handleOffer = async ({ offer, from }) => {
    console.log('Received offer from:', from);
    // Ensure participant entry exists
    setParticipants(prev => (prev.some(p => p.id === from) ? prev : [...prev, { id: from, stream: null }]));

    let peerConnection = peerConnectionsRef.current[from];
    if (!peerConnection) {
      console.log('Creating new peer connection for answerer side');
      peerConnection = buildPeer(from);
    }

    // Create a data channel for the answerer to send data back if needed
    if (!dataChannelsRef.current[from]) {
      console.log('Creating answerer data channel for peer:', from);
      try {
        const channel = peerConnection.createDataChannel('data-' + selfIdRef.current);
        dataChannelsRef.current[from] = channel;
        channel.onopen = () => setDataChannelStatus('Connected');
      } catch (e) {
        console.error('Error creating data channel on answerer:', e);
      }
    }

    try {
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socketRef.current.emit('answer', { answer, to: from });

      // Flush any queued ICE candidates for this peer
      const queued = pendingCandidatesRef.current[from] || [];
      if (queued.length > 0) {
        console.log(`❄️ Flushing ${queued.length} queued ICE candidates for ${from}`);
        for (const c of queued) {
          try { await peerConnection.addIceCandidate(c); } catch (e) { console.error('Error adding queued candidate:', e); }
        }
        pendingCandidatesRef.current[from] = [];
      }
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async ({ answer, from }) => {
    const pc = peerConnectionsRef.current[from];
    if (pc) {
      try {
        await pc.setRemoteDescription(answer);

        // Flush any queued ICE candidates for this peer (Critical for stable connections)
        const queued = pendingCandidatesRef.current[from] || [];
        if (queued.length > 0) {
          console.log(`❄️ Flushing ${queued.length} queued ICE candidates for ${from} (after Answer)`);
          for (const c of queued) {
            try { await pc.addIceCandidate(c); } catch (e) { console.error('Error adding queued candidate:', e); }
          }
          pendingCandidatesRef.current[from] = [];
        }
      } catch (err) {
        console.error('Error setting remote description:', err);
      }
    }
  };

  const handleIceCandidate = async ({ candidate, from }) => {
    const pc = peerConnectionsRef.current[from];
    // Only add candidate if remote description is set, otherwise queue it
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error('Error adding ice candidate:', err);
      }
    } else {
      if (!pendingCandidatesRef.current[from]) pendingCandidatesRef.current[from] = [];
      pendingCandidatesRef.current[from].push(candidate);
      console.log(`❄️ Queued ICE candidate for ${from}(Total: ${pendingCandidatesRef.current[from].length})`);
    }
  };
  const handleChatMessage = (data) => {
    // Handle both old format (direct message) and new format (data object)
    const message = data.message ? {
      id: Date.now(),
      text: data.message,
      sender: data.sender || 'Unknown',
      timestamp: new Date().toLocaleTimeString()
    } : {
      id: Date.now(),
      text: data.text || data,
      sender: data.sender || 'Unknown',
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, message]);
  };

  // Ref to track currently playing TTS audio
  const currentTTSAudioRef = useRef(null);

  // Robust Speech Helper using Google TTS API (Bypasses flaky browser voices)
  const speakText = useCallback((text, language) => {
    if (!text) return;

    // 1. Stop any existing audio playback to prevent echo/reverberation
    if (currentTTSAudioRef.current) {
      try {
        currentTTSAudioRef.current.pause();
        currentTTSAudioRef.current.currentTime = 0;
        currentTTSAudioRef.current = null;
      } catch (e) {
        console.warn('Error stopping previous TTS audio:', e);
      }
    }

    // 2. Stop any existing browser speech to be safe
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      // 3. Use our own SERVER PROXY to avoid browser blocking
      // This hits http://localhost:5000/api/translate/tts which then fetches from Google
      const langCode = (language || 'en').split('-')[0];
      const encodedText = encodeURIComponent(text);

      // Construct the proxy URL (ensure it points to backend)
      const signalingOrigin = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:5000';
      const url = `${signalingOrigin.replace(/\/$/, '')}/api/translate/tts?text=${encodedText}&lang=${langCode}`;

      // 4. Play Audio
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";

      // Store reference to current audio
      currentTTSAudioRef.current = audio;

      console.log(`🔊 Fetching TTS from Proxy: "${text}" (${langCode})`);

      // Clean up reference when audio finishes
      audio.addEventListener('ended', () => {
        if (currentTTSAudioRef.current === audio) {
          currentTTSAudioRef.current = null;
        }
      });

      // Clean up reference on error
      audio.addEventListener('error', () => {
        if (currentTTSAudioRef.current === audio) {
          currentTTSAudioRef.current = null;
        }
      });

      audio.play().then(() => {
        console.log("✅ Audio Playing Successfully");
      }).catch(err => {
        console.error("❌ Audio Playback Failed (Proxy):", err);

        // Clear the reference since proxy audio failed
        if (currentTTSAudioRef.current === audio) {
          currentTTSAudioRef.current = null;
        }

        // Final Fallback to Browser
        if ('speechSynthesis' in window) {
          console.log("⚠️ Fallback to Browser Native TTS...");
          const u = new SpeechSynthesisUtterance(text);
          u.lang = language || 'en-US';
          window.speechSynthesis.speak(u);
        }
      });

    } catch (e) {
      console.error("❌ Google TTS setup failed:", e);
    }
  }, []);

  // Helper function to translate text
  const translateIncomingText = async (text) => {
    // Use refs to get latest state in callbacks
    if (!text || !isTranslationEnabledRef.current) return text;

    // Extract language code (e.g. 'hi-IN' -> 'hi')
    const targetLang = preferredLanguageRef.current.split('-')[0];

    console.error(`🔥 TRANSLATE START: "${text}" -> ${targetLang}`);

    try {
      const res = await api.post('/translate', {
        q: text,
        source: 'auto',
        target: targetLang
      });

      if (res.data?.translatedText) {
        console.error(`🔥 TRANSLATED DONE: "${res.data.translatedText}"`);
        return res.data.translatedText;
      }
    } catch (error) {
      console.error('🔥 TRANSLATION FAILED:', error);
    }
    return text; // Fallback to original
  };

  const handleBroadcastSignLanguage = async (data) => {
    try {
      console.error("🔥 BROADCAST RECEIVED from " + (data.senderSocketId || 'unknown') + ":", data);

      // Ignore my own broadcasts
      if (data.senderSocketId === socketRef.current?.id) {
        console.error("🔥 IGNORING SELF BROADCAST");
        return;
      }

      let textToProcess = data.text;

      // ZERO-DELAY: Batch all state updates together for maximum performance
      // Translate if enabled - USE REF
      if (isTranslationEnabledRef.current) {
        console.error("🔥 TRANSLATION ENABLED, PROCESSING...");
        textToProcess = await translateIncomingText(data.text);
      } else {
        console.error("🔥 TRANSLATION DISABLED");
      }

      const message = {
        id: data.timestamp || Date.now(),
        text: `${data.sender} is speaking: "${textToProcess}"`,
        sender: 'System',
        timestamp: new Date().toLocaleTimeString()
      };

      // Use React's batch update for optimal performance
      React.startTransition(() => {
        setCurrentText(textToProcess);
        setIsSignLanguageActive(true);
        setChatMessages(prev => [...prev, message]);
      });



      // REMOVED duplicate speakText call here!
      // Audio should solely be handled by the 'speech-translation' event listener.

    } catch (err) {
      console.error("🔥 BROADCAST ERROR:", err);
    }
  };

  const handleBroadcastAnimationComplete = (data) => {
    // Zero-delay immediate update
    setIsSignLanguageActive(false);
  };
  const sendChatMessage = () => {
    if (chatInput.trim()) {
      const message = {
        id: Date.now(),
        text: chatInput.trim(),
        sender: 'You',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, message]);
      setChatInput('');

      // Emit chat message to other participants
      if (socketRef.current) {
        socketRef.current.emit('chat-message', {
          roomId,
          message: message.text,
          sender: 'You'
        });
      }
    }
  };
  /* Background Speech Logic Removed */

  const handleTextChange = useCallback(async (text) => {
    // Only process interim results if Voice->Sign is enabled AND not muted
    if (!isBackgroundListening || isMuted) return;

    // Immediate local update for instant response
    console.error("🔥 SENDING BROADCAST:", text);
    setCurrentText(text);
    setIsSignLanguageActive(true);

    // Instant broadcast to all participants with zero delay (AVATAR ONLY)
    if (socketRef.current && text.trim()) {
      // Broadcast immediately without waiting for any processing
      socketRef.current.emit('broadcast-sign-language', {
        roomId,
        text: text.trim(),
        sender: user.name || 'You',
        timestamp: Date.now(), // Add timestamp for perfect sync
        senderSocketId: socketRef.current.id // Add self ID to filter echo
      });
      // NOTE: Removed speech-translation emit from here to prevent INTERIM updates triggering TTS
    }
  }, [roomId, user.name, isBackgroundListening, isMuted]); // Added isMuted dependency

  // Handler for FINAL speech results (TTS/Translation)
  const handleFinalSpeech = useCallback((text) => {
    // IGNORE if muted (NativeSpeechRecognition runs independently of WebRTC track)
    if (isMuted) {
      console.log('🔇 [MUTE] Speech detected but user is muted. Ignoring.');
      return;
    }

    console.log('🎤 FINAL SPEECH DETECTED:', text);
    if (socketRef.current && text.trim()) {
      const messageId = Date.now();

      // 1. Show locally immediately (Consistency)
      const message = {
        id: messageId,
        text: text.trim(),
        sender: user.name || 'You',
        timestamp: new Date().toLocaleTimeString()
      };

      console.log(`🎤 [DEBUG] handleFinalSpeech - Sender: ${user.name}, SocketID: ${socketRef.current?.id}, SummaryEnabled: ${isSummaryEnabled}, BackgroundListening: ${isBackgroundListening}`);

      setChatMessages(prev => [...prev, message]);

      // ADDED: Populate Live Transcript immediately for SELF (Blue bubble)
      setCaptions(prev => {
        const newCaption = {
          id: messageId,
          text: text.trim(),
          speaker: 'You', // Or user.name
          timestamp: new Date().toLocaleTimeString()
        };
        return [...prev, newCaption].slice(-50);
      });

      // Also track for summary
      recentTranscriptsRef.current.push({
        text: text.trim(),
        source: 'local',
        speaker: 'You',
        timestamp: Date.now()
      });

      // 2. Emit speech-translation (Avatar/TTS Control)
      // ONLY emit this if "Voice -> Sign" (Background Listening) is enabled.
      // This decoupled flow prevents unwanted Avatar/TTS when just usage Live Transcript.
      if (isBackgroundListening) {
        socketRef.current.emit('speech-translation', {
          id: messageId,
          roomId,
          text: text.trim(),
          sourceLang: preferredLanguageRef.current || 'en-US',
          targetLang: 'en',
          from: socketRef.current.id,
          sender: user.name || 'You',
          type: 'speech' // triggers Avatar/TTS on peers
        });
      }

      // 3. Emit 'transcript' event (Live Transcript/Summary Control)
      // Always emit this if Summary/Transcription is enabled.
      if (isSummaryEnabled) {
        // Broadcast for peers
        socketRef.current.emit('speech-translation', {
          text: text.trim(),
          sourceLang: 'en',
          targetLang: 'en',
          from: socketRef.current.id,
          sender: user.name || 'You', // Standardize 'sender' field
          speakerName: user.name || 'You', // Keep for compatibility
          type: 'transcript' // triggers Captions only on peers
        });

        // Send to backend
        try {
          api.post(`/meetings/${roomId}/transcript`, {
            speaker: user.name || 'You',
            text: text.trim()
          });
        } catch (err) {
          console.error('❌ [SUMMARY] Failed to send transcript:', err);
        }
      }

    }
  }, [roomId, user.name, isSummaryEnabled, isBackgroundListening, isMuted]); // Added isMuted dependency

  // Memoize listening change handler to prevent restart loops
  const handleListeningChange = useCallback((listening) => {
    // Only activate Avatar if Voice->Sign mode is ON
    if (isBackgroundListening) {
      setIsSignLanguageActive(listening);
    }
  }, [isBackgroundListening]);

  const handleAnimationComplete = () => {
    // Don't set isSignLanguageActive to false here!
    // It should depend on whether we are still processing/listening
    console.log('✅ Animation complete in', roomId);

    // Broadcast completion to other participants
    if (socketRef.current) {
      socketRef.current.emit('broadcast-animation-complete', {
        roomId,
        timestamp: Date.now()
      });
    }
  };
  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const newMuteState = !isMuted;
        audioTrack.enabled = !newMuteState; // enabled = true means NOT muted
        setIsMuted(newMuteState);

        // Broadcast new state
        if (socketRef.current) {
          socketRef.current.emit('media-state', {
            roomId,
            micOn: !newMuteState,
            camOn: !isVideoOff
          });
        }
      }
    }
  };
  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const newVideoState = !isVideoOff;
        videoTrack.enabled = !newVideoState; // enabled = true means video ON
        setIsVideoOff(newVideoState);

        // Broadcast new state
        if (socketRef.current) {
          socketRef.current.emit('media-state', {
            roomId,
            micOn: !isMuted,
            camOn: !newVideoState
          });
        }
      }
    }
  };
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const videoTrack = screenStream.getVideoTracks()[0];
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        setIsScreenSharing(true);
        videoTrack.onended = () => { toggleScreenShare(); };
      } catch (err) { console.error('Error sharing screen:', err); }
    } else {
      const stream = localStreamRef.current;
      const videoTrack = stream?.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) { sender.replaceTrack(videoTrack); }
      });
      setIsScreenSharing(false);
    }
  };
  const leaveRoom = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    // Stop background speech recognition
    if (backgroundRecognition) {
      backgroundRecognition.stop();
      setIsBackgroundListening(false);
    }
    // Stop summary speech recognition
    if (speechRecRef.current) {
      allowSpeechRestartRef.current = false;
      try { speechRecRef.current.stop(); } catch (e) { }
    }
    navigate('/');
  };

  // End call with meeting summary
  const endCallWithSummary = async () => {
    if (!isSummaryEnabled) {
      alert('Meeting Summary is not enabled. Please enable it first to generate a summary.');
      return;
    }

    if (!window.confirm('End call and generate meeting summary?')) return;

    try {
      console.log('🎬 [SUMMARY] Ending call and generating summary...');

      // Stop speech recognition
      if (speechRecRef.current) {
        allowSpeechRestartRef.current = false;
        try { speechRecRef.current.stop(); } catch (e) { }
      }

      // End call and generate summary
      await api.post(`/meetings/${roomId}/end`);

      console.log('✅ [SUMMARY] Summary generation requested');

      // Navigate to summary details
      navigate(`/summary-call/${roomId}/details`);
    } catch (error) {
      console.error('❌ [SUMMARY] Error ending call with summary:', error);
      alert('Failed to generate summary. Please try again.');
    }
  };

  // Toggle background speech recognition
  const toggleBackgroundListening = () => {
    const newState = !isBackgroundListening;
    setIsBackgroundListening(newState);

    // Add system message
    const message = {
      id: Date.now(),
      text: newState ? '🎤 Background listening enabled' : '🔇 Background listening disabled',
      sender: 'System',
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, message]);
  };

  // Pre-load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('🎤 Voices loaded:', voices.length);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Removed corrupted manual STT & duplicate testConnection logic.
  // toggleSignToVoice and subsequent functions are now correctly in scope.

  // Toggle Sign to Voice functionality
  const toggleSignToVoice = () => {
    console.log('🔄 toggleSignToVoice called, current state:', isSignToVoiceActive);
    // Turning on SignToVoice disables ISL typing to avoid double capture
    if (!isSignToVoiceActive && isISLTypingActive) {
      setIsISLTypingActive(false);
    }
    setIsSignToVoiceActive(!isSignToVoiceActive);

    if (!isSignToVoiceActive) {
      console.log('🤟 Sign to Voice activated - ISL gestures will be converted to speech');
      // Add a system message to chat
      const message = {
        id: Date.now(),
        text: 'Sign to Voice mode activated - ISL gestures will be converted to speech',
        sender: 'System',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, message]);
    } else {
      console.log('🔇 Sign to Voice deactivated');
      // Clear detected text when deactivating
      setDetectedISLText('');
      // Add a system message to chat
      const message = {
        id: Date.now(),
        text: 'Sign to Voice mode deactivated',
        sender: 'System',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, message]);
    }
  };

  // State for detected ISL text
  const [detectedISLText, setDetectedISLText] = useState('');

  // Monitor isSignToVoiceActive state changes
  useEffect(() => {
    console.log('📊 isSignToVoiceActive state changed to:', isSignToVoiceActive);
  }, [isSignToVoiceActive]);

  // Handle text detected from sign language
  const handleSignTextDetected = (text, gesture) => {
    console.log('🤟 Sign detected:', text, 'from gesture:', gesture);

    // Update the detected text state for display in bottom navigation
    setDetectedISLText(text);

    // Add to chat
    const message = {
      id: Date.now(),
      text: `ISL Gesture detected: "${text}" (${gesture})`,
      sender: 'System',
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, message]);
  };

  // Handle speech generated from sign language
  const handleSignSpeechGenerated = (text) => {
    console.log('🔊 Speech generated from sign:', text);

    // Broadcast TTS to other participants
    if (socketRef.current) {
      socketRef.current.emit('broadcast-tts', {
        roomId,
        text,
        senderId: socketRef.current.id
      });
    }

    // Add to chat
    const message = {
      id: Date.now(),
      text: `Speech generated: "${text}"`,
      sender: 'System',
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, message]);
  };

  const handleBroadcastTTS = async ({ text, senderId }) => {
    console.log(`📨 Received broadcast-tts event: "${text}" from ${senderId}`);

    // Only play if it's from someone else
    if (senderId !== socketRef.current?.id) {
      // Translate if enabled - USE REF
      let textToSpeak = text;
      if (isTranslationEnabledRef.current) {
        textToSpeak = await translateIncomingText(text);
        console.log(`🌐 Playing Translated TTS: "${textToSpeak}"`);
      } else {
        console.log('🔊 Playing remote TTS:', text);
      }

      // Visual feedback
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: `🔊 Remote TTS: "${textToSpeak}"`,
        sender: 'System',
        timestamp: new Date().toLocaleTimeString()
      }]);

      speakText(textToSpeak, isTranslationEnabledRef.current ? preferredLanguageRef.current : 'en-US');
    }
  };

  // ISL Typing Handlers (alphabet mode)
  const handleAlphabetLetter = useCallback((letter) => {
    const next = (typedPrefix + letter).toLowerCase();
    setTypedPrefix(next);
    const [sugg] = getSuggestions(next, 1);
    setCurrentSuggestion(sugg || '');
  }, [typedPrefix]);

  const commitWordToSentence = useCallback(() => {
    const word = (currentSuggestion || typedPrefix).trim();
    if (!word) return;
    const nextSentence = (composedSentence + ' ' + word).trim();
    setComposedSentence(nextSentence + ' ');
    setTypedPrefix('');
    setCurrentSuggestion('');
  }, [typedPrefix, currentSuggestion, composedSentence]);

  const finalizeSentence = useCallback(() => {
    const finalText = (composedSentence + ' ' + (currentSuggestion || typedPrefix)).trim();
    if (!finalText) return;
    // Send to chat
    const message = {
      id: Date.now(),
      text: finalText,
      sender: user.name || 'You',
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, message]);
    socketRef.current?.emit('chat-message', { roomId, message: message.text, sender: message.sender });
    // Reset composer
    setComposedSentence('');
    setTypedPrefix('');
    setCurrentSuggestion('');
  }, [composedSentence, currentSuggestion, typedPrefix, user?.name, roomId]);

  const handleAlphabetControlGesture = useCallback((gesture) => {
    // yes: accept suggestion; no: cycle suggestion; hello: commit word; help: backspace; thank_you: finalize
    if (gesture === 'yes') {
      if (currentSuggestion) {
        setTypedPrefix(currentSuggestion);
      }
    } else if (gesture === 'no') {
      const next = nextSuggestion(currentSuggestion, typedPrefix);
      if (next) setCurrentSuggestion(next);
    } else if (gesture === 'hello') {
      commitWordToSentence();
    } else if (gesture === 'help') {
      if (typedPrefix.length > 0) {
        const trimmed = typedPrefix.slice(0, -1);
        setTypedPrefix(trimmed);
        const [sugg] = getSuggestions(trimmed, 1);
        setCurrentSuggestion(sugg || '');
      }
    } else if (gesture === 'thank_you') {
      finalizeSentence();
    }
  }, [currentSuggestion, typedPrefix, commitWordToSentence, finalizeSentence]);

  const toggleISLTyping = () => {
    // Turning on ISL typing disables SignToVoice to avoid double capture
    if (!isISLTypingActive && isSignToVoiceActive) {
      setIsSignToVoiceActive(false);
    }
    const next = !isISLTypingActive;
    setIsISLTypingActive(next);
    if (!next) {
      // reset on close
      setTypedPrefix('');
      setCurrentSuggestion('');
      setComposedSentence('');
      setUseClientAlphabetModel(false);
    }
  };

  const toggleClientAlphabet = () => {
    const next = !useClientAlphabetModel;
    if (next && isSignToVoiceActive) {
      setIsSignToVoiceActive(false);
    }
    if (next && !isISLTypingActive) {
      setIsISLTypingActive(true);
    }
    setUseClientAlphabetModel(next);
    const message = {
      id: Date.now(),
      text: next
        ? 'Client-side ISL alphabet predictions enabled (ONNX runtime)'
        : 'Client-side ISL alphabet predictions disabled (server fallback)',
      sender: 'System',
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, message]);
  };

  // Responsive grid: single column on small screens, scales up on larger screens
  // This keeps layout usable on phones while taking advantage of space on desktops

  return (
    <div className="min-h-screen bg-[#f6f8fb] font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 h-14 sm:h-16">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={LinzoLogo} alt="Linzo Logo" className="h-[35px] sm:h-[55px] w-auto" />
          <span className="hidden sm:inline ml-2 sm:ml-4 text-xs sm:text-sm text-gray-500">Room: <span className="font-mono text-gray-700">{roomId}</span></span>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ring-1 ${isConnected ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>

          </div>
          {!isConnected && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log('🔄 Attempting to reconnect...');
                  socketRef.current?.disconnect();
                  socketRef.current?.connect();
                }}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Retry
              </button>
              {/* <button
                onClick={testConnection}
                className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
              >
                Test
              </button> */}
              <span className="text-xs text-gray-500">
                {import.meta.env.VITE_SIGNALING_URL || 'http://localhost:5000'}
              </span>
            </div>
          )}
          {isSignLanguageActive && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 ring-1 ring-blue-200 animate-pulse">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              SYNC
            </span>
          )}
          {isBackgroundListening && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 animate-pulse">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              🎤 LISTENING
            </span>
          )}
          {isSignToVoiceActive && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700 ring-1 ring-purple-200 animate-pulse">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              🤟 SIGN TO VOICE
            </span>
          )}
          {useClientAlphabetModel && isISLTypingActive && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-50 text-amber-700 ring-1 ring-amber-200 animate-pulse">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              🧠 CLIENT ISL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">

          {/* Multilingual Translation Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 pl-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 leading-none">TRANSLATE</span>
              <span className="text-xs font-semibold text-[#684CFE] leading-tight">
                {isTranslationEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <button
              onClick={() => setIsTranslationEnabled(!isTranslationEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#684CFE] focus:ring-offset-2 ${isTranslationEnabled ? 'bg-[#684CFE]' : 'bg-gray-300'}`}
            >
              <span className={`${isTranslationEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </button>

            {isTranslationEnabled && (
              <>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="ml-1 text-xs px-2 py-1 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#684CFE] cursor-pointer"
                >
                  <option value="en-US">🇺🇸 English</option>
                  <option value="hi-IN">🇮🇳 Hindi</option>
                  <option value="es-ES">🇪🇸 Spanish</option>
                  <option value="fr-FR">🇫🇷 French</option>
                  <option value="de-DE">🇩🇪 German</option>
                  <option value="ja-JP">🇯🇵 Japanese</option>
                </select>
                <button
                  onClick={() => speakText("Testing translated voice output", preferredLanguage)}
                  title="Test Voice"
                  className="p-1 text-gray-500 hover:text-[#684CFE] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#684CFE]/10 ring-1 ring-[#684CFE]/30 text-[#684CFE] flex items-center justify-center font-bold text-sm sm:text-base">
            {user.name?.[0] || 'U'}
          </div>
        </div>
      </header>

      {/* Main Content: Interpreter focus layout */}
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-4rem)]">
        {/* Hidden webcam to initialize camera at meeting start and provide single stream */}
        <Webcam
          audio={true}
          mirrored={true}
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
          onUserMedia={(stream) => {
            // Save as base stream for restoration later
            if (!baseStreamRef.current) {
              console.log('🎥 Initial stream captured as base stream');
              baseStreamRef.current = stream;
            }

            if (!localStreamRef.current) {
              console.log('🎥 Initial stream ready from hidden Webcam');

              // Use switchStream to consistently set up everything even specifically for init
              // But since switchStream is a dependency we might just set it directly to avoid cycle issues during mount
              // For safety, we set explicitly here on first load, similar to before
              localStreamRef.current = stream;
              setLocalStream(stream);

              // CRITICAL: Apply current mute/video state immediately
              stream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
              stream.getVideoTracks().forEach(track => { track.enabled = !isVideoOff; });

              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                const playPromise = localVideoRef.current.play?.();
                if (playPromise && typeof playPromise.then === 'function') {
                  playPromise.catch(() => { });
                }
              }
              const emitJoin = () => {
                if (!hasJoinedRef.current) {
                  console.log('🚀 Joining room with initial webcam stream:', roomId);
                  socketRef.current.emit('join-room', roomId);
                  hasJoinedRef.current = true;
                }
              };
              if (socketRef.current?.connected) {
                emitJoin();
              } else {
                socketRef.current?.once('connect', emitJoin);
              }
            }
          }}
          videoConstraints={{ facingMode: 'user' }}
        />
        {/* Interpreter focus layout */}
        <div className="flex-1 relative flex flex-col lg:flex-row gap-4 p-2 sm:p-4 min-h-[50vh] lg:min-h-0">
          {/* Left: Large AI Interpreter */}
          <div className="flex-1 bg-white rounded-2xl shadow-lg hover:shadow-xl ring-1 ring-gray-200 overflow-hidden relative min-h-[30vh] sm:min-h-[60vh]">
            <div className="absolute z-10 bottom-3 left-3 bg-[#684CFE] text-white px-3 py-1 rounded-full text-xs sm:text-sm flex items-center gap-1 shadow">
              <span>🤖</span> AI Interpreter
              {isSignLanguageActive && (
                <div className="ml-2 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs">LIVE</span>
                </div>
              )}
              {isBackgroundListening && (
                <div className="ml-2 flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-xs">🎤</span>
                </div>
              )}
              {isSignToVoiceActive && (
                <div className="ml-2 flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-xs">🤟</span>
                </div>
              )}
            </div>
            {false && (
              <div className="absolute z-10 top-3 right-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={() => setAvatarType('xbot')} className={`px-3 py-1 rounded text-xs font-bold ring-1 ${avatarType === 'xbot' ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'}`}>XBOT</button>
                  <button onClick={() => setAvatarType('ybot')} className={`px-3 py-1 rounded text-xs font-bold ring-1 ${avatarType === 'ybot' ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'}`}>YBOT</button>
                  <button onClick={() => setAvatarType('humanoid')} className={`px-3 py-1 rounded text-xs font-bold ring-1 ${avatarType === 'humanoid' ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'}`}>HUMANOID</button>
                </div>

                {/* Animation Speed Slider */}
                <div className="bg-white rounded-lg p-2 shadow-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-1">Speed: {Math.round(animationSpeed * 100) / 100}</div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.50"
                    step="0.01"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Pause Time Slider */}
                <div className="bg-white rounded-lg p-2 shadow-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-1">Pause: {pauseTime}ms</div>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="100"
                    value={pauseTime}
                    onChange={(e) => setPauseTime(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>
            )}
            <SignLanguageAvatar
              text={currentText}
              isActive={isSignLanguageActive}
              avatarType={avatarType}
              animationSpeed={animationSpeed}
              pauseTime={pauseTime}
              onAnimationComplete={handleAnimationComplete}
            />
          </div>
          {/* Right: Sidebar tiles - widened */}
          <div className="w-full lg:w-[420px] flex flex-col gap-4">

            {/* Live Transcript Panel */}
            {showTranscripts && (
              <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 overflow-hidden flex flex-col max-h-[40vh] transition-all duration-300 ease-in-out">
                <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Live Transcript
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isSpeechActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                    <span className="text-[10px] text-gray-500 font-medium">{isSpeechActive ? 'Listening' : 'Paused'}</span>
                    <button onClick={() => setShowTranscripts(false)} className="ml-2 text-gray-400 hover:text-gray-600" title="Hide (Speech capture continues)">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-gray-50/30">
                  {captions.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <p className="text-xs">Start speaking to see live captions...</p>
                    </div>
                  ) : (
                    captions.map(c => {
                      const isMe = c.speaker === 'You' || c.speaker === (userNameRef.current || user.name);
                      return (
                        <div key={c.id} className={`flex w-full ${isMe ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 shadow-sm ${isMe
                            ? 'bg-indigo-600 text-white rounded-tl-none'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tr-none'
                            }`}>
                            <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${isMe ? 'text-indigo-200' : 'text-indigo-600'}`}>
                              {c.speaker}
                            </div>
                            <p className="text-xs leading-relaxed">{c.text}</p>
                            <div className={`text-[9px] mt-0.5 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                              {c.timestamp}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            {/* Seamless Voice Recognition Info */}
            {/* <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 flex items-center justify-center">
                  <span className="text-xs">🎤</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">Seamless Voice Recognition</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Click the orange microphone button below to start automatic voice-to-sign language conversion.
                Just speak naturally - no popups needed!
              </p>
              {isBackgroundListening && (
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>Active - Speaking will instantly convert to sign language</span>
                </div>
              )}
            </div> */}

            {/* Sign to Voice Info */}
            {/* <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 ring-1 ring-purple-200 flex items-center justify-center">
                  <span className="text-xs">🤟</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">Sign to Voice (ISL)</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Click the purple hand button below to enable real-time ISL gesture detection on your camera feed.
                The AI will overlay pose detection lines and convert your gestures to speech!
              </p>
              {isSignToVoiceActive && (
                <div className="mt-2 flex items-center gap-1 text-xs text-purple-700">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>Active - ISL gestures will be converted to speech</span>
                </div>
              )}
            </div> */}
            {/* Local tile (camera feed a bit larger) */}
            <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200 overflow-hidden relative aspect-[16/9]">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover bg-black transform scale-x-[-1]" />
              <div className="absolute top-2 left-2 bg-black/60 text-white px-3 py-1 rounded-full text-xs shadow">You</div>
              {isMuted && <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">🔇</div>}
              {isVideoOff && <div className="absolute top-10 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">📹 Off</div>}

              {/* Conditionally render the pose detection overlay for SignToVoice or ISL Typing */}
              {(isSignToVoiceActive || isISLTypingActive) && (
                <div className="absolute inset-0 z-10">
                  {isSignToVoiceActive ? (
                    <div className="flex-1 h-full bg-gray-900 rounded-2xl overflow-hidden relative ring-1 ring-gray-800 shadow-2xl">
                      <GeminiLiveStream
                        roomId={roomId}
                        isActive={isSignToVoiceActive}
                        socketRef={socketRef}
                        onStreamReady={(stream) => {
                          console.log('🎥 Stream ready from GeminiLiveStream');
                          // Use switchStream helper to handle all updates (video, peer tracks, etc.)
                          switchStream(stream);

                          // Join the room after we have the local media stream
                          const emitJoin = () => {
                            if (!hasJoinedRef.current) {
                              console.log('🚀 Joining room with webcam stream:', roomId);
                              socketRef.current.emit('join-room', roomId);
                              hasJoinedRef.current = true;
                            }
                          };
                          if (socketRef.current?.connected) {
                            emitJoin();
                          } else {
                            socketRef.current?.once('connect', emitJoin);
                          }
                        }}
                        onTextDetected={(text) => {
                          console.log('🤟 Gemini detected:', text);
                          if (!text) return;

                          setDetectedISLText(text); // Update UI

                          // Avoid repeating same text immediately
                          if (text === lastSpokenTextRef.current) return;
                          lastSpokenTextRef.current = text;

                          // Speak locally (DISABLED by user request - only remote should hear)
                          // window.speechSynthesis.cancel();
                          // const u = new SpeechSynthesisUtterance(text);
                          // window.speechSynthesis.speak(u);

                          // Broadcast TTS to peers
                          if (socketRef.current) {
                            socketRef.current.emit('speech-translation', {
                              roomId,
                              text: text,
                              sender: 'Me (Signer)'
                            });
                          }

                          // Clear text after delay
                          setTimeout(() => setDetectedISLText(''), 3000);
                        }}
                      />
                    </div>
                  ) : (
                    /* Legacy Local Model for Alphabet/Typing Mode */
                    <VideoWithPoseDetection
                      isActive={isISLTypingActive}
                      mode="alphabet"
                      onTextDetected={handleSignTextDetected}
                      onSpeechGenerated={handleSignSpeechGenerated}
                      onAlphabetLetter={handleAlphabetLetter}
                      onAlphabetControlGesture={handleAlphabetControlGesture}
                      useClientAlphabetModel={useClientAlphabetModel}
                      onStreamReady={(stream) => {
                        console.log('🎥 Stream ready from VideoWithPoseDetection');
                        switchStream(stream);
                        // Join room logic
                        const emitJoin = () => {
                          if (!hasJoinedRef.current) {
                            socketRef.current.emit('join-room', roomId);
                            hasJoinedRef.current = true;
                          }
                        };
                        if (socketRef.current?.connected) emitJoin();
                        else socketRef.current?.once('connect', emitJoin);
                      }}
                    />
                  )}
                </div>
              )}
              {/* ISL Typing overlay UI */}
              {isISLTypingActive && (
                <div className="absolute bottom-2 left-2 right-2 z-20">
                  <div className="bg-black/60 text-white rounded-lg p-2 text-xs flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="opacity-70">Word</span>
                      <span className="font-mono bg-white/10 px-2 py-0.5 rounded">
                        {typedPrefix || '—'}
                      </span>
                      {currentSuggestion && currentSuggestion.toLowerCase() !== typedPrefix.toLowerCase() && (
                        <span className="ml-2 opacity-70">→</span>
                      )}
                      {currentSuggestion && currentSuggestion.toLowerCase() !== typedPrefix.toLowerCase() && (
                        <span className="font-mono bg-green-500/20 px-2 py-0.5 rounded">{currentSuggestion}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-70">Sentence</span>
                      <span className="truncate">{(composedSentence + typedPrefix).trim() || '—'}</span>
                    </div>
                    <div className="opacity-70">
                      Gestures: Yes=Accept, No=Next, Hello=Commit word, Help=Backspace, Thank you=Finalize
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Remote participants small tiles */}
            <div className="flex-1 overflow-auto flex flex-col gap-4 pr-1">
              {participants.length > 0 ? (
                participants.map((participant, index) => (
                  <div key={participant.id} className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 overflow-hidden relative aspect-video">
                    <video
                      key={participant.stream?.id || 'no-stream'}
                      ref={(el) => setParticipantVideoRef(participant.id, el)}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover border-2 border-red-500 bg-gray-800"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded-full text-xs shadow">Participant {index + 1}</div>
                    {/* Remote Mute/Video Status Icons */}
                    {participant.isMicOn === false && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs shadow">🔇</div>
                    )}
                    {participant.isCamOn === false && (
                      <div className="absolute top-10 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs shadow">📹 Off</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 overflow-hidden grid place-items-center aspect-video text-gray-500 text-sm">
                  Waiting for others to join...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Native Speech Recognition - Controlled by Toggle */}
      {/* Persistent Native Speech Recognition - Now hidden but active */}
      {/* Persistent Native Speech Recognition - Controlled by Toggle or Summary */}
      {(isBackgroundListening || isSummaryEnabled) && (
        <div className="fixed bottom-4 right-4 z-40 opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
          <NativeSpeechRecognition
            onTextChange={handleTextChange}
            onFinalResult={handleFinalSpeech}
            onListeningChange={handleListeningChange}
            language={preferredLanguageRef.current || 'en-US'}
          />
        </div>
      )}

      {/* Global Notifications / Chat Overlay */}
      {showChat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">💬 Chat</h2>
              <button
                onClick={() => setShowChat(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">💬 Chat Messages</h3>


                {/* Live Sign Language Status - HIDDEN TO AVOID SHOWING DEBUG DATA */}
                {/* The avatar component already shows the text properly */}

                {/* Audio Test Button */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                  <span className="text-sm text-blue-700">🔊 Enable/Test Audio</span>
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance("Audio enabled");
                        utterance.volume = 1.0;
                        window.speechSynthesis.speak(utterance);
                        console.log('🔊 Test audio triggered');
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Test Sound
                  </button>
                </div>
                {/* {isSignLanguageActive && currentText && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Live Sign Language:</span>
                      <span className="text-sm">"{currentText}"</span>
                    </div>
                  </div>
                )} */}


                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    chatMessages.map(message => (
                      <div key={message.id} className={`rounded-lg px-4 py-2 ${message.sender === 'System'
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-100'
                        }`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-semibold ${message.sender === 'System' ? 'text-blue-700' : 'text-blue-700'
                            }`}>
                            {message.sender}
                          </span>
                          <span className="text-xs text-gray-400">{message.timestamp}</span>
                        </div>
                        <div className="text-sm text-gray-700">{message.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STT Modal Removed - Replaced by Bottom Bar Control */}

      {/* Participants Popup Modal */}
      {showParticipants && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Participants</h2>
              <button
                onClick={() => setShowParticipants(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 ring-1 ring-gray-200">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-blue-600">{user.name?.[0] || 'U'}</div>
                  <span className="text-sm font-medium">{user.name} (You)</span>
                </div>
                {participants.map((participant, index) => (
                  <div key={participant.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 ring-1 ring-gray-200">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-emerald-600">{index + 1}</div>
                    <span className="text-sm font-medium">Participant {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Bar Controls */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center z-30 pointer-events-none pb-4 sm:pb-6">
        <div className="flex gap-2 sm:gap-4 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-xl rounded-2xl px-3 py-2 sm:px-8 sm:py-4 pointer-events-auto border border-gray-200 max-w-[95vw] overflow-x-auto no-scrollbar items-center">
          <button
            onClick={toggleMute}
            className={`rounded-full p-2.5 sm:p-4 transition-all duration-200 shrink-0 ${isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`rounded-full p-2.5 sm:p-4 transition-all duration-200 shrink-0 ${isVideoOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
          >
            {isVideoOff ? (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /></svg>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            )}
          </button>

          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url).then(() => {
                alert('Meeting URL copied to clipboard!');
              });
            }}
            className="rounded-full p-2.5 sm:p-4 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 shrink-0"
            title="Share Meeting Link"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          <div className="w-px h-8 bg-gray-300 self-center mx-1"></div>

          <button
            onClick={toggleBackgroundListening}
            className={`rounded-full p-2.5 sm:p-4 transition-all duration-200 flex items-center gap-2 shrink-0 ${isBackgroundListening
              ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100'
              : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            title={isBackgroundListening ? 'Voice-to-Sign: Active (Listening...)' : 'Enable Voice-to-Sign Language'}
          >
            {isBackgroundListening ? (
              <>
                <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="hidden sm:inline text-sm font-bold">Voice ➡️ Sign</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="hidden sm:inline text-sm font-medium">Voice ➡️ Sign</span>
              </>
            )}
          </button>

          <button
            onClick={toggleSignToVoice}
            className={`rounded-full p-2.5 sm:p-4 transition-all duration-200 flex items-center gap-2 shrink-0 ${isSignToVoiceActive
              ? 'bg-purple-600 text-white shadow-lg ring-4 ring-purple-100'
              : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            title={isSignToVoiceActive ? 'Sign-to-Voice: Active (Detecting Gestures...)' : 'Enable Sign-to-Voice Language'}
          >
            {isSignToVoiceActive ? (
              <>
                <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline text-sm font-bold">Sign ➡️ Voice</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                <span className="hidden sm:inline text-sm font-medium">Sign ➡️ Voice</span>
              </>
            )}
          </button>

          {/* Display detected ISL text */}
          {detectedISLText && (
            <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg text-sm font-medium max-w-xs truncate flex items-center">
              🤟 {detectedISLText}
            </div>
          )}

          <div className="w-px h-8 bg-gray-300 self-center mx-1"></div>

          <button
            onClick={toggleISLTyping}
            className={`rounded-full p-2.5 sm:p-4 transition-all duration-200 shrink-0 ${isISLTypingActive
              ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            title={isISLTypingActive ? 'Alphabet Mode Active' : 'Enable Alphabet/Spelling Mode'}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </button>

          <button
            onClick={() => setShowChat(true)}
            className="rounded-full p-2.5 sm:p-4 transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200 shrink-0"
            title="Open Chat"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4.286 1.072A1 1 0 012 19.13V17.6c0-.272.11-.534.305-.727A7.963 7.963 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </button>

          <button
            onClick={() => setIsCallWidgetOpen(!isCallWidgetOpen)}
            className={`rounded-full p-2.5 sm:p-4 transition-all duration-200 shrink-0 ${isCallWidgetOpen ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title="Open Phone"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>

          {/* Meeting Summary Toggle (Shared) */}
          <button
            onClick={() => {
              const newState = !isSummaryEnabled;
              console.log(`🎤 Toggling transcription to ${newState} for ALL users`);
              // Optimistic update? No, let's wait for socket to ensure sync or do optimistic + sync.
              // Better to trust the socket source of truth for "Shared" state to avoid race conditions.
              // BUT for responsiveness, we can set it, and if socket fails, it reverts?
              // Actually, safeguard: only emit if connected.
              if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('toggle-transcription', { roomId, enabled: newState });
              } else {
                // Fallback for local testing if offline? OR just alert.
                setIsSummaryEnabled(newState);
              }
            }}
            className={`rounded-full p-2.5 sm:p-4 transition-all duration-200 relative shrink-0 ${isSummaryEnabled ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title={isSummaryEnabled ? "Disable Live Transcription (All)" : "Enable Live Transcription (All)"}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {/* Active indicator */}
            {isSummaryEnabled && isSpeechActive && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* End & Summarize Button (only show if summary enabled) */}
          {isSummaryEnabled && (
            <button
              onClick={endCallWithSummary}
              className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold rounded-full px-4 py-3 sm:px-5 sm:py-4 transition-all duration-200 shadow-md transform hover:scale-105 text-sm flex items-center gap-2 shrink-0"
              title="End call and generate summary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">End & Summarize</span>
            </button>
          )}

          <button
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-full p-2.5 sm:p-4 transition-all duration-200 shadow-md transform hover:scale-105 shrink-0"
            title="Leave call"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21l-1.498-4.493A1 1 0 005.372 3H5z" /></svg>
          </button>
        </div>
      </div>


      {/* Call Widget */}
      <CallWidget isOpen={isCallWidgetOpen} onClose={() => setIsCallWidgetOpen(false)} />
    </div >
  );
};

export default IntegratedRoom;
