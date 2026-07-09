import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { toast } from '../components/Toast'
import * as api from '../api'
import EnhancedPdfViewer from '../components/EnhancedPdfViewer'

export default function ViewerPage() {
  const { docId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login')
  }, [navigate])

  async function handleSign(qrPos) {
    setSigning(true)
    try {
      await api.signDocument(docId, qrPos.qr_x, qrPos.qr_y, qrPos.qr_page, qrPos.qr_size || 100)
      toast('Document signed successfully!', 'success')
      navigate('/dashboard')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSigning(false)
    }
  }

  return (
    <div className="viewer-container">
      <div className="viewer-toolbar glass" style={{ padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="viewer-back" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Document: {docId}</span>
        </div>
      </div>
      <EnhancedPdfViewer
        docId={docId}
        role={user?.role}
        onSign={handleSign}
        signing={signing}
      />
    </div>
  )
}
