import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { verifyDocument, BASE } from '../api'

export default function VerificationPage() {
  const { docId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!docId) return
    setLoading(true)
    verifyDocument(docId)
      .then(setData)
      .catch(err => setError(err.message || 'Verification failed'))
      .finally(() => setLoading(false))
  }, [docId])

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card glass-strong" style={{ textAlign: 'center', padding: 48, maxWidth: 520, width: '90%' }}>
          <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 20px' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Verifying document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-container">
        <div className="auth-card glass-strong" style={{ textAlign: 'center', padding: 48, maxWidth: 520, width: '90%' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Verification Error</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
        </div>
      </div>
    )
  }

  const isSigned = data?.status === 'VALID' || data?.status === 'SIGNED'

  return (
    <div className="auth-container">
      <div className="auth-card glass-strong" style={{ maxWidth: 560, width: '90%', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 72, marginBottom: 8 }}>
            {isSigned ? '✅' : '⚠️'}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            {isSigned ? 'Document Verified' : 'Document Not Verified'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            {isSigned ? 'This document is authentic and digitally signed.' : data?.message || 'Unknown status'}
          </p>
        </div>

        <div style={{
          background: isSigned ? 'rgba(0, 201, 167, 0.1)' : 'rgba(255, 101, 132, 0.1)',
          border: `1px solid ${isSigned ? 'rgba(0, 201, 167, 0.3)' : 'rgba(255, 101, 132, 0.3)'}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24
        }}>
          <Row label="Status" value={
            <span style={{ fontWeight: 600, color: isSigned ? '#00c9a7' : '#ff6584', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
              {data?.status}
            </span>
          } />
          <Row label="Document Name" value={data?.document_name} />
          {data?.document_type && <Row label="Document Type" value={data.document_type} />}
          <Row label="Student Name" value={data?.uploader_name} />
          <Row label="Enrollment Number" value={data?.enrollment_number} />
          <Row label="Department" value={data?.department} />
          {data?.signer_name && <Row label="Signed By" value={data.signer_name} />}
          <Row label="Uploaded Date" value={data?.uploaded_at ? formatDate(data.uploaded_at) : '-'} />
          <Row label="Signed Date" value={data?.signed_at ? formatDate(data.signed_at) : '-'} />
          {data?.document_id && <Row label="Document ID" value={<code style={{ fontSize: 12, opacity: 0.6 }}>{data.document_id}</code>} />}
          {data?.verification_id && <Row label="Verification ID" value={<code style={{ fontSize: 12, opacity: 0.6 }}>{data.verification_id}</code>} />}
        </div>

        {data?.signed_pdf_url && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button
              onClick={() => window.open(BASE + data.signed_pdf_url, '_blank')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: '#fff',
                padding: '12px 32px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              View Signed Document
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
            Verified via Academicia Document Authentication System
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flexShrink: 0, minWidth: 140 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: 13, textAlign: 'right', wordBreak: 'break-all' }}>{value ?? '-'}</span>
    </div>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}
