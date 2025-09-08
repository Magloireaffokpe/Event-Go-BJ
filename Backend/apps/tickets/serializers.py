from rest_framework import serializers
from decimal import Decimal
from .models import Ticket, Purchase, Attendee, TicketValidation
from apps.events.serializers import EventListSerializer
from apps.users.serializers import UserSerializer

class AttendeeSerializer(serializers.ModelSerializer):
    """
    Serializer for Attendee model
    """
    class Meta:
        model = Attendee
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'checked_in', 'check_in_datetime']
        read_only_fields = ['id', 'checked_in', 'check_in_datetime']

class TicketSerializer(serializers.ModelSerializer):
    """
    Serializer for Ticket model
    """
    event = EventListSerializer(read_only=True)
    quantity_remaining = serializers.ReadOnlyField()
    is_sold_out = serializers.ReadOnlyField()
    is_available_for_sale = serializers.ReadOnlyField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'name', 'description', 'price', 'quantity_available',
            'quantity_sold', 'quantity_remaining', 'is_sold_out',
            'is_available_for_sale', 'event', 'sale_start_datetime',
            'sale_end_datetime', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'quantity_sold', 'quantity_remaining', 'is_sold_out',
            'is_available_for_sale', 'created_at', 'updated_at'
        ]

class TicketCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating tickets
    """
    class Meta:
        model = Ticket
        fields = [
            'name', 'description', 'price', 'quantity_available',
            'sale_start_datetime', 'sale_end_datetime'
        ]
    
    def validate_price(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError("Price cannot be negative")
        return value
    
    def validate_quantity_available(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity available must be at least 1")
        
        # For updates, ensure new quantity >= already sold
        if self.instance and value < self.instance.quantity_sold:
            raise serializers.ValidationError(
                f"Cannot reduce quantity below already sold tickets ({self.instance.quantity_sold})"
            )
        
        return value
    
    def validate(self, attrs):
        """Validate sale datetime range"""
        sale_start = attrs.get('sale_start_datetime')
        sale_end = attrs.get('sale_end_datetime')
        
        if sale_start and sale_end:
            if sale_end <= sale_start:
                raise serializers.ValidationError({
                    'sale_end_datetime': "Sale end datetime must be after sale start datetime"
                })
        
        return attrs

class PurchaseSerializer(serializers.ModelSerializer):
    """
    Serializer for Purchase model
    """
    ticket = TicketSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    attendees = AttendeeSerializer(many=True, read_only=True)
    can_be_cancelled = serializers.ReadOnlyField()
    qr_code_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Purchase
        fields = [
            'id', 'ticket', 'user', 'quantity', 'unit_price', 'total_amount',
            'status', 'purchase_reference', 'payment_method', 'payment_reference',
            'qr_code_url', 'qr_code_data', 'attendees', 'can_be_cancelled',
            'created_at', 'updated_at', 'paid_at'
        ]
        read_only_fields = [
            'id', 'ticket', 'user', 'unit_price', 'total_amount', 'status',
            'purchase_reference', 'payment_reference', 'qr_code_data',
            'can_be_cancelled', 'created_at', 'updated_at', 'paid_at'
        ]
    
    def get_qr_code_url(self, obj):
        """Get QR code URL"""
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
        return None

class TicketPurchaseSerializer(serializers.Serializer):
    """
    Serializer for purchasing tickets
    """
    quantity = serializers.IntegerField(min_value=1)
    payment_method = serializers.ChoiceField(choices=['mobile_money', 'card'])
    
    # Mobile Money fields
    phone = serializers.CharField(max_length=20, required=False)
    
    # Card payment fields
    card_number = serializers.CharField(max_length=20, required=False)
    card_expiry = serializers.CharField(max_length=7, required=False)  # MM/YYYY
    card_cvv = serializers.CharField(max_length=4, required=False)
    card_holder_name = serializers.CharField(max_length=100, required=False)
    
    # Attendee information (optional for group bookings)
    attendees = AttendeeSerializer(many=True, required=False)
    
    def validate(self, attrs):
        """Validate payment method specific fields"""
        payment_method = attrs.get('payment_method')
        
        if payment_method == 'mobile_money':
            if not attrs.get('phone'):
                raise serializers.ValidationError({
                    'phone': 'Phone number is required for mobile money payment'
                })
        
        elif payment_method == 'card':
            required_fields = ['card_number', 'card_expiry', 'card_cvv', 'card_holder_name']
            for field in required_fields:
                if not attrs.get(field):
                    raise serializers.ValidationError({
                        field: f'{field.replace("_", " ").title()} is required for card payment'
                    })
        
        # Validate attendee count matches quantity
        attendees = attrs.get('attendees', [])
        quantity = attrs.get('quantity', 1)
        
        if attendees and len(attendees) != quantity:
            raise serializers.ValidationError({
                'attendees': f'Number of attendees ({len(attendees)}) must match quantity ({quantity})'
            })
        
        return attrs
    
    def validate_card_expiry(self, value):
        """Validate card expiry format"""
        if value:
            try:
                month, year = value.split('/')
                if not (1 <= int(month) <= 12):
                    raise ValueError("Invalid month")
                if len(year) != 4:
                    raise ValueError("Year must be 4 digits")
            except (ValueError, IndexError):
                raise serializers.ValidationError("Invalid expiry format. Use MM/YYYY")
        return value

class TicketValidationSerializer(serializers.ModelSerializer):
    """
    Serializer for Ticket Validation
    """
    purchase = PurchaseSerializer(read_only=True)
    validated_by = UserSerializer(read_only=True)
    
    class Meta:
        model = TicketValidation
        fields = ['id', 'purchase', 'validated_by', 'validation_datetime', 'location', 'notes']
        read_only_fields = ['id', 'purchase', 'validated_by', 'validation_datetime']

class QRCodeValidationSerializer(serializers.Serializer):
    """
    Serializer for QR code validation
    """
    qr_code_data = serializers.CharField()
    location = serializers.CharField(max_length=100, required=False)
    notes = serializers.CharField(required=False)

class PurchaseCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating purchases (internal use)
    """
    class Meta:
        model = Purchase
        fields = [
            'ticket', 'user', 'quantity', 'unit_price', 'payment_method'
        ]
    
    def create(self, validated_data):
        # Calculate total amount
        validated_data['total_amount'] = validated_data['unit_price'] * validated_data['quantity']
        return super().create(validated_data)

class PurchaseStatsSerializer(serializers.Serializer):
    """
    Serializer for purchase statistics
    """
    total_purchases = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_tickets = serializers.IntegerField()
    purchases_by_status = serializers.DictField()
    purchases_by_method = serializers.DictField()
    monthly_sales = serializers.ListField()
