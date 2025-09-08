from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal


User = get_user_model()

class Event(models.Model):
    """
    Event model for managing events
    """
    CATEGORY_CHOICES = [
        ('music', 'Music'),
        ('sports', 'Sports'),
        ('conference', 'Conference'),
        ('art', 'Art'),
        ('theater', 'Theater'),
        ('other', 'Other'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    location = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    max_attendees = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    
    # Event management
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'events'
        verbose_name = 'Event'
        verbose_name_plural = 'Events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['start_datetime']),
            models.Index(fields=['category']),
            models.Index(fields=['location']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.start_datetime.strftime('%Y-%m-%d %H:%M')}"
    
    def clean(self):
        """Validate that end_datetime is after start_datetime"""
        if self.start_datetime and self.end_datetime:
            if self.end_datetime <= self.start_datetime:
                from django.core.exceptions import ValidationError
                raise ValidationError("End datetime must be after start datetime")
    
    @property
    def is_upcoming(self):
        """Check if the event is upcoming"""
        return self.start_datetime > timezone.now()
    
    @property
    def is_ongoing(self):
        """Check if the event is currently ongoing"""
        now = timezone.now()
        return self.start_datetime <= now <= self.end_datetime
    
    @property
    def is_past(self):
        """Check if the event has ended"""
        return self.end_datetime < timezone.now()
    
    @property
    def total_tickets_sold(self):
        """Get total number of tickets sold for this event"""
        from apps.tickets.models import Purchase
        return Purchase.objects.filter(
            ticket__event=self,
            status='paid'
        ).aggregate(
            total=models.Sum('quantity')
        )['total'] or 0
    
    @property
    def total_revenue(self):
        """Get total revenue from ticket sales"""
        from apps.tickets.models import Purchase
        return Purchase.objects.filter(
            ticket__event=self,
            status='paid'
        ).aggregate(
            total=models.Sum('total_amount')
        )['total'] or 0
    
    @property
    def tickets_available(self):
        """Check if there are still tickets available"""
        return self.total_tickets_sold < self.max_attendees
    
    @property
    def available_spots(self):
        """Get number of available spots"""
        return max(0, self.max_attendees - self.total_tickets_sold)
    
class EventImage(models.Model):
    """
    Model for storing event images
    """
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='events/images/')
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'event_images'
        verbose_name = 'Event Image'
        verbose_name_plural = 'Event Images'
    
    def __str__(self):
        return f"Image for {self.event.title}"
    
    def save(self, *args, **kwargs):
        """Ensure only one primary image per event"""
        if self.is_primary:
            EventImage.objects.filter(
                event=self.event, 
                is_primary=True
            ).update(is_primary=False)
        super().save(*args, **kwargs)

class EventReview(models.Model):
    """
    Model for event reviews
    """
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_reviews')
    rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Rating from 1 to 5"
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'event_reviews'
        verbose_name = 'Event Review'
        verbose_name_plural = 'Event Reviews'
        unique_together = ['event', 'user']  # One review per user per event
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Review by {self.user.full_name} for {self.event.title}"
    
    def clean(self):
        """Validate rating is between 1 and 5"""
        if self.rating < 1 or self.rating > 5:
            from django.core.exceptions import ValidationError
            raise ValidationError("Rating must be between 1 and 5")


