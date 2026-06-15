import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/Toast'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) { toast('Please fill all fields', 'error'); return }
    setLoading(true)
    try {
      const data = await login(username, password)
      toast('Login successful', 'success')
      if (data.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      toast(err.message || 'Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass-strong">
        <h1 className="auth-title">Academicia</h1>
        <p className="auth-subtitle">Document Authentication System</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="glass-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input className="glass-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn-primary" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? <span className="spinner" /> : 'Login'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Don't have  account? </span>
          <button className="auth-link" onClick={() => navigate('/register')}>Register</button>
        </div>
      </div>
    </div>
  )
}
