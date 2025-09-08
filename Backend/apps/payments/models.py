from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal
import uuid

User = get_user_model()

class Payment(models.Model):
    """
    Payment model for tracking all payment transactions
    """
    PAYMENT_METHODS = [
        ('mobile_money', 'Mobile Money'),
        ('card', 'Card Payment'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    # Payment identification
    payment_reference = models.CharField(max_length=100, unique=True, editable=False)
    external_reference = models.CharField(max_length=100, blank=True)  # From payment provider
    
    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='XOF')  # West African CFA franc
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Related models
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    purchase = models.ForeignKey('tickets.Purchase', on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    
    # Payment method specific data
    mobile_money_phone = models.CharField(max_length=20, blank=True)
    mobile_money_provider = models.CharField(max_length=50, blank=True)
    
    card_last_four = models.CharField(max_length=4, blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    
    # Provider response data
    provider_response = models.JSONField(blank=True, null=True)
    failure_reason = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payment_reference']),
            models.Index(fields=['external_reference']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['method', 'status']),
        ]
    
    def __str__(self):
        return f"Payment {self.payment_reference} - {self.amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        # Generate payment reference if not exists
        if not self.payment_reference:
            self.payment_reference = self.generate_payment_reference()
        
        # Update processed timestamp
        if self.status in ['success', 'failed', 'cancelled'] and not self.processed_at:
            from django.utils import timezone
            self.processed_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    def generate_payment_reference(self):
        """Generate unique payment reference"""
        return f"PAY-{uuid.uuid4().hex[:12].upper()}"
    
    @property
    def is_successful(self):
        """Check if payment was successful"""
        return self.status == 'success'
    
    @property
    def is_pending(self):
        """Check if payment is pending"""
        return self.status in ['pending', 'processing']
    
    @property
    def can_be_refunded(self):
        """Check if payment can be refunded"""
        return self.status == 'success'

class PaymentLog(models.Model):
    """
    Log model for tracking payment events and API calls
    """
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='logs')
    event_type = models.CharField(max_length=50)  # e.g., 'api_call', 'webhook', 'status_change'
    message = models.TextField()
    data = models.JSONField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payment_logs'
        verbose_name = 'Payment Log'
        verbose_name_plural = 'Payment Logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.payment.payment_reference} - {self.event_type}"

class RefundRequest(models.Model):
    """
    Model for tracking refund requests
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refund_requests')
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refund_requests')
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Admin review
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_refunds')
    admin_notes = models.TextField(blank=True)
    
    # Refund processing
    refund_reference = models.CharField(max_length=100, blank=True)
    processed_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'refund_requests'
        verbose_name = 'Refund Request'
        verbose_name_plural = 'Refund Requests'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Refund {self.payment.payment_reference} - {self.amount}"
    
    @property
    def can_be_approved(self):
        """Check if refund can be approved"""
        return self.status == 'pending' and self.payment.can_be_refunded
    
    def approve(self, admin_user, notes=''):
        """Approve the refund request"""
        if not self.can_be_approved:
            raise ValueError("Refund cannot be approved")
        
        self.status = 'approved'
        self.reviewed_by = admin_user
        self.admin_notes = notes
        self.save()
    
    def reject(self, admin_user, notes=''):
        """Reject the refund request"""
        if self.status != 'pending':
            raise ValueError("Only pending refunds can be rejected")
        
        self.status = 'rejected'
        self.reviewed_by = admin_user
        self.admin_notes = notes
        self.save()


class Refund(models.Model):
    """
    Model for tracking actual processed refunds
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    REFUND_METHODS = [
        ('mobile_money', 'Mobile Money'),
        ('card', 'Card Payment'),
        ('manual', 'Manual Refund'),
    ]
    
    # References
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refunds')
    refund_request = models.ForeignKey(RefundRequest, on_delete=models.CASCADE, related_name='refunds')
    
    # Refund details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    refund_reference = models.CharField(max_length=100, unique=True)
    refund_method = models.CharField(max_length=20, choices=REFUND_METHODS)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Provider response
    provider_response = models.JSONField(blank=True, null=True)
    failure_reason = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'refunds'
        verbose_name = 'Refund'
        verbose_name_plural = 'Refunds'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['refund_reference']),
            models.Index(fields=['payment', 'status']),
        ]
    
    def __str__(self):
        return f"Refund {self.refund_reference} - {self.amount}"
    
    @property
    def is_successful(self):
        """Check if refund was successful"""
        return self.status == 'completed'
