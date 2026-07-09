import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/Toast'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) { toast('Please fill all fields', 'error'); return }
    if (password.length < 4) { toast('Password must be at least 4 characters', 'error'); return }
    setLoading(true)
    try {
      await register(username, password, role, email)
      toast('Registered successfully! Please login.', 'success')
      navigate('/login')
    } catch (err) {
      toast(err.message || 'Registration failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass-strong">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Register to access the system</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="glass-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input className="glass-input" type="email" placeholder="Email (optional, for password recovery)" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="glass-input" type="password" placeholder="Password (min 4 chars)" value={password} onChange={e => setPassword(e.target.value)} />
          <select className="glass-select" value={role} onChange={e => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="SIGNER">Signer</option>
          </select>
          <button className="btn-primary" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? <span className="spinner" /> : 'Register'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Already have an account? </span>
          <button className="auth-link" onClick={() => navigate('/login')}>Login</button>
        </div>
      </div>
    </div>
  )
}
