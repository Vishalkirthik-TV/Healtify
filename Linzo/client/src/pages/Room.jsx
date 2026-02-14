import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
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
  
  const socketRef = useRef();
  const selfIdRef = useRef(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const remoteStreamsRef = useRef({});

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:5000');
    
    socketRef.current.on('connect', () => {
      setIsConnected(true);
      selfIdRef.current = socketRef.current.id;
    });

    socketRef.current.on('user-joined', handleUserJoined);
    socketRef.current.on('user-left', handleUserLeft);
    socketRef.current.on('offer', handleOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidate);
    socketRef.current.on('chat-message', handleChatMessage);

    // Get user media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          const playPromise = localVideoRef.current.play?.();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {});
          }
        }
        // Join only after media is ready so tracks are present in offers
        if (socketRef.current?.connected) {
          socketRef.current.emit('join-room', roomId);
        } else {
          socketRef.current?.once('connect', () => {
            socketRef.current.emit('join-room', roomId);
          });
        }
      })
      .catch(err => {
        console.error('Error accessing media devices:', err);
      });

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  const handleUserJoined = async (userId) => {
    console.log('User joined:', userId);
    setParticipants(prev => (prev.some(p => p.id === userId) ? prev : [...prev, { id: userId, stream: null }]));
    
    // Create offer for new user
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    if (peerConnectionsRef.current[userId]) {
      return; // already have a connection to this user
    }
    peerConnectionsRef.current[userId] = peerConnection;
    
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
    }
    
    peerConnection.ontrack = (event) => {
      let remoteStream = remoteStreamsRef.current[userId];
      if (!remoteStream) {
        remoteStream = new MediaStream();
        remoteStreamsRef.current[userId] = remoteStream;
      }
      if (event.track && !remoteStream.getTracks().some(t => t.id === event.track.id)) {
        remoteStream.addTrack(event.track);
      }
      const streamToSet = event.streams?.[0] || remoteStream;
      setParticipants(prev => prev.map(p => (p.id === userId ? { ...p, stream: streamToSet } : p)));
    };
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId
        });
      }
    };
    
    // Glare avoidance: lower socket id offers
    const selfId = selfIdRef.current;
    if (selfId && selfId < userId) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current.emit('offer', { offer, to: userId });
    }
  };

  const handleUserLeft = (userId) => {
    console.log('User left:', userId);
    setParticipants(prev => prev.filter(p => p.id !== userId));
    
    if (peerConnectionsRef.current[userId]) {
      peerConnectionsRef.current[userId].close();
      delete peerConnectionsRef.current[userId];
    }
  };

  const handleOffer = async ({ offer, from }) => {
    // Ensure participant row exists
    setParticipants(prev => (prev.some(p => p.id === from) ? prev : [...prev, { id: from, stream: null }]));
    let peerConnection = peerConnectionsRef.current[from];
    if (!peerConnection) {
      peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionsRef.current[from] = peerConnection;
    }
    
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
    }
    
    peerConnection.ontrack = (event) => {
      let remoteStream = remoteStreamsRef.current[from];
      if (!remoteStream) {
        remoteStream = new MediaStream();
        remoteStreamsRef.current[from] = remoteStream;
      }
      if (event.track && !remoteStream.getTracks().some(t => t.id === event.track.id)) {
        remoteStream.addTrack(event.track);
      }
      const streamToSet = event.streams?.[0] || remoteStream;
      setParticipants(prev => prev.map(p => (p.id === from ? { ...p, stream: streamToSet } : p)));
    };
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          to: from
        });
      }
    };
    
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socketRef.current.emit('answer', { answer, to: from });
  };

  const handleAnswer = async ({ answer, from }) => {
    const peerConnection = peerConnectionsRef.current[from];
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer);
    }
  };

  const handleIceCandidate = async ({ candidate, from }) => {
    const peerConnection = peerConnectionsRef.current[from];
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  };

  const handleChatMessage = (message) => {
    setChatMessages(prev => [...prev, message]);
  };

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      const message = {
        id: Date.now(),
        text: chatInput,
        sender: 'You',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, message]);
      setChatInput('');
    }
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in all peer connections
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        setIsScreenSharing(true);
        
        // Stop screen sharing when user stops
        videoTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Error sharing screen:', err);
      }
    } else {
      // Restore camera video
      const stream = localStreamRef.current;
      const videoTrack = stream?.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      setIsScreenSharing(false);
    }
  };

  const leaveRoom = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold">Linzo Meet</h1>
              <span className="text-sm text-gray-400">Room: {roomId}</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Participants ({participants.length + 1})
              </button>
            </div>
        </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Video Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-64 lg:h-80 object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-lg text-sm">
                You (Local)
              </div>
              {isMuted && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                  🔇 Muted
                </div>
              )}
              {isVideoOff && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                  📹 Off
              </div>
            )}
            </div>

            {/* Remote Video */}
            {participants.length > 0 ? (
              participants.map((participant, index) => (
                <div key={participant.id} className="relative bg-gray-800 rounded-xl overflow-hidden">
                <video
                    ref={el => {
                      if (el && participant.stream) {
                        el.srcObject = participant.stream;
                        const p = el.play?.();
                        if (p && typeof p.then === 'function') p.catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                    className="w-full h-64 lg:h-80 object-cover"
                />
                  <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-lg text-sm">
                    Participant {index + 1}
                </div>
              </div>
              ))
            ) : (
              <div className="bg-gray-800 rounded-xl flex items-center justify-center h-64 lg:h-80">
                <div className="text-center">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-gray-400">Waiting for others to join...</p>
                  <p className="text-sm text-gray-500 mt-2">Share this room code: {roomId}</p>
        </div>
      </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all duration-200 ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all duration-200 ${
                isVideoOff 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isVideoOff ? '📹' : '📷'}
            </button>
            
            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-full transition-all duration-200 ${
                isScreenSharing 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isScreenSharing ? '🖥️' : '💻'}
            </button>
            
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all duration-200"
            >
              💬
            </button>
            
            <button
              onClick={leaveRoom}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200"
            >
              📞
            </button>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="max-w-md mx-auto bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Chat</h3>
              <div className="h-64 overflow-y-auto mb-4 space-y-2">
                {chatMessages.map(message => (
                  <div key={message.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-blue-400">{message.sender}</span>
                      <span className="text-xs text-gray-400">{message.timestamp}</span>
                    </div>
                    <p className="text-sm">{message.text}</p>
            </div>
                ))}
            </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendChatMessage}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Send
                </button>
          </div>
        </div>
      )}

          {/* Participants Panel */}
          {showParticipants && (
            <div className="max-w-md mx-auto bg-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Participants</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 bg-gray-700 rounded-lg p-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">You</span>
                  </div>
                  <span className="text-sm">You (Host)</span>
                </div>
                {participants.map((participant, index) => (
                  <div key={participant.id} className="flex items-center space-x-3 bg-gray-700 rounded-lg p-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <span className="text-sm">Participant {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Room;


