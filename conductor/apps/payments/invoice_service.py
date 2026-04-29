
from .models import Payment
from django.conf import settings
from django.core.files.base import ContentFile
import io
import os

class InvoiceService:
    """Service for generating PDF invoices."""
    
    @staticmethod
    def generate_invoice(payment: Payment) -> str:
        """
        Generates a PDF invoice for the given payment and returns the relative path.
        Requires 'reportlab'.
        """
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            from reportlab.lib import colors
        except ImportError:
            return ""

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Header
        p.setFont("Helvetica-Bold", 24)
        p.drawString(50, height - 50, "INVOICE")
        
        # Company Info
        p.setFont("Helvetica", 12)
        p.drawString(50, height - 80, "Learning Hub Inc.")
        p.drawString(50, height - 95, "Silicon Valley, CA")
        
        # Payment Details
        p.drawString(50, height - 150, f"Order ID: {payment.gateway_order_id}")
        p.drawString(50, height - 170, f"Date: {payment.created_at.strftime('%Y-%m-%d %H:%M')}")
        p.drawString(50, height - 190, f"Customer: {payment.user.email}")
        
        # Line Items
        y = height - 250
        p.setStrokeColor(colors.grey)
        p.line(50, y, width - 50, y)
        
        y -= 25
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y, "Item")
        p.drawString(400, y, "Amount")
        
        y -= 20
        p.line(50, y, width - 50, y)
        
        y -= 30
        p.setFont("Helvetica", 12)
        p.drawString(50, y, payment.course.title)
        p.drawString(400, y, f"{payment.currency} {payment.amount}")
        
        # Total
        y -= 50
        p.line(50, y, width - 50, y)
        y -= 25
        p.setFont("Helvetica-Bold", 14)
        p.drawString(300, y, "Total Paid:")
        p.drawString(400, y, f"{payment.currency} {payment.amount}")
        
        # Footer
        p.setFont("Helvetica-Oblique", 10)
        p.drawString(50, 50, "Thank you for your business!")
        
        p.showPage()
        p.save()
        
        pdf_name = f"invoice_{payment.gateway_order_id}.pdf"
        
        # Ideally save to a specific invoices/ folder in media
        # Since I cannot easily modify the Payment model to add a FileField right now without migration
        # I will suggest returning the specific path or saving it such that a view can serve it.
        
        # For now, let's assume we save it to MEDIA_ROOT/invoices
        save_dir = os.path.join(settings.MEDIA_ROOT, 'invoices')
        os.makedirs(save_dir, exist_ok=True)
        
        file_path = os.path.join(save_dir, pdf_name)
        with open(file_path, 'wb') as f:
            f.write(buffer.getvalue())
            
        return f"invoices/{pdf_name}"
