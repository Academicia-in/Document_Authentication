from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from fastapi import Depends
from fastapi.security import OAuth2PasswordRequestForm
from backend.database import SessionLocal, Document, User, AuditLog
from backend.admin_routes import router as admin_router

import shutil
import uuid
import os
import smtplib
from email.message import EmailMessage

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from jose import jwt, JWTError
from datetime import datetime, timedelta

import qrcode
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
UPLOAD_FOLDER = os.path.join(BASE_DIR, "documents")
OUTPUT_FOLDER = os.path.join(BASE_DIR, "output")
REACT_DIST = os.path.join(PROJECT_ROOT, "frontend", "dist")
REACT_ASSETS = os.path.join(REACT_DIST, "assets")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# ─── DB Migration: add missing columns to existing tables ───
def run_migrations():
    import sqlalchemy as sa
    from sqlalchemy import inspect
    try:
        from backend.database import Base, engine
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        inspector = inspect(db.bind)
        cols = [c["name"] for c in inspector.get_columns("documents")]
        if "document_name" not in cols:
            db.execute(sa.text("ALTER TABLE documents ADD COLUMN document_name VARCHAR"))
        if "verification_id" not in cols:
            db.execute(sa.text("ALTER TABLE documents ADD COLUMN verification_id VARCHAR"))
            db.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_documents_verification_id ON documents (verification_id)"))
        db.commit()
        db.close()
    except Exception:
        pass

try:
    run_migrations()
except Exception:
    pass

raw = os.getenv("CORS_ORIGINS", "")
cors_origins = ["*"] if not raw else [o.strip() for o in raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── SMTP Email ───
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

def send_email(to_email, subject, body):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        return False
    try:
        msg = EmailMessage()
        msg.set_content(body)
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"SMTP error: {e}")
        return False

app.mount("/docs", StaticFiles(directory=UPLOAD_FOLDER), name="documents")
app.mount("/output", StaticFiles(directory=OUTPUT_FOLDER), name="output")
if os.path.isdir(REACT_ASSETS):
    app.mount("/assets", StaticFiles(directory=REACT_ASSETS), name="react-assets")

app.include_router(admin_router)

@app.get("/")
async def serve_root():
    if os.path.isdir(REACT_DIST):
        return FileResponse(os.path.join(REACT_DIST, "index.html"))
    return {"message": "Backend running"}

@app.get("/login")
async def serve_login():
    return FileResponse(os.path.join(REACT_DIST, "index.html"))

@app.get("/register")
async def serve_register():
    return FileResponse(os.path.join(REACT_DIST, "index.html"))

@app.get("/forgot-password")
async def serve_forgot_password():
    return FileResponse(os.path.join(REACT_DIST, "index.html"))

@app.get("/dashboard")
async def serve_dashboard():
    return FileResponse(os.path.join(REACT_DIST, "index.html"))

@app.get("/viewer/{doc_id}")
async def serve_viewer(doc_id: str):
    return FileResponse(os.path.join(REACT_DIST, "index.html"))

@app.get("/admin")
@app.get("/admin/{path:path}")
async def serve_admin():
    return FileResponse(os.path.join(REACT_DIST, "index.html"))

from backend.auth_utils import hash_password, verify_password, create_access_token, get_current_user, SECRET_KEY, ALGORITHM, generate_otp, store_otp, verify_otp

def hash_file(filepath):
    digest = hashes.Hash(hashes.SHA256())
    with open(filepath, "rb") as f:
        while chunk := f.read(4096):
            digest.update(chunk)
    return digest.finalize()

def log_action(document_id, action, user):
    db = SessionLocal()
    log = AuditLog(
        id=str(uuid.uuid4()),
        document_id=document_id,
        action=action,
        performed_by=user
    )
    db.add(log)
    db.commit()
    db.close()

