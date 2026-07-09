import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Header({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 8 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{title}</h1>
      </div>
      <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {user?.username}
          <span className="role-badge" style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 6, fontSize: 11, background: 'rgba(108,99,255,0.15)', color: '#6C63FF', border: '1px solid rgba(108,99,255,0.2)' }}>
            {user?.role}
          </span>
        </span>
        <button className="btn-danger btn-sm" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  )
}
