import React, { useState } from 'react';
import SignLanguageAvatar from '../components/SignLanguageAvatar';
import NativeSpeechRecognition from '../components/NativeSpeechRecognition';
import TextInput from '../components/TextInput';

const SignLanguageDemo = () => {
  const [currentText, setCurrentText] = useState('');
  const [isSignLanguageActive, setIsSignLanguageActive] = useState(false);
  const [avatarType, setAvatarType] = useState('xbot');

  const handleTextChange = (text) => {
    setCurrentText(text);
    setIsSignLanguageActive(true);
  };
  const handleAnimationComplete = () => {
    setIsSignLanguageActive(false);
  };
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Top Bar */}
      <header className="w-full flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">Linzo Meet</span>
        </div>
        <nav className="flex gap-6">
          <a href="/" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium transition-colors duration-200">Dashboard</a>
          <a href="/demo" className="text-blue-600 border-b-2 border-blue-600 px-3 py-2 text-sm font-medium">Try AI Interpreter</a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center w-full px-4 py-8">
        {/* Hero Section */}
        <div className="hero-section">
          <h1 className="hero-title">Experience AI-Powered Sign Language Translation</h1>
          <p className="hero-subtitle">
            See how our 3D avatar eliminates the need for human sign language interpreters. 
            This demo showcases the core technology that powers Linzo Meet's inclusive communication platform.
          </p>
        </div>

        {/* Main Demo Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl w-full">
          {/* Left Column - Controls */}
          <div className="card shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Try the AI Interpreter</h2>
            
            {/* Avatar Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Your AI Interpreter:</h3>
              <div className="flex gap-3 flex-wrap">
                <button 
                  onClick={() => setAvatarType('xbot')} 
                  className={`px-6 py-3 rounded-lg font-bold transition-all duration-200 ${avatarType === 'xbot' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  🤖 XBOT
                </button>
                <button 
                  onClick={() => setAvatarType('ybot')} 
                  className={`px-6 py-3 rounded-lg font-bold transition-all duration-200 ${avatarType === 'ybot' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  🤖 YBOT
                </button>
                <button 
                  onClick={() => setAvatarType('humanoid')} 
                  className={`px-6 py-3 rounded-lg font-bold transition-all duration-200 ${avatarType === 'humanoid' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  🧑 HUMANOID
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">Choose between our three AI interpreter avatars, each with unique signing styles.</p>
            </div>

            {/* Voice Input */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>🎤</span> Voice Input
              </h3>
              <NativeSpeechRecognition 
                onTextChange={handleTextChange} 
                onListeningChange={setIsSignLanguageActive} 
              />
              <p className="text-sm text-gray-600 mt-2">Speak naturally and watch real-time translation to sign language.</p>
            </div>

            {/* Text Input */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>⌨️</span> Text Input
              </h3>
              <TextInput 
                onTextChange={handleTextChange} 
                placeholder="Type any text to see sign language translation..." 
              />
              <p className="text-sm text-gray-600 mt-2">Type words, phrases, or sentences for instant sign language display.</p>
              
              {/* Example Phrases */}
              <div className="example-phrases">
                <h4 className="example-phrases-title">
                  <span>💡</span> Try These Examples:
                </h4>
                <ul className="example-phrases-list">
                  <li>• "Hello, how are you?"</li>
                  <li>• "I love sign language"</li>
                  <li>• "Thank you very much"</li>
                  <li>• "What is your name?"</li>
                  <li>• "Nice to meet you"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column - AI Interpreter */}
          <div className="card shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Sign Language Interpreter</h2>
            
            {/* Avatar Display */}
            <div className="mb-6">
              <SignLanguageAvatar
                text={currentText}
                isActive={isSignLanguageActive}
                avatarType={avatarType}
                onAnimationComplete={handleAnimationComplete}
              />
            </div>

            {/* Current Text Display */}
            {currentText && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Currently Translating:</h4>
                <p className="text-gray-700 text-lg">{currentText}</p>
              </div>
            )}

            {/* Feature Cards */}
            <div className="feature-grid">
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <h4 className="feature-title">Real-time</h4>
                <p className="feature-description">Instant translation</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎯</div>
                <h4 className="feature-title">Accurate</h4>
                <p className="feature-description">Precise signing</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚙️</div>
                <h4 className="feature-title">AI-Powered</h4>
                <p className="feature-description">Advanced technology</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🧩</div>
                <h4 className="feature-title">Accessible</h4>
                <p className="feature-description">For everyone</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-12 max-w-4xl w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How the AI Interpreter Works</h2>
          <div className="how-it-works-grid">
            <div className="feature-card">
              <div className="text-4xl mb-4">🎤</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">1. Input</h3>
              <p className="text-gray-600">Speak or type your message in natural language.</p>
            </div>
            <div className="feature-card">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">2. Process</h3>
              <p className="text-gray-600">AI analyzes and converts to sign language gestures.</p>
            </div>
            <div className="feature-card">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">3. Output</h3>
              <p className="text-gray-600">3D avatar performs the sign language translation.</p>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="mt-12 max-w-4xl w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Perfect For Inclusive Communication</h2>
          <div className="use-cases-grid">
            <div className="feature-card">
              <div className="text-3xl mb-3">🏥</div>
              <h3 className="font-semibold text-gray-800 mb-2">Healthcare</h3>
              <p className="text-sm text-gray-600">Doctor-patient consultations without interpreter delays.</p>
            </div>
            <div className="feature-card">
              <div className="text-3xl mb-3">🎓</div>
              <h3 className="font-semibold text-gray-800 mb-2">Education</h3>
              <p className="text-sm text-gray-600">Inclusive classrooms and online learning.</p>
            </div>
            <div className="feature-card">
              <div className="text-3xl mb-3">💼</div>
              <h3 className="font-semibold text-gray-800 mb-2">Business</h3>
              <p className="text-sm text-gray-600">Workplace meetings and client presentations.</p>
            </div>
            <div className="feature-card">
              <div className="text-3xl mb-3">👨‍👩‍👧‍👦</div>
              <h3 className="font-semibold text-gray-800 mb-2">Family</h3>
              <p className="text-sm text-gray-600">Staying connected with loved ones.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="cta-section">
          <h2 className="cta-title">Ready to Experience Inclusive Communication?</h2>
          <a 
            href="/" 
            className="cta-button"
          >
            Start Inclusive Meeting
          </a>
        </div>
      </main>

      <footer className="footer">
        &copy; 2024 Linzo Meet. Breaking communication barriers with AI technology.
      </footer>
    </div>
  );
};

export default SignLanguageDemo;
