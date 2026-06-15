from fastapi import APIRouter, Depends, HTTPException, Form, Query
from backend.database import SessionLocal, User, Document, DocumentType, ApprovalWorkflow, Approval, AuditLog
import uuid
from backend.auth_utils import hash_password, get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

def get_admin(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ─── DASHBOARD ───────────────────────────────────────────
@router.get("/dashboard")
def admin_dashboard(admin=Depends(get_admin)):
    db = SessionLocal()
    total_students = db.query(User).filter(User.role == "student").count()
    total_signers = db.query(User).filter(User.role == "SIGNER").count()
    total_docs = db.query(Document).count()
    pending = db.query(Document).filter(Document.status == "PENDING").count()
    approved = db.query(Document).filter(Document.status == "APPROVED").count()
    rejected = db.query(Document).filter(Document.status == "REJECTED").count()
    signed = db.query(Document).filter(Document.status == "SIGNED").count()
    db.close()
    return {
        "total_students": total_students,
        "total_signers": total_signers,
        "total_documents": total_docs,
        "pending_documents": pending,
        "approved_documents": approved,
        "rejected_documents": rejected,
        "signed_documents": signed,
    }

# ─── STUDENT MANAGEMENT ──────────────────────────────────
@router.get("/students")
def list_students(admin=Depends(get_admin)):
    db = SessionLocal()
    students = db.query(User).filter(User.role == "student").all()
    db.close()
    return [{"id": s.id, "username": s.username, "email": s.email or "",
             "full_name": s.full_name or "", "department": s.department or "",
             "created_at": s.created_at.isoformat() if s.created_at else ""} for s in students]

@router.post("/students")
def add_student(username: str = Form(...), password: str = Form(...),
                email: str = Form(""), full_name: str = Form(""),
                department: str = Form(""), admin=Depends(get_admin)):
    db = SessionLocal()
    if db.query(User).filter(User.username == username).first():
        db.close()
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(id=str(uuid.uuid4()), username=username,
                hashed_password=hash_password(password), role="student",
                email=email, full_name=full_name, department=department)
    db.add(user); db.commit(); db.close()
    return {"message": "Student added successfully"}

@router.put("/students/{student_id}")
def update_student(student_id: str, username: str = Form(None),
                   password: str = Form(None), email: str = Form(None),
                   full_name: str = Form(None), department: str = Form(None),
                   admin=Depends(get_admin)):
    db = SessionLocal()
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        db.close(); raise HTTPException(status_code=404, detail="Student not found")
    if username: student.username = username
    if password: student.hashed_password = hash_password(password)
    if email is not None: student.email = email
    if full_name is not None: student.full_name = full_name
    if department is not None: student.department = department
    db.commit(); db.close()
    return {"message": "Student updated successfully"}

@router.delete("/students/{student_id}")
def delete_student(student_id: str, admin=Depends(get_admin)):
    db = SessionLocal()
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        db.close(); raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student); db.commit(); db.close()
    return {"message": "Student deleted successfully"}

# ─── SIGNER MANAGEMENT ──────────────────────────────────
SIGNER_ROLES = ["Assistant Professor", "Professor", "HOD", "Dean", "Director"]

@router.get("/signers")
def list_signers(admin=Depends(get_admin)):
    db = SessionLocal()
    signers = db.query(User).filter(User.role == "SIGNER").all()
    db.close()
    return [{"id": s.id, "username": s.username, "email": s.email or "",
             "full_name": s.full_name or "", "department": s.department or "",
             "created_at": s.created_at.isoformat() if s.created_at else ""} for s in signers]

@router.post("/signers")
def add_signer(username: str = Form(...), password: str = Form(...),
               email: str = Form(""), full_name: str = Form(""),
               department: str = Form(""), signer_role: str = Form("Assistant Professor"),
               admin=Depends(get_admin)):
    if signer_role not in SIGNER_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {SIGNER_ROLES}")
    db = SessionLocal()
    if db.query(User).filter(User.username == username).first():
        db.close(); raise HTTPException(status_code=400, detail="Username already exists")
    user = User(id=str(uuid.uuid4()), username=username,
                hashed_password=hash_password(password), role="SIGNER",
                email=email, full_name=full_name, department=signer_role)
    db.add(user); db.commit(); db.close()
    return {"message": "Signer added successfully"}

@router.put("/signers/{signer_id}")
def update_signer(signer_id: str, username: str = Form(None),
                  password: str = Form(None), email: str = Form(None),
                  full_name: str = Form(None), department: str = Form(None),
                  admin=Depends(get_admin)):
    db = SessionLocal()
    signer = db.query(User).filter(User.id == signer_id, User.role == "SIGNER").first()
    if not signer:
        db.close(); raise HTTPException(status_code=404, detail="Signer not found")
    if username: signer.username = username
    if password: signer.hashed_password = hash_password(password)
    if email is not None: signer.email = email
    if full_name is not None: signer.full_name = full_name
    if department is not None: signer.department = department
    db.commit(); db.close()
    return {"message": "Signer updated successfully"}

@router.delete("/signers/{signer_id}")
def delete_signer(signer_id: str, admin=Depends(get_admin)):
    db = SessionLocal()
    signer = db.query(User).filter(User.id == signer_id, User.role == "SIGNER").first()
    if not signer:
        db.close(); raise HTTPException(status_code=404, detail="Signer not found")
    db.delete(signer); db.commit(); db.close()
    return {"message": "Signer deleted successfully"}

# ─── DOCUMENT TYPES ─────────────────────────────────────
@router.get("/document-types")
def list_document_types(admin=Depends(get_admin)):
    db = SessionLocal()
    types = db.query(DocumentType).all()
    db.close()
    return [{"id": t.id, "name": t.name, "description": t.description or ""} for t in types]

