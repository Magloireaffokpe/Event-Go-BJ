from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from decimal import Decimal
import qrcode
from io import BytesIO
from django.core.files.base import ContentFile
import uuid

User = get_user_model()

class Ticket(models.Model):
    """
    Ticket type model for events
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    quantity_available = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    quantity_sold = models.PositiveIntegerField(default=0)
    
    # Relations
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='tickets')
    
    
    # Settings
    is_active = models.BooleanField(default=True)
    sale_start_datetime = models.DateTimeField(null=True, blank=True)
    sale_end_datetime = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tickets'
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'
        ordering = ['price']
        indexes = [
            models.Index(fields=['event', 'is_active']),
            models.Index(fields=['price']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.event.title}"
    
    @property
    def quantity_remaining(self):
        """Get remaining quantity"""
        return max(0, self.quantity_available - self.quantity_sold)
    
    @property
    def is_sold_out(self):
        """Check if ticket is sold out"""
        return self.quantity_remaining == 0
    
    @property
    def is_available_for_sale(self):
        """Check if ticket is available for sale"""
        from django.utils import timezone
        now = timezone.now()
        
        if not self.is_active or self.is_sold_out:
            return False
        
        if self.sale_start_datetime and now < self.sale_start_datetime:
            return False
        
        if self.sale_end_datetime and now > self.sale_end_datetime:
            return False
        
        return True
    
    def can_purchase(self, quantity):
        """Check if a specific quantity can be purchased"""
        return (
            self.is_available_for_sale and 
            quantity <= self.quantity_remaining and
            quantity > 0
        )

class Purchase(models.Model):
    """
    Ticket purchase model
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    # Purchase details
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='purchases')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # QR Code
    qr_code = models.ImageField(upload_to='tickets/qrcodes/', blank=True, null=True)
    qr_code_data = models.TextField(blank=True)  # Store QR code data for validation
    
    # Purchase metadata
    purchase_reference = models.CharField(max_length=50, unique=True, editable=False)
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'purchases'
        verbose_name = 'Purchase'
        verbose_name_plural = 'Purchases'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['ticket', 'status']),
            models.Index(fields=['purchase_reference']),
        ]
    
    def __str__(self):
        return f"Purchase {self.purchase_reference} - {self.user.full_name}"
    
    def save(self, *args, **kwargs):
        # Generate purchase reference if not exists
        if not self.purchase_reference:
            self.purchase_reference = self.generate_purchase_reference()
        
        # Calculate total amount
        self.total_amount = self.unit_price * self.quantity
        
        # Generate QR code when status changes to paid
        if self.status == 'paid' and not self.qr_code:
            self.generate_qr_code()
        
        # Update paid timestamp
        if self.status == 'paid' and not self.paid_at:
            from django.utils import timezone
            self.paid_at = timezone.now()
        
        super().save(*args, **kwargs)
        
        # Update ticket quantity sold
        if self.pk:  # Only if saved to database
            self.update_ticket_quantity()
    
    def generate_purchase_reference(self):
        """Generate unique purchase reference"""
        return f"EVT-{uuid.uuid4().hex[:8].upper()}"
    
    def generate_qr_code(self):
        """Generate QR code for the purchase"""
        # QR code data includes purchase details
        qr_data = {
            'purchase_id': str(self.id),
            'reference': self.purchase_reference,
            'event_id': str(self.ticket.event.id),
            'event_title': self.ticket.event.title,
            'ticket_name': self.ticket.name,
            'quantity': self.quantity,
            'user_email': self.user.email,
            'purchase_date': self.created_at.isoformat() if self.created_at else None
        }
        
        import json
        self.qr_code_data = json.dumps(qr_data)
        
        # Generate QR code image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(self.qr_code_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to field
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        filename = f'qr_{self.purchase_reference}.png'
        self.qr_code.save(filename, ContentFile(buffer.read()), save=False)
        buffer.close()
    
    def update_ticket_quantity(self):
        """Update ticket quantity sold"""
        paid_purchases = Purchase.objects.filter(
            ticket=self.ticket,
            status='paid'
        ).aggregate(
            total_sold=models.Sum('quantity')
        )
        
        self.ticket.quantity_sold = paid_purchases['total_sold'] or 0
        self.ticket.save(update_fields=['quantity_sold'])
    
    @property
    def can_be_cancelled(self):
        """Check if purchase can be cancelled"""
        from django.utils import timezone
        
        # Can only cancel pending or paid purchases
        if self.status not in ['pending', 'paid']:
            return False
        
        # Cannot cancel if event has started
        if self.ticket.event.start_datetime <= timezone.now():
            return False
        
        return True
    
    def cancel(self):
        """Cancel the purchase"""
        if not self.can_be_cancelled:
            raise ValueError("Purchase cannot be cancelled")
        
        self.status = 'cancelled'
        self.save()
    
    @property
    def attendee_names(self):
        """Get list of attendee names for this purchase"""
        return [attendee.full_name for attendee in self.attendees.all()]

class Attendee(models.Model):
    """
    Individual attendee for a purchase (useful for group bookings)
    """
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='attendees')
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Check-in tracking
    checked_in = models.BooleanField(default=False)
    check_in_datetime = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'attendees'
        verbose_name = 'Attendee'
        verbose_name_plural = 'Attendees'
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def check_in(self):
        """Check in the attendee"""
        if not self.checked_in:
            from django.utils import timezone
            self.checked_in = True
            self.check_in_datetime = timezone.now()
            self.save()

class TicketValidation(models.Model):
    """
    Model to track ticket validations at event entry
    """
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='validations')
    validated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ticket_validations')
    validation_datetime = models.DateTimeField(auto_now_add=True)
    location = models.CharField(max_length=100, blank=True)  # Entry gate/location
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'ticket_validations'
        verbose_name = 'Ticket Validation'
        verbose_name_plural = 'Ticket Validations'
    
    def __str__(self):
        return f"Validation for {self.purchase.purchase_reference}"
