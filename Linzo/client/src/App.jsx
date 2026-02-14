import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import ProtectedRoute from './components/ProtectedRoute.jsx'

const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const IntegratedRoom = lazy(() => import('./pages/IntegratedRoom.jsx'))
const MultiCallLobby = lazy(() => import('./pages/MultiCallLobby.jsx'))
const MultiCallRoom = lazy(() => import('./pages/MultiCallRoom.jsx'))
const SummaryCallLobby = lazy(() => import('./pages/SummaryCallLobby.jsx'))
const SummaryCallRoom = lazy(() => import('./pages/SummaryCallRoom.jsx'))
const CallHistory = lazy(() => import('./pages/CallHistory.jsx'))
const CallDetails = lazy(() => import('./pages/CallDetails.jsx'))
const SignLanguageDemo = lazy(() => import('./pages/SignLanguageDemo.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))

import Loader from './components/Loader.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader size="large" /></div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/room/:roomId" element={<Navigate to="/dashboard" replace />} />
          <Route path="/integrated-room/:roomId" element={<ProtectedRoute><IntegratedRoom /></ProtectedRoute>} />
          <Route path="/multicall" element={<ProtectedRoute><MultiCallLobby /></ProtectedRoute>} />
          <Route path="/multicall/room/:roomId" element={<ProtectedRoute><MultiCallRoom /></ProtectedRoute>} />
          <Route path="/summary-call" element={<ProtectedRoute><SummaryCallLobby /></ProtectedRoute>} />
          <Route path="/summary-call/room/:roomId" element={<ProtectedRoute><SummaryCallRoom /></ProtectedRoute>} />
          <Route path="/summary-call/history" element={<ProtectedRoute><CallHistory /></ProtectedRoute>} />
          <Route path="/summary-call/:roomId/details" element={<ProtectedRoute><CallDetails /></ProtectedRoute>} />
          <Route path="/demo" element={<SignLanguageDemo />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
