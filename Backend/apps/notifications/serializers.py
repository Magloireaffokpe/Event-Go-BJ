from rest_framework import serializers
from .models import Notification, NotificationTemplate, NotificationPreference, NotificationLog

class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model
    """
    user = serializers.StringRelatedField(read_only=True)
    related_event = serializers.StringRelatedField(read_only=True)
    related_purchase = serializers.StringRelatedField(read_only=True)
    is_sent = serializers.ReadOnlyField()
    is_delivered = serializers.ReadOnlyField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_id', 'user', 'notification_type', 'event_type',
            'subject', 'content', 'recipient_email', 'recipient_phone', 'status',
            'related_event', 'related_purchase', 'provider_id', 'error_message',
            'is_sent', 'is_delivered', 'sent_at', 'delivered_at', 'opened_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'notification_id', 'user', 'provider_id', 'error_message',
            'is_sent', 'is_delivered', 'sent_at', 'delivered_at', 'opened_at',
            'created_at', 'updated_at'
        ]

class NotificationTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification Template model
    """
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'name', 'notification_type', 'event_type', 'subject',
            'content', 'html_content', 'is_active', 'send_to_user',
            'send_to_organizer', 'send_to_admin', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification Preference model
    """
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'user', 'email_purchase_confirmation', 'email_event_reminders',
            'email_event_updates', 'email_marketing', 'push_purchase_confirmation',
            'push_event_reminders', 'push_event_updates', 'sms_purchase_confirmation',
            'sms_event_reminders', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

class NotificationLogSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification Log model
    """
    class Meta:
        model = NotificationLog
        fields = ['id', 'event_type', 'message', 'data', 'created_at']
        read_only_fields = ['id', 'created_at']

class NotificationStatsSerializer(serializers.Serializer):
    """
    Serializer for notification statistics
    """
    total_notifications = serializers.IntegerField()
    notifications_by_type = serializers.DictField()
    notifications_by_status = serializers.DictField()
    delivery_rate = serializers.FloatField()
    open_rate = serializers.FloatField()
    recent_notifications = NotificationSerializer(many=True)

class BulkNotificationSerializer(serializers.Serializer):
    """
    Serializer for sending bulk notifications
    """
    event_type = serializers.ChoiceField(choices=NotificationTemplate.EVENT_TYPES)
    notification_type = serializers.ChoiceField(choices=NotificationTemplate.NOTIFICATION_TYPES)
    subject = serializers.CharField(max_length=200, required=False)
    content = serializers.CharField()
    html_content = serializers.CharField(required=False, allow_blank=True)
    
    # Recipient filters
    user_roles = serializers.MultipleChoiceField(
        choices=[('participant', 'Participant'), ('organizer', 'Organizer'), ('admin', 'Admin')],
        required=False
    )
    event_id = serializers.IntegerField(required=False)
    
    def validate(self, attrs):
        notification_type = attrs.get('notification_type')
        
        if notification_type == 'email' and not attrs.get('subject'):
            raise serializers.ValidationError({
                'subject': 'Subject is required for email notifications'
            })
        
        return attrs
