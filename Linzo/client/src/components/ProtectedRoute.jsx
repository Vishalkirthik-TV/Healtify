import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../lib/api'

import Loader from './Loader'

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        await api.get('/auth/me')
        if (!cancelled) {
          setAllowed(true)
        }
      } catch {
        const next = encodeURIComponent(location.pathname + location.search)
        navigate(`/login?next=${next}`, { replace: true })
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [location.pathname, location.search, navigate])

  if (checking) return <div className="h-screen flex items-center justify-center"><Loader size="large" /></div>
  if (!allowed) return null
  return children
}


