'use client';

import { useState, useEffect } from 'react';
import VoiceActivityDetector from '@/components/VoiceActivityDetector';
import TalkingHead from '@/components/TalkingHead';
import { CameraToggleButton } from '@/components/CameraStream';
// LanguageSelector moved to Navbar
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthForms from '@/components/auth/AuthForms';
import LandingPage from '@/components/LandingPage';

export default function Home() {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const { connect, disconnect, isConnected } = useWebSocketContext();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // State to toggle between Landing Page and Login
  const [showLogin, setShowLogin] = useState(false);

  // Auto-connect when authenticated
  // Auto-connect / Disconnect
  useEffect(() => {
    if (isAuthenticated && user?.username && !isConnected) {
      connect(user.username);
    } else if (!isAuthenticated && isConnected) {
      disconnect();
    }
  }, [isAuthenticated, user, isConnected, connect, disconnect]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-lg text-zinc-400">Loading...</div>
      </main>
    );
  }

  if (!isAuthenticated) {
    if (!showLogin) {
      return <LandingPage onGetStarted={() => setShowLogin(true)} />;
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4">
        <button
          onClick={() => setShowLogin(false)}
          className="mb-8 text-sm font-medium text-zinc-500 hover:text-white transition-colors"
        >
          ← Back to Home
        </button>
        <AuthForms />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header Removed (Moved to Navbar) */}

        {/* Main Content Layout */}
        <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
          {/* TalkingHead Component */}
          <div className="order-1">
            <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-xl">
              <TalkingHead />
            </div>
          </div>

          {/* Voice Activity Detector */}
          <div className="order-2">
            <VoiceActivityDetector cameraStream={cameraStream} />
          </div>
        </div>
      </div>

      {/* Floating Camera Component */}
      <CameraToggleButton onStreamChange={setCameraStream} />
    </main>
  );
}