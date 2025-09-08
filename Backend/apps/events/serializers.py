from rest_framework import serializers
from django.utils import timezone
from .models import Event, EventImage, EventReview
from apps.users.serializers import UserSerializer
from apps.tickets.models import Ticket  # à la place de events.Ticket


class EventImageSerializer(serializers.ModelSerializer):
    """
    Serializer for Event Images
    """
    class Meta:
        model = EventImage
        fields = ['id', 'image', 'caption', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']

class EventReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for Event Reviews
    """
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = EventReview
        fields = ['id', 'user', 'rating', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value

class EventSerializer(serializers.ModelSerializer):
    """
    Serializer for Event model
    """
    organizer = UserSerializer(read_only=True)
    images = EventImageSerializer(many=True, read_only=True)
    reviews = EventReviewSerializer(many=True, read_only=True)
    total_tickets_sold = serializers.ReadOnlyField()
    total_revenue = serializers.ReadOnlyField()
    tickets_available = serializers.ReadOnlyField()
    available_spots = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    is_ongoing = serializers.ReadOnlyField()
    is_past = serializers.ReadOnlyField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'start_datetime', 'end_datetime',
            'location', 'category', 'max_attendees', 'organizer', 'is_active',
            'is_featured', 'created_at', 'updated_at', 'images', 'reviews',
            'total_tickets_sold', 'total_revenue', 'tickets_available',
            'available_spots', 'is_upcoming', 'is_ongoing', 'is_past'
        ]
        read_only_fields = [
            'id', 'organizer', 'created_at', 'updated_at', 'total_tickets_sold',
            'total_revenue', 'tickets_available', 'available_spots',
            'is_upcoming', 'is_ongoing', 'is_past'
        ]
    
    def validate(self, attrs):
        """Validate event dates"""
        start_datetime = attrs.get('start_datetime')
        end_datetime = attrs.get('end_datetime')
        
        if start_datetime and end_datetime:
            if end_datetime <= start_datetime:
                raise serializers.ValidationError(
                    "End datetime must be after start datetime"
                )
            
            # Check if start datetime is in the future (for new events)
            if not self.instance and start_datetime <= timezone.now():
                raise serializers.ValidationError(
                    "Start datetime must be in the future"
                )
        
        return attrs
    
    def validate_max_attendees(self, value):
        if value < 1:
            raise serializers.ValidationError("Max attendees must be at least 1")
        return value
    
    def create(self, validated_data):
        # Set the organizer to the current user
        validated_data['organizer'] = self.context['request'].user
        return super().create(validated_data)

class EventListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for event listing
    """
    organizer_name = serializers.CharField(source='organizer.full_name', read_only=True)
    total_tickets_sold = serializers.ReadOnlyField()
    available_spots = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'start_datetime', 'end_datetime', 'location',
            'category', 'max_attendees', 'organizer_name', 'is_active',
            'is_featured', 'total_tickets_sold', 'available_spots',
            'is_upcoming', 'primary_image', 'created_at'
        ]
    
    def get_primary_image(self, obj):
        """Get primary image URL"""
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_image.image.url)
        return None

class EventCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating events
    """
    class Meta:
        model = Event
        fields = [
            'title', 'description', 'start_datetime', 'end_datetime',
            'location', 'category', 'max_attendees', 'is_featured'
        ]
    
    def validate(self, attrs):
        """Validate event dates"""
        start_datetime = attrs.get('start_datetime', self.instance.start_datetime if self.instance else None)
        end_datetime = attrs.get('end_datetime', self.instance.end_datetime if self.instance else None)
        
        if start_datetime and end_datetime:
            if end_datetime <= start_datetime:
                raise serializers.ValidationError({
                    'end_datetime': "End datetime must be after start datetime"
                })
            
            # For new events, check if start datetime is in the future
            if not self.instance and start_datetime <= timezone.now():
                raise serializers.ValidationError({
                    'start_datetime': "Start datetime must be in the future"
                })
        
        return attrs
    
    def validate_max_attendees(self, value):
        """Validate max attendees"""
        if value < 1:
            raise serializers.ValidationError("Max attendees must be at least 1")
        
        # If updating an existing event, ensure new max_attendees >= tickets_sold
        if self.instance:
            if value < self.instance.total_tickets_sold:
                raise serializers.ValidationError(
                    f"Cannot reduce max attendees below current ticket sales ({self.instance.total_tickets_sold})"
                )
        
        return value
    
    def create(self, validated_data):
        validated_data['organizer'] = self.context['request'].user
        return super().create(validated_data)



class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = "__all__"
