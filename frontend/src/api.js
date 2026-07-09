const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

export { BASE }

async function request(url, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...options.headers }
  if (token && !url.includes('/login') && !url.includes('/register') && !url.includes('/verify')) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(BASE + url, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export function login(username, password) {
  const params = new URLSearchParams({ username, password })
  return fetch(BASE + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Invalid credentials'); return r.json() })
}

export function register(username, password, role, email = '') {
  const params = new URLSearchParams({ username, password, role, email })
  return fetch(BASE + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Registration failed'); return r.json() })
}

export function getSigners() {
  return request('/signers')
}

export function uploadDoc(file, signerId) {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('file', file)
  formData.append('signer_id', signerId)
  return fetch(BASE + '/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }).then(r => { if (!r.ok) throw new Error('Upload failed'); return r.json() })
}

export function signDocument(docId, qr_x = 450, qr_y = 700, qr_page = 0, qr_size = 100) {
  const params = new URLSearchParams({ qr_x, qr_y, qr_page, qr_size })
  const token = localStorage.getItem('token')
  return fetch(BASE + '/sign/' + docId, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Signing failed'); return r.json() })
}

async function fetchWithRetry(url, retries = 10, delay = 3000) {
  const cacheBuster = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(cacheBuster, { cache: 'no-store' })
      if (res.ok) return res.json()
      if (res.status === 503 && i < retries - 1) {
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      return res.json()
    } catch {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw new Error('Service unavailable, please try again')
    }
  }
  throw new Error('Service unavailable, please try again')
}

export function verifyDocument(docId) {
  return fetchWithRetry(BASE + '/api/verify/' + docId)
}

export function getUserDocuments() {
  return request('/user/documents')
}

export function getSignerPending() {
  return request('/signer/pending')
}

export function getSignerSigned() {
  return request('/signer/signed')
}

export function getAuditLogs(docId) {
  return request('/audit/' + docId)
}

// Admin API
export function adminGetDashboard() {
  return request('/admin/dashboard')
}

export function adminGetStudents() {
  return request('/admin/students')
}

export function adminAddStudent(data) {
  const params = new URLSearchParams(data)
  return fetch(BASE + '/admin/students', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Failed to add student'); return r.json() })
}

export function adminUpdateStudent(id, data) {
  const params = new URLSearchParams(data)
  return fetch(BASE + '/admin/students/' + id, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Failed to update student'); return r.json() })
}

export function adminDeleteStudent(id) {
  return request('/admin/students/' + id, { method: 'DELETE' })
}

export function adminGetSigners() {
  return request('/admin/signers')
}

export function adminAddSigner(data) {
  const params = new URLSearchParams(data)
  return fetch(BASE + '/admin/signers', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Failed to add signer'); return r.json() })
}

export function adminUpdateSigner(id, data) {
  const params = new URLSearchParams(data)
  return fetch(BASE + '/admin/signers/' + id, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Failed to update signer'); return r.json() })
}

export function adminDeleteSigner(id) {
  return request('/admin/signers/' + id, { method: 'DELETE' })
}

export function adminGetDocumentTypes() {
  return request('/admin/document-types')
}

export function adminAddDocumentType(data) {
  const params = new URLSearchParams(data)
  return fetch(BASE + '/admin/document-types', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Failed to add document type'); return r.json() })
}

export function adminUpdateDocumentType(id, data) {
  const params = new URLSearchParams(data)
  return fetch(BASE + '/admin/document-types/' + id, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Failed to update document type'); return r.json() })
}

export function adminDeleteDocumentType(id) {
  return request('/admin/document-types/' + id, { method: 'DELETE' })
}

export function adminGetWorkflows() {
  return request('/admin/workflows')
}

export function adminAddWorkflowStep(data) {
  const params = new URLSearchParams(data)
  return fetch(BASE + '/admin/workflows', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Failed to add workflow step'); return r.json() })
}

export function adminDeleteWorkflow(id) {
  return request('/admin/workflows/' + id, { method: 'DELETE' })
}

export function adminGetDocuments(status) {
  let url = '/admin/documents'
  if (status) url += '?status=' + status
  return request(url)
}

export function adminDeleteDocument(docId) {
  return request('/admin/documents/' + docId, { method: 'DELETE' })
}

export function adminGetActivityLogs() {
  return request('/admin/activity-logs')
}

export function sendForgotOtp(email) {
  const params = new URLSearchParams({ email })
  return fetch(BASE + '/forgot-password/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.detail) }); return r.json() })
}

export function verifyForgotOtp(email, otp) {
  const params = new URLSearchParams({ email, otp })
  return fetch(BASE + '/forgot-password/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.detail) }); return r.json() })
}

export function resetPassword(email, newPassword, resetToken) {
  const params = new URLSearchParams({ email, new_password: newPassword, reset_token: resetToken })
  return fetch(BASE + '/forgot-password/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.detail) }); return r.json() })
}

export function adminUpdateProfile(data) {
  const params = new URLSearchParams(data)
  return fetch(BASE + '/admin/profile', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => { if (!r.ok) throw new Error('Failed to update profile'); return r.json() })
}
