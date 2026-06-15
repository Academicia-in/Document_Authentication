import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { toast } from '../../components/Toast'
import * as api from '../../api'

const SIGNER_ROLES = ["Assistant Professor", "Professor", "HOD", "Dean", "Director"]

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [students, setStudents] = useState([])
  const [signers, setSigners] = useState([])
  const [docTypes, setDocTypes] = useState([])
  const [workflows, setWorkflows] = useState({})
  const [adminDocs, setAdminDocs] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [loading, setLoading] = useState({})
  const [modal, setModal] = useState(null)

  const loadDashboard = useCallback(async () => {
    try { const s = await api.adminGetDashboard(); setStats(s) } catch {}
  }, [])

  const loadStudents = useCallback(async () => {
    try { const s = await api.adminGetStudents(); setStudents(s) } catch {}
  }, [])

  const loadSigners = useCallback(async () => {
    try { const s = await api.adminGetSigners(); setSigners(s) } catch {}
  }, [])

  const loadDocTypes = useCallback(async () => {
    try { const t = await api.adminGetDocumentTypes(); setDocTypes(t) } catch {}
  }, [])

  const loadWorkflows = useCallback(async () => {
    try { const w = await api.adminGetWorkflows(); setWorkflows(w) } catch {}
  }, [])

  const loadDocuments = useCallback(async () => {
    try { const d = await api.adminGetDocuments(); setAdminDocs(d) } catch {}
  }, [])

  const loadActivityLogs = useCallback(async () => {
    try { const l = await api.adminGetActivityLogs(); setActivityLogs(l) } catch {}
  }, [])

  async function deleteDocument(docId) {
    if (!confirm('Delete this document permanently?')) return
    try {
      await api.adminDeleteDocument(docId)
      toast('Document deleted', 'success')
      setAdminDocs(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      toast(err.message || 'Delete failed', 'error')
    }
  }

  useEffect(() => { loadDashboard() }, [loadDashboard])
  useEffect(() => { if (section === 'students') loadStudents() }, [section, loadStudents])
  useEffect(() => { if (section === 'signers') loadSigners() }, [section, loadSigners])
  useEffect(() => { if (section === 'doc-types') { loadDocTypes(); loadWorkflows() } }, [section, loadDocTypes, loadWorkflows])
  useEffect(() => { if (section === 'documents') loadDocuments() }, [section, loadDocuments])
  useEffect(() => { if (section === 'logs') loadActivityLogs() }, [section, loadActivityLogs])

  function handleLogout() { logout(); navigate('/login') }

  const sidebarItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'students', label: 'Students', icon: '👥' },
    { key: 'signers', label: 'Signers', icon: '✍️' },
    { key: 'doc-types', label: 'Document Types', icon: '📋' },
    { key: 'documents', label: 'Documents', icon: '📄' },
    { key: 'logs', label: 'Activity Logs', icon: '📜' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  async function handleDeleteStudent(id) {
    if (!confirm('Delete this student?')) return
    try { await api.adminDeleteStudent(id); toast('Student deleted', 'success'); loadStudents() }
    catch (e) { toast(e.message, 'error') }
  }

  async function handleDeleteSigner(id) {
    if (!confirm('Delete this signer?')) return
    try { await api.adminDeleteSigner(id); toast('Signer deleted', 'success'); loadSigners() }
    catch (e) { toast(e.message, 'error') }
  }

  function handleEditStudent(student) {
    setModal({ type: 'student', data: { ...student, password: '' } });
  }

  function handleEditSigner(signer) {
    setModal({ type: 'signer', data: { ...signer, password: '' } });
  }

  // Stats cards
  function StatCard({ label, value, color }) {
    return (
      <div className="glass-card" style={{ padding: 24, flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 32, fontWeight: 700, color }}>{value ?? '-'}</div>
      </div>
    )
  }

  // Generic modal for forms
  function FormModal({ title, fields, onSubmit, onClose, initial }) {
    const [form, setForm] = useState(initial || {})
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        onClick={onClose}>
        <div className="glass-strong" style={{ padding: 32, width: 450, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
          <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 700 }}>{title}</h2>
          {fields.map(f => (
            f.type === 'select' ? (
              <select key={f.key} className="glass-input" style={{ marginBottom: 12 }}
                value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                <option value="">{f.placeholder}</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input key={f.key} className="glass-input" style={{ marginBottom: 12 }}
                placeholder={f.placeholder} type={f.type || 'text'}
                value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
            )
          ))}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn-primary" onClick={() => onSubmit(form)}>Save</button>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-logo">✦ Admin Panel</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '0 16px', marginBottom: 16 }}>{user?.username}</div>
        {sidebarItems.map(item => (
          <button key={item.key} className={`sidebar-item ${section === item.key ? 'active' : ''}`}
            onClick={() => setSection(item.key)}>
            <span>{item.icon}</span> {item.label}
          </button>
        ))}
        <button className="sidebar-item logout" onClick={handleLogout}>
          <span>🚪</span> Logout
        </button>
      </div>

      <div className="main-content">
        {/* ─── DASHBOARD ─── */}
        {section === 'dashboard' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Admin Dashboard</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
              <StatCard label="Total Students" value={stats?.total_students} color="#6C63FF" />
              <StatCard label="Total Signers" value={stats?.total_signers} color="#FF6584" />
              <StatCard label="Total Documents" value={stats?.total_documents} color="#00C9A7" />
              <StatCard label="Pending" value={stats?.pending_documents} color="#FFC107" />
              <StatCard label="Approved" value={stats?.approved_documents} color="#00C9A7" />
              <StatCard label="Rejected" value={stats?.rejected_documents} color="#FF6584" />
              <StatCard label="Signed" value={stats?.signed_documents} color="#6C63FF" />
            </div>
            <div className="glass-strong" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {sidebarItems.filter(i => i.key !== 'dashboard').map(i => (
                  <button key={i.key} className="btn-secondary" onClick={() => setSection(i.key)}>
                    {i.icon} {i.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ─── STUDENTS ─── */}
        {section === 'students' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>Student Management</h1>
              <button className="btn-success" onClick={() => {
                setModal({ type: 'student', data: { username: '', password: '', email: '', full_name: '', department: '' } })
              }}>+ Add Student</button>
            </div>
            <div className="glass-strong" style={{ padding: 24 }}>
              {students.length === 0 ? <div className="empty-state">No students found</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table">
                    <thead><tr><th>EnrollMent Number</th><th>Full Name</th><th>Email</th><th>Department</th><th>Actions</th></tr></thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id}>
                          <td>{s.username}</td>
                          <td>{s.full_name}</td>
                          <td>{s.email}</td>
                          <td>{s.department}</td>
                          <td style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary btn-sm" onClick={() => handleEditStudent(s)}>Edit</button>
                            <button className="btn-danger btn-sm" onClick={() => handleDeleteStudent(s.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── SIGNERS ─── */}
        {section === 'signers' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>Signer Management</h1>
              <button className="btn-success" onClick={() => {
                setModal({ type: 'signer', data: { username: '', password: '', email: '', full_name: '', department: 'Assistant Professor', signer_role: 'Assistant Professor' } })
              }}>+ Add Signer</button>
            </div>
            <div className="glass-strong" style={{ padding: 24 }}>
              {signers.length === 0 ? <div className="empty-state">No signers found</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table">
                    <thead><tr><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                    <tbody>
                      {signers.map(s => (
                        <tr key={s.id}>
                          <td>{s.username}</td>
                          <td>{s.full_name}</td>
                          <td>{s.email}</td>
                          <td><span className="badge badge-signed">{s.department || 'Assistant Professor'}</span></td>
                          <td style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary btn-sm" onClick={() => handleEditSigner(s)}>Edit</button>
                            <button className="btn-danger btn-sm" onClick={() => handleDeleteSigner(s.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── DOCUMENT TYPES ─── */}
        {section === 'doc-types' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>Document Types</h1>
              <button className="btn-success" onClick={() => {
                setModal({ type: 'doc-type', data: { name: '', description: '' } })
              }}>+ Add Type</button>
            </div>
            <div className="glass-strong" style={{ padding: 24, marginBottom: 24 }}>
              {docTypes.length === 0 ? <div className="empty-state">No document types</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table">
                    <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
                    <tbody>
                      {docTypes.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td>{t.description}</td>
                          <td style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary btn-sm" onClick={() => {
                              setModal({ type: 'doc-type', data: { id: t.id, name: t.name, description: t.description } })
                            }}>Edit</button>
                            <button className="btn-danger btn-sm" onClick={async () => {
                              if (!confirm('Delete this type?')) return
                              try { await api.adminDeleteDocumentType(t.id); toast('Deleted', 'success'); loadDocTypes() }
                              catch (e) { toast(e.message, 'error') }
                            }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Approval Workflows</h2>
            <div className="glass-strong" style={{ padding: 24 }}>
              {docTypes.map(dt => (
                <div key={dt.id} style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#6C63FF' }}>{dt.name}</h3>
                  <table className="glass-table">
                    <thead><tr><th>Step</th><th>Required Role</th><th>Actions</th></tr></thead>
                    <tbody>
                      {(workflows[dt.name]?.steps || []).map(step => (
                        <tr key={step.id}>
                          <td>Step {step.step_order}</td>
                          <td><span className="badge badge-pending">{step.signer_role}</span></td>
                          <td>
                            <button className="btn-danger btn-sm" onClick={async () => {
                              if (!confirm('Remove this step?')) return
                              try { await api.adminDeleteWorkflow(step.id); toast('Step removed', 'success'); loadWorkflows() }
                              catch (e) { toast(e.message, 'error') }
                            }}>Remove</button>
                          </td>
                        </tr>
                      ))}
                      {(workflows[dt.name]?.steps || []).length === 0 && (
                        <tr><td colSpan="3"><div className="empty-state">No workflow defined</div></td></tr>
                      )}
                    </tbody>
                  </table>
                  <button className="btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => {
                    setModal({ type: 'workflow', data: { document_type_id: dt.id, step_order: (workflows[dt.name]?.steps?.length || 0) + 1, signer_role: '' } })
                  }}>+ Add Step</button>
                </div>
              ))}
              {docTypes.length === 0 && <div className="empty-state">Add document types first</div>}
            </div>
          </>
        )}

        {/* ─── DOCUMENTS ─── */}
        {section === 'documents' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Document Monitoring</h1>
            <div className="glass-strong" style={{ padding: 24 }}>
              {adminDocs.length === 0 ? <div className="empty-state">No documents found</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table">
                    <thead><tr><th>Student</th><th>Document Type</th><th>Status</th><th>Uploaded</th><th>Download</th><th>Delete</th></tr></thead>
                    <tbody>
                      {adminDocs.map(d => (
                        <tr key={d.id}>
                          <td>{d.student_name}</td>
                          <td>{d.document_type}</td>
                          <td>
                            <span className={`badge ${d.status === 'SIGNED' ? 'badge-signed' : d.status === 'PENDING' ? 'badge-pending' : 'badge-pending'}`}>
                              <span className={`badge-dot ${d.status === 'SIGNED' ? 'badge-dot-signed' : 'badge-dot-pending'}`} />
                              {d.status}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                          <td>
                            {d.signed_pdf ? (
                              <a href={'/' + d.signed_pdf} target="_blank" rel="noreferrer" className="btn-success btn-sm" style={{ textDecoration: 'none' }}>Download</a>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>-</span>
                            )}
                          </td>
                          <td>
                            <button className="btn-danger btn-sm" onClick={() => deleteDocument(d.id)} style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── ACTIVITY LOGS ─── */}
        {section === 'logs' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Activity Logs</h1>
            <div className="glass-strong" style={{ padding: 24 }}>
              {activityLogs.length === 0 ? <div className="empty-state">No activity logs yet</div> : (
                <div style={{ overflowX: 'auto', maxHeight: 600, overflowY: 'auto' }}>
                  <table className="glass-table">
                    <thead><tr><th>Action</th><th>Performed By</th><th>Document</th><th>Timestamp</th></tr></thead>
                    <tbody>
                      {activityLogs.map((l, i) => (
                        <tr key={l.id || i}>
                          <td><span className={`badge ${l.action === 'SIGN' ? 'badge-signed' : 'badge-pending'}`}>{l.action}</span></td>
                          <td>{l.performed_by}</td>
                          <td style={{ fontSize: 12, opacity: 0.6 }}>{l.document_id?.substring(0, 8)}...</td>
                          <td style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{l.timestamp ? new Date(l.timestamp).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── SETTINGS ─── */}
        {section === 'settings' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Profile & Settings</h1>
            <div className="glass-strong" style={{ padding: 24, maxWidth: 500 }}>
              <SettingsForm />
            </div>
          </>
        )}
      </div>

      {/* ─── MODALS ─── */}
      {modal?.type === 'student' && (
        <FormModal title={modal.data.id ? 'Edit Student' : 'Add Student'}
          fields={[
            { key: 'username', placeholder: 'Username / Enrollment No' },
            { key: 'password', placeholder: 'Password', type: 'password' },
            { key: 'full_name', placeholder: 'Full Name' },
            { key: 'email', placeholder: 'Email' },
            { key: 'department', placeholder: 'Department' },
          ]}
          initial={modal.data}
          onClose={() => setModal(null)}
          onSubmit={async form => {
            try {
              if (modal.data.id) {
                const clean = { ...form }; delete clean.id; delete clean.created_at
                await api.adminUpdateStudent(modal.data.id, clean)
                toast('Student updated', 'success')
              } else {
                await api.adminAddStudent(form)
                toast('Student added', 'success')
              }
              setModal(null); loadStudents()
            } catch (e) { toast(e.message, 'error') }
          }}
        />
      )}

      {modal?.type === 'signer' && (
        <FormModal title={modal.data.id ? 'Edit Signer' : 'Add Signer'}
          fields={[
            { key: 'username', placeholder: 'Username' },
            { key: 'password', placeholder: 'Password', type: 'password' },
            { key: 'full_name', placeholder: 'Full Name' },
            { key: 'email', placeholder: 'Email' },
            { key: 'department', placeholder: 'Role', type: 'select', options: SIGNER_ROLES },
          ]}
          initial={{ ...modal.data, department: modal.data.department || 'Assistant Professor' }}
          onClose={() => setModal(null)}
          onSubmit={async form => {
            try {
              if (modal.data.id) {
                const clean = { ...form }; delete clean.id; delete clean.created_at
                await api.adminUpdateSigner(modal.data.id, clean)
                toast('Signer updated', 'success')
              } else {
                await api.adminAddSigner({ ...form, signer_role: form.department })
                toast('Signer added', 'success')
              }
              setModal(null); loadSigners()
            } catch (e) { toast(e.message, 'error') }
          }}
        />
      )}

      {modal?.type === 'doc-type' && (
        <FormModal title={modal.data.id ? 'Edit Document Type' : 'Add Document Type'}
          fields={[
            { key: 'name', placeholder: 'Document Type Name (e.g. Bonafide Certificate)' },
            { key: 'description', placeholder: 'Description (optional)' },
          ]}
          initial={modal.data}
          onClose={() => setModal(null)}
          onSubmit={async form => {
            try {
              if (modal.data.id) {
                await api.adminUpdateDocumentType(modal.data.id, form)
                toast('Type updated', 'success')
              } else {
                await api.adminAddDocumentType(form)
                toast('Type added', 'success')
              }
              setModal(null); loadDocTypes()
            } catch (e) { toast(e.message, 'error') }
          }}
        />
      )}

      {modal?.type === 'workflow' && (
        <FormModal title="Add Approval Step"
          fields={[
            { key: 'step_order', placeholder: 'Step Number (e.g. 1, 2, 3)', type: 'number' },
            { key: 'signer_role', placeholder: 'Required Role', type: 'select', options: SIGNER_ROLES },
          ]}
          initial={modal.data}
          onClose={() => setModal(null)}
          onSubmit={async form => {
            try {
              await api.adminAddWorkflowStep(form)
              toast('Workflow step added', 'success')
              setModal(null); loadWorkflows()
            } catch (e) { toast(e.message, 'error') }
          }}
        />
      )}
    </div>
  )
}

function SettingsForm() {
  const [form, setForm] = useState({ current_password: '', new_password: '', email: '', full_name: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.current_password) { toast('Enter current password', 'error'); return }
    setLoading(true)
    try {
      const clean = { ...form }
      if (!clean.new_password) delete clean.new_password
      if (!clean.email) delete clean.email
      if (!clean.full_name) delete clean.full_name
      await api.adminUpdateProfile(clean)
      toast('Profile updated', 'success')
      setForm({ current_password: '', new_password: '', email: '', full_name: '' })
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input className="glass-input" placeholder="Current Password *" type="password"
        value={form.current_password} onChange={e => setForm({ ...form, current_password: e.target.value })} />
      <input className="glass-input" placeholder="New Password (leave blank to keep)" type="password"
        value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })} />
      <input className="glass-input" placeholder="Email"
        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <input className="glass-input" placeholder="Full Name"
        value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
      <button className="btn-primary" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
        {loading ? <span className="spinner" /> : 'Update Profile'}
      </button>
    </form>
  )
}
