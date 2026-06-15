from reportlab.pdfgen import canvas
from PyPDF2 import PdfReader, PdfWriter

doc_id = "e2853a88-9e96-438b-939e-14c93a0d2fd0"
qr_image = f"/Users/apple/Desktop/Project/output/{doc_id}_qr.png"

# Create overlay PDF with QR
overlay_pdf = f"/Users/apple/Desktop/Project/output/{doc_id}_overlay.pdf"
c = canvas.Canvas(overlay_pdf)
c.drawImage(qr_image, 450, 700, width=100, height=100)
c.save()

# Merge overlay with original PDF
reader = PdfReader("/Users/apple/Desktop/Project/documents/original.pdf")
overlay = PdfReader(overlay_pdf)
writer = PdfWriter()

page = reader.pages[0]
page.merge_page(overlay.pages[0])
writer.add_page(page)

with open(f"/Users/apple/Desktop/Project/output/{doc_id}_signed.pdf", "wb") as f:
    writer.write(f)

print("✅ Final Signed PDF Generated")
