# Digital Credentials 101: Engineering Trust

**Course Instructor:** Antigravity AI
**Level:** System Design
**Topic:** Certificates, PDFs, and Immutability

---

## Module 1: Why PDF?

In an age of dynamic HTML, why send a **PDF**?

1.  **Portability:** A PDF looks the same on an iPhone, Windows PC, or printed paper.
2.  **Self-Contained:** Fonts, images, and layout are embedded. No broken CSS.
3.  **Trust:** It feels "official".

---

## Module 2: The Architecture of a Certificate

A certificate is not just an image. It is a data structure.

### The Backend Model

```python
class Certificate(models.Model):
    uuid = models.UUIDField()  # The global unique identifier
    user = models.ForeignKey(User)
    course = models.ForeignKey(Course)
    issued_at = models.DateTimeField()
    file = models.FileField() # The immutable artifact
```

### The Generation Process (ReportLab)

We don't draw pixels; we draw **vectors**.

- `canvas.drawString(x, y, "Text")`: Precise positioning (PostScript).
- **Dynamic Content:** We inject the User's Name and Date at runtime.

---

## Module 3: Verification (The "Fake" Problem)

How do I know you didn't Photoshop this?
**The Certificate ID (UUID).**

1.  Each PDF includes a unique ID (e.g., `CERT-1234-5678`).
2.  Recruiter goes to `learninghub.com/verify/CERT-1234-5678`.
3.  System checks the DB. If it matches, it's real.

_Taking it further:_ Cryptographic Signatures (PGP) allow offline verification.

---

## Assignment

1.  Trigger a certificate generation in the App.
2.  **Challenge:** Add a QR Code to the PDF that links to a Verification URL. (Hint: `reportlab.graphics.barcode.qr`)

_Class Dismissed. You are now Certified._