@app.post("/register")
def register(
    username: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    email: str = Form("")
):
    db = SessionLocal()
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        db.close()
        raise HTTPException(status_code=400, detail="User already exists")
    if email:
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            db.close()
            raise HTTPException(status_code=400, detail="Email already in use")
    user = User(
        id=str(uuid.uuid4()),
        username=username,
        hashed_password=hash_password(password),
        role=role,
        email=email or None
    )
    db.add(user)
    db.commit()
    db.close()
    return {"message": "User registered successfully"}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        db.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    db.close()
    return {"access_token": token, "token_type": "bearer","username": user.username,
    "role": user.role}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...),signer_id: str = Form(...),current_user: User = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    file_location = f"{UPLOAD_FOLDER}/{doc_id}.pdf"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    original_name = file.filename or f"{doc_id}.pdf"
    db = SessionLocal()
    new_doc = Document(
    id=doc_id,
    file_path=file_location,
    document_name=original_name,
    uploaded_by=current_user.id,
    signer_id=signer_id,
    verification_id=str(uuid.uuid4()),
    status="PENDING"
)
    db.add(new_doc)
    db.commit()
    signer_user = db.query(User).filter(User.id == signer_id).first()
    db.close()
    log_action(doc_id, "UPLOAD", current_user.username)
    if signer_user and signer_user.email:
        send_email(
            to_email=signer_user.email,
            subject="New Document Assigned for Signing",
            body=f"Hello {signer_user.username},\n\nA new document has been assigned to you for signing by {current_user.username}.\n\nDocument ID: {doc_id}\n\nPlease log in to the system to view and sign the document.\n\n— Academicia Document System"
        )
    return {
        "message": "Document uploaded successfully",
        "document_id": doc_id,
        "status": "PENDING"
    }

# ─── Forgot Password ───
@app.post("/forgot-password/send-otp")
def send_otp(email: str = Form(...)):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        raise HTTPException(status_code=500, detail="Email service not configured. Contact your administrator.")
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    db.close()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")
    otp = generate_otp()
    store_otp(email, otp)
    sent = send_email(
        to_email=email,
        subject="Password Reset OTP",
        body=f"Your OTP for password reset is: {otp}\n\nThis OTP is valid for 10 minutes.\n\n— Academicia Document System"
    )
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send email. Check your SMTP settings.")
    return {"message": "OTP sent to your email"}

