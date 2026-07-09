import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import { toast } from '../components/Toast'
import * as api from '../api'
import { BASE } from '../api'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('upload')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [signers, setSigners] = useState([])
  const [userDocs, setUserDocs] = useState([])
  const [signerPending, setSignerPending] = useState([])
  const [signerSigned, setSignerSigned] = useState([])
  const [loading, setLoading] = useState({})

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedSigner, setSelectedSigner] = useState('')

  // Verify state
  const [verifyId, setVerifyId] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)

  // Audit state
  const [auditDocId, setAuditDocId] = useState('')
  const [auditLogs, setAuditLogs] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const docs = await api.getUserDocuments()
      setUserDocs(Array.isArray(docs) ? docs : [])
    } catch { setUserDocs([]) }
    if (user?.role === 'SIGNER') {
      try { const p = await api.getSignerPending(); setSignerPending(Array.isArray(p) ? p : []) } catch { setSignerPending([]) }
      try { const s = await api.getSignerSigned(); setSignerSigned(Array.isArray(s) ? s : []) } catch { setSignerSigned([]) }
    }
  }, [user])

  const loadSigners = useCallback(async () => {
    try { const s = await api.getSigners(); setSigners(Array.isArray(s) ? s : []) } catch { setSigners([]) }
  }, [])

  useEffect(() => { loadData(); loadSigners() }, [loadData, loadSigners])

  async function handleUpload() {
    if (!selectedFile) { toast('Select a file', 'error'); return }
    if (!selectedSigner) { toast('Select a signer', 'error'); return }
    setLoading(prev => ({ ...prev, upload: true }))
    try {
      const data = await api.uploadDoc(selectedFile, selectedSigner)
      toast(`Uploaded! Document ID: ${data.document_id}`, 'success')
      setSelectedFile(null)
      setSelectedSigner('')
      loadData()
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(prev => ({ ...prev, upload: false })) }
  }

  async function handleSign(docId) {
    setLoading(prev => ({ ...prev, [docId]: true }))
    try {
      await api.signDocument(docId)
      toast('Document signed successfully!', 'success')
      loadData()
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(prev => ({ ...prev, [docId]: false })) }
  }

  async function handleVerify() {
    if (!verifyId) { toast('Enter document ID', 'error'); return }
    const data = await api.verifyDocument(verifyId)
    setVerifyResult(data)
  }

  async function handleAudit() {
    if (!auditDocId) { toast('Enter document ID', 'error'); return }
    try {
      const logs = await api.getAuditLogs(auditDocId)
      setAuditLogs(logs)
      if (!logs || logs.length === 0) toast('No audit logs found', 'info')
    } catch { toast('Failed to fetch audit logs', 'error') }
  }

  function copyId(id) {
    navigator.clipboard.writeText(id)
    toast('ID copied!', 'success')
  }

  const sidebarItems = [
    ...(user?.role === 'SIGNER' ? [{ key: 'signer', label: 'Signer Panel', icon: '✍️' }] : []),
    { key: 'upload', label: 'Upload Document', icon: '📄' },
    { key: 'mydocs', label: 'My Documents', icon: '📋' },
    { key: 'verify', label: 'Verify', icon: '✓' },
    { key: 'audit', label: 'Audit Logs', icon: '📜' },
    
  ]

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
        <span>{sidebarOpen ? '✕' : '☰'}</span> Menu
      </button>
      <div className="sidebar">
        <div className="sidebar-logo">✦ Academicia</div>
        {sidebarItems.map(item => (
          <button key={item.key} className={`sidebar-item ${activeSection === item.key ? 'active' : ''}`}
            onClick={() => { setActiveSection(item.key); setSidebarOpen(false) }}>
            <span>{item.icon}</span> {item.label}
          </button>
        ))}
        <button className="sidebar-item logout" onClick={() => { navigate('/login'); }}>
          <span>🚪</span> Logout
        </button>
      </div>

      <div className="main-content">
        <Header title="Dashboard" />

        {/* Upload Section */}
        {activeSection === 'upload' && (
          <div className="glass-strong" style={{ padding: 32 }}>
            <div className="section-title"><span className="icon">📄</span> Upload Document</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
              <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
                <div className="upload-icon">📁</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                  {selectedFile ? selectedFile.name : 'Click to select a PDF file'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>PDF files only</div>
                <input id="fileInput" type="file" accept=".pdf" className="file-input-hidden"
                  onChange={e => setSelectedFile(e.target.files[0] || null)} />
              </div>
              <select className="glass-select" value={selectedSigner} onChange={e => setSelectedSigner(e.target.value)}>
                <option value="">Select Signer</option>
                {signers.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
              </select>
              <button className="btn-success" onClick={handleUpload} disabled={loading.upload}
                style={{ alignSelf: 'flex-start', opacity: loading.upload ? 0.7 : 1 }}>
                {loading.upload ? <span className="spinner" /> : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {/* My Documents Section */}
        {activeSection === 'mydocs' && (
          <div className="glass-strong" style={{ padding: 32 }}>
            <div className="section-title"><span className="icon">📋</span> My Documents</div>
            {userDocs.length === 0 ? (
              <div className="empty-state">No documents yet. Upload your first document!</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="glass-table">
                  <thead><tr><th>Document ID</th><th>Signer</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {userDocs.map(d => (
                      <tr key={d.id}>
                        <td><span className="truncate">{d.id}</span><button className="copy-btn" onClick={() => copyId(d.id)}>Copy</button></td>
                        <td>{d.signer}</td>
                        <td><StatusBadge status={d.status} /></td>
                        <td>
                          {d.signed_pdf ? (
                            <a href={BASE + d.signed_pdf} target="_blank" rel="noreferrer" className="btn-success btn-sm" style={{ textDecoration: 'none', display: 'inline-block' }}>
                              Download
                            </a>
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Awaiting signature</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Verify Section */}
        {activeSection === 'verify' && (
          <div className="glass-strong" style={{ padding: 32 }}>
            <div className="section-title"><span className="icon">✓</span> Verify Document</div>
            <div style={{ display: 'flex', gap: 12, maxWidth: 500 }}>
              <input className="glass-input" placeholder="Enter Document ID" value={verifyId}
                onChange={e => { setVerifyId(e.target.value); setVerifyResult(null) }} />
              <button className="btn-primary" onClick={handleVerify}>Verify</button>
            </div>
            {verifyResult && (
              <div className={`verify-result ${verifyResult.status && verifyResult.status.includes('Valid') ? 'verify-valid' : 'verify-invalid'}`}>
                {verifyResult.status || 'Document not found'}
              </div>
            )}
          </div>
        )}

        {/* Audit Logs Section */}
        {activeSection === 'audit' && (
          <div className="glass-strong" style={{ padding: 32 }}>
            <div className="section-title"><span className="icon">📜</span> Audit Logs</div>
            <div style={{ display: 'flex', gap: 12, maxWidth: 500, marginBottom: 20 }}>
              <input className="glass-input" placeholder="Enter Document ID" value={auditDocId} onChange={e => { setAuditDocId(e.target.value); setAuditLogs(null) }} />
              <button className="btn-primary" onClick={handleAudit}>Search</button>
            </div>
            {auditLogs !== null && (
              auditLogs.length === 0 ? (
                <div className="empty-state">No audit logs found for this document</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table">
                    <thead><tr><th>Action</th><th>Performed By</th><th>Timestamp</th></tr></thead>
                    <tbody>
                      {auditLogs.map((log, i) => (
                        <tr key={log.id || i}>
                          <td><StatusBadge status={log.action} /></td>
                          <td>{log.performed_by}</td>
                          <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* Signer Panel */}
        {activeSection === 'signer' && user?.role === 'SIGNER' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Pending to Sign */}
            <div className="glass-strong" style={{ padding: 32 }}>
              <div className="section-title"><span className="icon">⏳</span> Pending to Sign</div>
              {signerPending.length === 0 ? (
                <div className="empty-state">No pending documents assigned to you</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table">
                    <thead><tr><th>Document ID</th><th>Uploaded By</th><th>Actions</th></tr></thead>
                    <tbody>
                      {signerPending.map(d => (
                        <tr key={d.id}>
                          <td><span className="truncate">{d.id}</span><button className="copy-btn" onClick={() => copyId(d.id)}>Copy</button></td>
                          <td>{d.uploaded_by}</td>
                          <td style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary btn-sm" onClick={() => navigate(`/viewer/${d.id}`)}>View</button>
                            <button className="btn-success btn-sm" onClick={() => handleSign(d.id)} disabled={loading[d.id]}
                              style={{ opacity: loading[d.id] ? 0.7 : 1 }}>
                              {loading[d.id] ? <span className="spinner" /> : 'Sign'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {/* Signed by Me */}
            <div className="glass-strong" style={{ padding: 32 }}>
              <div className="section-title"><span className="icon">✅</span> Signed Documents</div>
              {signerSigned.length === 0 ? (
                <div className="empty-state">No signed documents yet</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table">
                    <thead><tr><th>Document ID</th><th>Download</th></tr></thead>
                    <tbody>
                      {signerSigned.map(d => (
                        <tr key={d.id}>
                          <td><span className="truncate">{d.id}</span><button className="copy-btn" onClick={() => copyId(d.id)}>Copy</button></td>
                          <td>
                            <a href={BASE + d.signed_pdf} target="_blank" rel="noreferrer" className="btn-success btn-sm" style={{ textDecoration: 'none', display: 'inline-block' }}>
                              Download PDF
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
