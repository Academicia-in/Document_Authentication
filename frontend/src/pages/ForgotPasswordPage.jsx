import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../components/Toast'
import * as api from '../api'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSendOtp(e) {
    e.preventDefault()
    if (!email) { toast('Enter your email', 'error'); return }
    setLoading(true)
    try {
      await api.sendForgotOtp(email)
      toast('OTP sent to your email', 'success')
      setStep('otp')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (!otp) { toast('Enter the OTP', 'error'); return }
    setLoading(true)
    try {
      const data = await api.verifyForgotOtp(email, otp)
      setResetToken(data.reset_token)
      toast('OTP verified', 'success')
      setStep('reset')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 4) { toast('Password must be at least 4 characters', 'error'); return }
    setLoading(true)
    try {
      await api.resetPassword(email, newPassword, resetToken)
      toast('Password reset successfully! Please login.', 'success')
      navigate('/login')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass-strong">
        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-subtitle">
          {step === 'email' && 'Enter your registered email to receive an OTP'}
          {step === 'otp' && 'Enter the 6-digit OTP sent to your email'}
          {step === 'reset' && 'Enter your new password'}
        </p>

        {step === 'email' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input className="glass-input" type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn-primary" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? <span className="spinner" /> : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input className="glass-input" placeholder="6-digit OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            <button className="btn-primary" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? <span className="spinner" /> : 'Verify OTP'}
            </button>
            <button className="btn-secondary" type="button" onClick={handleSendOtp} disabled={loading}>
              Resend OTP
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input className="glass-input" type="password" placeholder="New password (min 4 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <button className="btn-primary" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? <span className="spinner" /> : 'Reset Password'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Remember your password? </span>
          <button className="auth-link" onClick={() => navigate('/login')}>Login</button>
        </div>
      </div>
    </div>
  )
}