@app.post("/forgot-password/verify-otp")
def verify_otp_endpoint(email: str = Form(...), otp: str = Form(...)):
    if not verify_otp(email, otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    reset_token = create_access_token(
        data={"sub": email, "purpose": "reset_password"},
        expires_delta=timedelta(minutes=10)
    )
    return {"message": "OTP verified", "reset_token": reset_token}

@app.post("/forgot-password/reset")
def reset_password(email: str = Form(...), new_password: str = Form(...), reset_token: str = Form(...)):
    try:
        payload = jwt.decode(reset_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("sub") != email or payload.get("purpose") != "reset_password":
            raise HTTPException(status_code=400, detail="Invalid reset token")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(new_password)
    db.commit()
    db.close()
    return {"message": "Password reset successfully"}

@app.post("/sign/{doc_id}")
def sign_document(doc_id: str, qr_x: int = Form(450), qr_y: int = Form(700),
                  qr_page: int = Form(0), qr_size: int = Form(150), current_user: User = Depends(get_current_user)):
    try:
        if current_user.role != "SIGNER":
            raise HTTPException(status_code=403, detail="Only signer can sign documents")
        db = SessionLocal()
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            db.close()
            raise HTTPException(status_code=404, detail="Document not found")
        if doc.status == "SIGNED":
            if not doc.verification_id:
                doc.verification_id = str(uuid.uuid4())
            base_url = os.getenv("VERIFICATION_BASE_URL") or "https://academics-docs-f.netlify.app"
            verification_path = os.getenv("VERIFICATION_PATH") or "verify"
            verification_link = f"{base_url}/{verification_path}/{doc.verification_id}"
            qr_code = qrcode.QRCode(box_size=10, border=2)
            qr_code.add_data(verification_link)
            qr_code.make(fit=True)
            qr_img = qr_code.make_image(fill_color="black", back_color="white").convert('RGB')
            qr_path = os.path.join(OUTPUT_FOLDER, f"{doc_id}_qr.png")
            qr_img.save(qr_path)
            reader = PdfReader(doc.file_path)
            writer = PdfWriter()
            for i, pg in enumerate(reader.pages):
                if i == qr_page:
                    mb = pg.mediabox
                    page_w = float(mb.width)
                    page_h = float(mb.height)
                    overlay_pdf = os.path.join(OUTPUT_FOLDER, f"{doc_id}_overlay.pdf")
                    c = canvas.Canvas(overlay_pdf, pagesize=(page_w, page_h))
                    c.drawImage(qr_path, qr_x, qr_y, width=qr_size, height=qr_size, mask='auto')
                    c.save()
                    overlay_reader = PdfReader(overlay_pdf)
                    pg.merge_page(overlay_reader.pages[0], over=True)
                writer.add_page(pg)
            final_pdf_path = os.path.join(OUTPUT_FOLDER, f"{doc_id}_signed.pdf")
            with open(final_pdf_path, "wb") as f:
                writer.write(f)
            doc.signed_pdf_path = final_pdf_path
            db.commit()
            db.close()
            return {
                "message": "QR regenerated",
                "document_id": doc_id,
                "signed_pdf": f"/output/{doc_id}_signed.pdf",
                "verification_link": verification_link
            }
        file_hash = hash_file(doc.file_path)
        key_path = os.path.join(BASE_DIR, "crypto", "private_key.pem")
        with open(key_path, "rb") as f:
            private_key = serialization.load_pem_private_key(
                f.read(),
                password=None
            )
        signature = private_key.sign(
            file_hash,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        signature_path = os.path.join(OUTPUT_FOLDER, f"{doc_id}_signature.bin")
        with open(signature_path, "wb") as f:
            f.write(signature)
        doc.signature_path = signature_path
        doc.status = "SIGNED"
        if not doc.verification_id:
            doc.verification_id = str(uuid.uuid4())
        log_action(doc_id, "SIGN", current_user.username)
        base_url = os.getenv("VERIFICATION_BASE_URL") or "https://academics-docs-f.netlify.app"
        verification_path = os.getenv("VERIFICATION_PATH") or "verify"
        verification_link = f"{base_url}/{verification_path}/{doc.verification_id}"
        qr_code = qrcode.QRCode(box_size=10, border=2)
        qr_code.add_data(verification_link)
        qr_code.make(fit=True)
        qr_img = qr_code.make_image(fill_color="black", back_color="white").convert('RGB')
        qr_path = os.path.join(OUTPUT_FOLDER, f"{doc_id}_qr.png")
        qr_img.save(qr_path)
        reader = PdfReader(doc.file_path)
        writer = PdfWriter()
        for i, pg in enumerate(reader.pages):
            if i == qr_page:
                mb = pg.mediabox
                page_w = float(mb.width)
                page_h = float(mb.height)
                overlay_pdf = os.path.join(OUTPUT_FOLDER, f"{doc_id}_overlay.pdf")
                c = canvas.Canvas(overlay_pdf, pagesize=(page_w, page_h))
                c.drawImage(qr_path, qr_x, qr_y, width=qr_size, height=qr_size, mask='auto')
                c.save()
                overlay_reader = PdfReader(overlay_pdf)
                pg.merge_page(overlay_reader.pages[0], over=True)
            writer.add_page(pg)
        final_pdf_path = os.path.join(OUTPUT_FOLDER, f"{doc_id}_signed.pdf")
        with open(final_pdf_path, "wb") as f:
            writer.write(f)
        doc.signed_pdf_path = final_pdf_path
        db.commit()
        db.close()
        return {
            "message": "Document signed & QR embedded successfully",
            "document_id": doc_id,
            "signed_pdf": f"/output/{doc_id}_signed.pdf",
            "verification_link": verification_link
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audit/{doc_id}")
def get_audit_logs(doc_id: str):
    db = SessionLocal()
    logs = db.query(AuditLog).filter(AuditLog.document_id == doc_id).all()
    db.close()
    return logs

@app.get("/api/verify/{verification_id}")
def verify_document_api(verification_id: str):
    db = SessionLocal()
    doc = db.query(Document).filter(
        (Document.verification_id == verification_id) | (Document.id == verification_id)
    ).first()
    if not doc:
        db.close()
        return {"status": "INVALID", "message": "Document not found"}
    uploader = db.query(User).filter(User.id == doc.uploaded_by).first()
    signer = db.query(User).filter(User.id == doc.signer_id).first() if doc.signer_id else None
    sign_log = db.query(AuditLog).filter(
        AuditLog.document_id == doc.id, AuditLog.action == "SIGN"
    ).order_by(AuditLog.timestamp.desc()).first()
    signed_at = sign_log.timestamp.isoformat() + "Z" if sign_log else None
    result = {
        "status": "VALID" if doc.status == "SIGNED" else doc.status,
        "verification_id": doc.verification_id or doc.id,
        "document_id": doc.id,
        "document_name": doc.document_name or "Untitled",
        "document_type": None,
        "uploaded_by": uploader.username if uploader else "Unknown",
        "uploader_name": uploader.full_name if uploader and uploader.full_name else uploader.username if uploader else "Unknown",
        "enrollment_number": uploader.username if uploader else "",
        "department": uploader.department if uploader else "",
        "signer_name": signer.full_name if signer and signer.full_name else signer.username if signer else None,
        "uploaded_at": doc.created_at.isoformat() + "Z" if doc.created_at else None,
        "signed_at": signed_at or (doc.created_at.isoformat() + "Z" if doc.created_at else None),
        "rejection_reason": doc.rejection_reason,
        "has_signed_pdf": bool(doc.signed_pdf_path),
        "signed_pdf_url": f"/output/{doc.id}_signed.pdf" if doc.signed_pdf_path else None,
        "approved_by": signer.full_name if signer and signer.full_name else signer.username if signer else None,
        "message": f"Document is verified and signed by {signer.full_name or signer.username}" if doc.status == "SIGNED" and signer else "Document is not yet signed" if doc.status != "SIGNED" else "Signer not found"
    }
    db.close()
    return result

@app.get("/verify/{doc_id}")
async def serve_verify_page(doc_id: str):
    return FileResponse(os.path.join(REACT_DIST, "index.html"))

@app.get("/signers")
def get_signers(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    signers = db.query(User).filter(User.role == "SIGNER").all()
    result = []
    for s in signers:
        result.append({
            "id": s.id,
            "username": s.username
})
    db.close()
    return result

@app.get("/signer/pending")
def signer_pending_docs(current_user: User = Depends(get_current_user)):
    if current_user.role != "SIGNER":
        raise HTTPException(status_code=403, detail="Only signer can view this")
    db = SessionLocal()
    docs = db.query(Document).filter(
        Document.signer_id == current_user.id,
        Document.status == "PENDING"
    ).all()
    result = []
    for d in docs:
        user = db.query(User).filter(User.id == d.uploaded_by).first()
        result.append({
            "id": d.id,
            "uploaded_by": user.username if user else "Unknown"
        })
    db.close()
    return result
    
@app.get("/user/documents")
def user_documents(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    docs = db.query(Document).filter(
        Document.uploaded_by == current_user.id
    ).all()
    result = []
    for d in docs:
        signer = db.query(User).filter(User.id == d.signer_id).first()
        result.append({
            "id": d.id,
            "signer": signer.username if signer else "Unknown",
            "status": d.status,
            "signed_pdf": f"/output/{d.id}_signed.pdf" if d.signed_pdf_path else None
        })
    db.close()
    return result

@app.get("/document/{doc_id}")
def view_document(doc_id: str, request: Request, token: str = Query(None)):
    db = SessionLocal()
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        db.close()
        raise HTTPException(status_code=404)
    user = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            payload = jwt.decode(auth_header[7:], SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                user = db.query(User).filter(User.username == username).first()
        except JWTError:
            pass
    if not user and token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                user = db.query(User).filter(User.username == username).first()
        except JWTError:
            pass
    if not user:
        db.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if doc.uploaded_by != user.id and doc.signer_id != user.id:
        db.close()
        raise HTTPException(status_code=403)
    db.close()
    return FileResponse(doc.file_path, media_type="application/pdf")

@app.get("/signer/signed")
def signer_signed_docs(current_user: User = Depends(get_current_user)):
    if current_user.role != "SIGNER":
        raise HTTPException(status_code=403, detail="Only signer can view")
    db = SessionLocal()
    docs = db.query(Document).filter(
        Document.signer_id == current_user.id,
        Document.status == "SIGNED"
    ).all()
    result = []
    for d in docs:
        result.append({
            "id": d.id,
            "signed_pdf": f"/output/{d.id}_signed.pdf" if d.signed_pdf_path else None
        })
    db.close()
    return result
