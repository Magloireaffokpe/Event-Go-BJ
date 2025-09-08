from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class NotificationTemplate(models.Model):
    """
    Model for storing notification templates
    """
    NOTIFICATION_TYPES = [
        ('email', 'Email'),
        ('push', 'Push Notification'),
        ('sms', 'SMS'),
    ]
    
    EVENT_TYPES = [
        ('user_registration', 'User Registration'),
        ('purchase_confirmation', 'Purchase Confirmation'),
        ('purchase_cancellation', 'Purchase Cancellation'),
        ('event_reminder', 'Event Reminder'),
        ('event_cancelled', 'Event Cancelled'),
        ('event_updated', 'Event Updated'),
        ('refund_request', 'Refund Request'),
        ('refund_approved', 'Refund Approved'),
        ('refund_rejected', 'Refund Rejected'),
        ('payment_failed', 'Payment Failed'),
        ('ticket_validation', 'Ticket Validation'),
    ]
    
    name = models.CharField(max_length=100)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    
    # Template content
    subject = models.CharField(max_length=200, blank=True)  # For email/SMS
    content = models.TextField()
    html_content = models.TextField(blank=True)  # For email
    
    # Settings
    is_active = models.BooleanField(default=True)
    send_to_user = models.BooleanField(default=True)
    send_to_organizer = models.BooleanField(default=False)
    send_to_admin = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_templates'
        verbose_name = 'Notification Template'
        verbose_name_plural = 'Notification Templates'
        unique_together = ['notification_type', 'event_type']
    
    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.get_event_type_display()}"

class Notification(models.Model):
    """
    Model for storing sent notifications
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('delivered', 'Delivered'),
        ('opened', 'Opened'),
    ]
    
    # Identification
    notification_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    # Recipient
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    
    # Content
    notification_type = models.CharField(max_length=20, choices=NotificationTemplate.NOTIFICATION_TYPES)
    event_type = models.CharField(max_length=50, choices=NotificationTemplate.EVENT_TYPES)
    subject = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    html_content = models.TextField(blank=True)
    
    # Delivery details
    recipient_email = models.EmailField(blank=True)
    recipient_phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Related objects
    related_event = models.ForeignKey('events.Event', on_delete=models.SET_NULL, null=True, blank=True)
    related_purchase = models.ForeignKey('tickets.Purchase', on_delete=models.SET_NULL, null=True, blank=True)
    related_payment = models.ForeignKey('payments.Payment', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Provider details
    provider_id = models.CharField(max_length=100, blank=True)  # External provider message ID
    provider_response = models.JSONField(blank=True, null=True)
    error_message = models.TextField(blank=True)
    
    # Delivery tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['notification_type', 'status']),
            models.Index(fields=['event_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_notification_type_display()} to {self.user.email} - {self.get_event_type_display()}"
    
    @property
    def is_sent(self):
        """Check if notification was sent"""
        return self.status in ['sent', 'delivered', 'opened']
    
    @property
    def is_delivered(self):
        """Check if notification was delivered"""
        return self.status in ['delivered', 'opened']
    
    def mark_as_sent(self, provider_id='', provider_response=None):
        """Mark notification as sent"""
        from django.utils import timezone
        
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.provider_id = provider_id
        self.provider_response = provider_response
        self.save()
    
    def mark_as_failed(self, error_message=''):
        """Mark notification as failed"""
        self.status = 'failed'
        self.error_message = error_message
        self.save()
    
    def mark_as_delivered(self):
        """Mark notification as delivered"""
        from django.utils import timezone
        
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save()
    
    def mark_as_opened(self):
        """Mark notification as opened"""
        from django.utils import timezone
        
        self.status = 'opened'
        self.opened_at = timezone.now()
        self.save()

class NotificationPreference(models.Model):
    """
    Model for user notification preferences
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Email preferences
    email_purchase_confirmation = models.BooleanField(default=True)
    email_event_reminders = models.BooleanField(default=True)
    email_event_updates = models.BooleanField(default=True)
    email_marketing = models.BooleanField(default=False)
    
    # Push notification preferences
    push_purchase_confirmation = models.BooleanField(default=True)
    push_event_reminders = models.BooleanField(default=True)
    push_event_updates = models.BooleanField(default=True)
    
    # SMS preferences
    sms_purchase_confirmation = models.BooleanField(default=False)
    sms_event_reminders = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_preferences'
        verbose_name = 'Notification Preference'
        verbose_name_plural = 'Notification Preferences'
    
    def __str__(self):
        return f"Preferences for {self.user.email}"
    
    def allows_notification(self, notification_type, event_type):
        """Check if user allows a specific notification"""
        preference_key = f"{notification_type}_{event_type}"
        return getattr(self, preference_key, True)

class NotificationLog(models.Model):
    """
    Model for logging notification events
    """
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='logs')
    event_type = models.CharField(max_length=50)  # e.g., 'send_attempt', 'delivery_update', 'open_tracking'
    message = models.TextField()
    data = models.JSONField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notification_logs'
        verbose_name = 'Notification Log'
        verbose_name_plural = 'Notification Logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification.notification_id} - {self.event_type}"
