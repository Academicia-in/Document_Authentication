import os
from sqlalchemy import create_engine, Column, String, DateTime, Integer, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123@localhost:5432/academicia_docs")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)
    email = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    file_path = Column(String)
    document_name = Column(String, nullable=True)
    uploaded_by = Column(String)
    signer_id = Column(String, nullable=True)
    document_type_id = Column(String, nullable=True)
    signature_path = Column(String, nullable=True)
    signed_pdf_path = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    rejection_reason = Column(Text, nullable=True)
    current_step = Column(Integer, default=0)
    verification_id = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DocumentType(Base):
    __tablename__ = "document_types"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"

    id = Column(String, primary_key=True, index=True)
    document_type_id = Column(String)
    step_order = Column(Integer)
    signer_role = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String, primary_key=True, index=True)
    document_id = Column(String)
    approver_id = Column(String)
    step_order = Column(Integer)
    status = Column(String, default="PENDING")
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    document_id = Column(String)
    action = Column(String)
    performed_by = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)
