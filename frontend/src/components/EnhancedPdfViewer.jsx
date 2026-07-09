import { useState, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { BASE } from '../api'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const QR_SIZE = 100

export default function EnhancedPdfViewer({ docId, role, onSign, signing }) {
  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState(null)
  const [pageHeight, setPageHeight] = useState(792)

  const [placingQr, setPlacingQr] = useState(false)
  const [qrX, setQrX] = useState(200)
  const [qrY, setQrY] = useState(200)
  const [qrDragging, setQrDragging] = useState(false)
  const [dragOffX, setDragOffX] = useState(0)
  const [dragOffY, setDragOffY] = useState(0)
  const [qrPage, setQrPage] = useState(1)

  const containerRef = useRef(null)
  const pageWrapRef = useRef(null)
  const qrRef = useRef(null)

  const token = localStorage.getItem('token')

  const fileWithAuth = {
    url: `${BASE}/document/${docId}`,
    httpHeaders: token ? { 'Authorization': `Bearer ${token}` } : {},
  }

  function onDocLoad({ numPages }) {
    setNumPages(numPages)
  }

  function onPageLoad(page) {
    const vp = page.getViewport({ scale: 1 })
    setPageHeight(vp.height)
  }

  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 3))
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25))
  const fitToWidth = () => setZoom(1)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const onQrMouseDown = (e) => {
    if (!placingQr) return
    e.preventDefault()
    e.stopPropagation()
    const rect = qrRef.current.getBoundingClientRect()
    setDragOffX(e.clientX - rect.left)
    setDragOffY(e.clientY - rect.top)
    setQrDragging(true)
  }

  const onWrapMouseMove = (e) => {
    if (!qrDragging || !placingQr) return
    const wrapRect = pageWrapRef.current?.getBoundingClientRect()
    if (!wrapRect) return
    const newX = e.clientX - wrapRect.left - dragOffX
    const newY = e.clientY - wrapRect.top - dragOffY
    const sz = QR_SIZE * zoom
    setQrX(Math.max(0, Math.min(newX, wrapRect.width - sz)))
    setQrY(Math.max(0, Math.min(newY, wrapRect.height - sz)))
  }

  const onWrapMouseUp = () => setQrDragging(false)
  const onWrapMouseLeave = () => setQrDragging(false)

  const resetQr = () => {
    setQrX(200)
    setQrY(200)
  }

  const confirmSign = () => {
    const pdfX = Math.round(qrX / zoom)
    const pdfY = Math.round(pageHeight - (qrY / zoom) - QR_SIZE)
    onSign({
      qr_x: Math.max(0, pdfX),
      qr_y: Math.max(0, pdfY),
      qr_page: qrPage - 1,
    })
  }

  const qrScreenSize = QR_SIZE * zoom

  if (error) {
    return (
      <div className="glass-strong" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6584' }}>
        Error: {error}
      </div>
    )
  }

  return (
    <div className="glass-strong" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        <button className="btn-secondary btn-sm" onClick={zoomOut} title="Zoom Out">−</button>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, minWidth: 50, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button className="btn-secondary btn-sm" onClick={zoomIn} title="Zoom In">+</button>
        <button className="btn-secondary btn-sm" onClick={fitToWidth} title="Fit to Width">Fit</button>
        <button className="btn-secondary btn-sm" onClick={toggleFullscreen} title="Fullscreen">⛶</button>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

        <button className="btn-secondary btn-sm" disabled={pageNum <= 1} onClick={() => setPageNum(p => p - 1)}>‹</button>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
          Page <input type="number" value={pageNum} min={1} max={numPages}
            onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= numPages) setPageNum(v) }}
            style={{ width: 40, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#fff', textAlign: 'center', padding: '2px 4px', fontSize: 12 }} />
          {' / '}{numPages}
        </span>
        <button className="btn-secondary btn-sm" disabled={pageNum >= numPages} onClick={() => setPageNum(p => p + 1)}>›</button>

        {role === 'SIGNER' && (
          <>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
            {!placingQr ? (
              <button className="btn-warning btn-sm" onClick={() => { setPlacingQr(true); setQrX(200); setQrY(200) }}>
                Place QR
              </button>
            ) : (
              <>
                <span style={{ color: '#FFC107', fontSize: 11 }}>QR: ({Math.round(qrX / zoom)}, {Math.round(pageHeight - qrY / zoom - QR_SIZE)})</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>on pg</span>
                <input type="number" value={qrPage} min={1} max={numPages}
                  onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= numPages) setQrPage(v) }}
                  style={{ width: 40, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,201,7,0.3)', borderRadius: 4, color: '#FFC107', textAlign: 'center', padding: '2px 4px', fontSize: 12 }} />
                <button className="btn-secondary btn-sm" onClick={resetQr}>Reset</button>
                <button className="btn-success btn-sm" onClick={confirmSign} disabled={signing}>
                  {signing ? <span className="spinner" /> : 'Confirm & Sign'}
                </button>
                <button className="btn-secondary btn-sm" onClick={() => setPlacingQr(false)}>Cancel</button>
              </>
            )}
          </>
        )}
      </div>

      <div ref={containerRef}
        onMouseMove={onWrapMouseMove}
        onMouseUp={onWrapMouseUp}
        onMouseLeave={onWrapMouseLeave}
        style={{ flex: 1, overflow: 'auto', position: 'relative', cursor: placingQr ? 'crosshair' : 'default', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', padding: 12 }}>
        <Document
          file={fileWithAuth}
          onLoadSuccess={onDocLoad}
          onLoadError={err => setError(err.message)}
          loading={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          }>
          <div ref={pageWrapRef} style={{ position: 'relative', display: 'inline-block' }}>
            <Page
              pageNumber={pageNum}
              scale={zoom}
              onLoadSuccess={onPageLoad}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
            {placingQr && (
              <div ref={qrRef}
                onMouseDown={onQrMouseDown}
                style={{
                  position: 'absolute', left: qrX, top: qrY,
                  width: qrScreenSize, height: qrScreenSize,
                  border: '2px dashed #FFC107',
                  background: 'rgba(255, 193, 7, 0.15)',
                  borderRadius: 4, cursor: 'move',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: Math.max(8, qrScreenSize * 0.08),
                  color: '#FFC107', fontWeight: 600, userSelect: 'none',
                  pointerEvents: 'auto', zIndex: 10,
                  boxShadow: '0 0 20px rgba(255,193,7,0.3)',
                }}>
                QR
              </div>
            )}
          </div>
        </Document>
      </div>
    </div>
  )
}