@router.post("/document-types")
def add_document_type(name: str = Form(...), description: str = Form(""), admin=Depends(get_admin)):
    db = SessionLocal()
    if db.query(DocumentType).filter(DocumentType.name == name).first():
        db.close(); raise HTTPException(status_code=400, detail="Document type already exists")
    dt = DocumentType(id=str(uuid.uuid4()), name=name, description=description)
    db.add(dt); db.commit(); db.close()
    return {"message": "Document type added successfully"}

@router.put("/document-types/{type_id}")
def update_document_type(type_id: str, name: str = Form(None),
                         description: str = Form(None), admin=Depends(get_admin)):
    db = SessionLocal()
    dt = db.query(DocumentType).filter(DocumentType.id == type_id).first()
    if not dt:
        db.close(); raise HTTPException(status_code=404, detail="Document type not found")
    if name: dt.name = name
    if description is not None: dt.description = description
    db.commit(); db.close()
    return {"message": "Document type updated successfully"}

@router.delete("/document-types/{type_id}")
def delete_document_type(type_id: str, admin=Depends(get_admin)):
    db = SessionLocal()
    dt = db.query(DocumentType).filter(DocumentType.id == type_id).first()
    if not dt:
        db.close(); raise HTTPException(status_code=404, detail="Document type not found")
    db.delete(dt); db.commit(); db.close()
    return {"message": "Document type deleted successfully"}

# ─── APPROVAL WORKFLOW ──────────────────────────────────
@router.get("/workflows")
def list_workflows(admin=Depends(get_admin)):
    db = SessionLocal()
    workflows = db.query(ApprovalWorkflow).order_by(ApprovalWorkflow.document_type_id, ApprovalWorkflow.step_order).all()
    db.close()
    result = {}
    for w in workflows:
        doc_type = db.query(DocumentType).filter(DocumentType.id == w.document_type_id).first()
        type_name = doc_type.name if doc_type else "Unknown"
        if type_name not in result:
            result[type_name] = {"document_type_id": w.document_type_id, "steps": []}
        result[type_name]["steps"].append({"id": w.id, "step_order": w.step_order, "signer_role": w.signer_role})
    return result

@router.post("/workflows")
def add_workflow_step(document_type_id: str = Form(...), step_order: int = Form(...),
                      signer_role: str = Form(...), admin=Depends(get_admin)):
    db = SessionLocal()
    wf = ApprovalWorkflow(id=str(uuid.uuid4()), document_type_id=document_type_id,
                          step_order=step_order, signer_role=signer_role)
    db.add(wf); db.commit(); db.close()
    return {"message": "Workflow step added successfully"}

@router.delete("/workflows/{workflow_id}")
def delete_workflow(workflow_id: str, admin=Depends(get_admin)):
    db = SessionLocal()
    wf = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.id == workflow_id).first()
    if not wf:
        db.close(); raise HTTPException(status_code=404, detail="Workflow step not found")
    db.delete(wf); db.commit(); db.close()
    return {"message": "Workflow step deleted successfully"}

# ─── DOCUMENT MONITORING ────────────────────────────────
@router.get("/documents")
def admin_documents(status: str = Query(None), admin=Depends(get_admin)):
    db = SessionLocal()
    q = db.query(Document)
    if status:
        q = q.filter(Document.status == status)
    docs = q.order_by(Document.created_at.desc()).all()
    result = []
    for d in docs:
        uploader = db.query(User).filter(User.id == d.uploaded_by).first()
        doc_type = db.query(DocumentType).filter(DocumentType.id == d.document_type_id).first()
        result.append({
            "id": d.id,
            "student_name": uploader.full_name or uploader.username if uploader else "Unknown",
            "document_type": doc_type.name if doc_type else "General",
            "status": d.status,
            "current_step": d.current_step,
            "created_at": d.created_at.isoformat() if d.created_at else "",
            "signed_pdf": f"/output/{d.id}_signed.pdf" if d.signed_pdf_path else "",
        })
    db.close()
    return result

@router.delete("/documents/{doc_id}")
def admin_delete_document(doc_id: str, admin=Depends(get_admin)):
    db = SessionLocal()
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        db.close()
        raise HTTPException(status_code=404, detail="Document not found")
    db.query(AuditLog).filter(AuditLog.document_id == doc_id).delete()
    db.delete(doc)
    db.commit()
    db.close()
    return {"message": "Document deleted successfully"}

# ─── ACTIVITY LOGS ──────────────────────────────────────
@router.get("/activity-logs")
def admin_activity_logs(admin=Depends(get_admin)):
    db = SessionLocal()
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    db.close()
    return [{"id": l.id, "document_id": l.document_id, "action": l.action,
             "performed_by": l.performed_by,
             "timestamp": l.timestamp.isoformat() if l.timestamp else ""} for l in logs]

# ─── PROFILE / SETTINGS ────────────────────────────────
@router.put("/profile")
def update_admin_profile(current_password: str = Form(...),
                         new_password: str = Form(None),
                         email: str = Form(None),
                         full_name: str = Form(None),
                         admin: User = Depends(get_admin)):
    from backend.auth_utils import verify_password as vp
    if not vp(current_password, admin.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    db = SessionLocal()
    user = db.query(User).filter(User.id == admin.id).first()
    if new_password:
        user.hashed_password = hash_password(new_password)
    if email is not None:
        user.email = email
    if full_name is not None:
        user.full_name = full_name
    db.commit(); db.close()
    return {"message": "Profile updated successfully"}
