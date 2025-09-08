from rest_framework import serializers
from decimal import Decimal
from .models import Payment, PaymentLog, RefundRequest

class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for Payment model
    """
    user = serializers.StringRelatedField(read_only=True)
    is_successful = serializers.ReadOnlyField()
    is_pending = serializers.ReadOnlyField()
    can_be_refunded = serializers.ReadOnlyField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_reference', 'external_reference', 'amount', 'currency',
            'method', 'status', 'user', 'mobile_money_phone', 'mobile_money_provider',
            'card_last_four', 'card_brand', 'failure_reason', 'is_successful',
            'is_pending', 'can_be_refunded', 'created_at', 'updated_at', 'processed_at'
        ]
        read_only_fields = [
            'id', 'payment_reference', 'external_reference', 'user', 'status',
            'mobile_money_provider', 'card_last_four', 'card_brand', 'failure_reason',
            'is_successful', 'is_pending', 'can_be_refunded', 'created_at',
            'updated_at', 'processed_at'
        ]

class PaymentLogSerializer(serializers.ModelSerializer):
    """
    Serializer for Payment Log model
    """
    class Meta:
        model = PaymentLog
        fields = ['id', 'event_type', 'message', 'data', 'created_at']
        read_only_fields = ['id', 'created_at']

class RefundRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for Refund Request model
    """
    payment = PaymentSerializer(read_only=True)
    requested_by = serializers.StringRelatedField(read_only=True)
    reviewed_by = serializers.StringRelatedField(read_only=True)
    can_be_approved = serializers.ReadOnlyField()
    
    class Meta:
        model = RefundRequest
        fields = [
            'id', 'payment', 'requested_by', 'amount', 'reason', 'status',
            'reviewed_by', 'admin_notes', 'refund_reference', 'processed_amount',
            'can_be_approved', 'created_at', 'updated_at', 'processed_at'
        ]
        read_only_fields = [
            'id', 'payment', 'requested_by', 'status', 'reviewed_by',
            'admin_notes', 'refund_reference', 'processed_amount',
            'can_be_approved', 'created_at', 'updated_at', 'processed_at'
        ]

class RefundRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating refund requests
    """
    class Meta:
        model = RefundRequest
        fields = ['amount', 'reason']
    
    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Refund amount must be greater than 0")
        return value
    
    def validate(self, attrs):
        # Get payment from context
        payment = self.context.get('payment')
        if not payment:
            raise serializers.ValidationError("Payment context is required")
        
        amount = attrs.get('amount')
        
        # Check if payment can be refunded
        if not payment.can_be_refunded:
            raise serializers.ValidationError("Payment cannot be refunded")
        
        # Check if refund amount is valid
        if amount > payment.amount:
            raise serializers.ValidationError("Refund amount cannot exceed payment amount")
        
        # Check for existing pending refund requests
        existing_refunds = RefundRequest.objects.filter(
            payment=payment,
            status__in=['pending', 'approved', 'processing']
        )
        
        if existing_refunds.exists():
            raise serializers.ValidationError("A refund request is already pending for this payment")
        
        return attrs

class RefundApprovalSerializer(serializers.Serializer):
    """
    Serializer for approving/rejecting refund requests
    """
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    admin_notes = serializers.CharField(required=False, allow_blank=True)

class PaymentStatsSerializer(serializers.Serializer):
    """
    Serializer for payment statistics
    """
    total_payments = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    successful_payments = serializers.IntegerField()
    successful_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    failed_payments = serializers.IntegerField()
    pending_payments = serializers.IntegerField()
    refund_requests = serializers.IntegerField()
    payments_by_method = serializers.DictField()
    monthly_revenue = serializers.ListField()

class PaymentWebhookSerializer(serializers.Serializer):
    """
    Serializer for payment webhook data
    """
    payment_reference = serializers.CharField()
    external_reference = serializers.CharField(required=False)
    status = serializers.ChoiceField(choices=['success', 'failed', 'cancelled'])
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    provider_data = serializers.JSONField(required=False)
    failure_reason = serializers.CharField(required=False, allow_blank=True)
