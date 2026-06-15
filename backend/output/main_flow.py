import uuid
import os
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
import qrcode

# -------- STEP 1: Generate Unique Document ID --------
doc_id = str(uuid.uuid4())
print("Document ID:", doc_id)

# -------- STEP 2: Hash the PDF --------
def hash_file(filepath):
    digest = hashes.Hash(hashes.SHA256())
    with open(filepath, "rb") as f:
        while chunk := f.read(4096):
            digest.update(chunk)
    return digest.finalize()

file_path = "/Users/apple/Desktop/Project/documents/original.pdf"
file_hash = hash_file(file_path)

print("Hash Generated")

# -------- STEP 3: Sign the Hash --------
with open("/Users/apple/Desktop/Project/crypto/private_key.pem", "rb") as f:
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

# Save signature
with open(f"/Users/apple/Desktop/Project/crypto/{doc_id}_signature.bin", "wb") as f:
    f.write(signature)

print("Document Signed")

# -------- STEP 4: Generate QR Code --------
verification_link = f"http://localhost:8000/verify/{doc_id}"

qr = qrcode.make(verification_link)
qr_path = f"/Users/apple/Desktop/Project/output/{doc_id}_qr.png"
qr.save(qr_path)

print("QR Code Generated")
print(doc_id)
