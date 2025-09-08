from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from datetime import timedelta

from .models import Notification, NotificationTemplate, NotificationPreference
from .serializers import (
    NotificationSerializer,
    NotificationTemplateSerializer,
    NotificationPreferenceSerializer,
    NotificationStatsSerializer,
    BulkNotificationSerializer
)
from .services import NotificationService

class NotificationPermission(permissions.BasePermission):
    """
    Custom permission for notifications:
    - Users can view their own notifications
    - Admins can view all notifications and manage templates
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [NotificationPermission]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return Notification.objects.all().select_related('user', 'related_event', 'related_purchase')
        else:
            return Notification.objects.filter(user=user).select_related('related_event', 'related_purchase')
    
    @extend_schema(
        summary="List Notifications",
        description="Get list of notifications for the authenticated user",
        responses={200: NotificationSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Get Notification Details",
        description="Get detailed information about a specific notification",
        responses={200: NotificationSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        # Mark notification as opened if it's an email
        notification = self.get_object()
        if notification.notification_type == 'email' and notification.status == 'delivered':
            notification.mark_as_opened()
        
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        summary="Mark as Read",
        description="Mark notification as read/opened",
        responses={200: NotificationSerializer}
    )
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        
        if notification.status in ['sent', 'delivered']:
            notification.mark_as_opened()
        
        return Response(
            NotificationSerializer(notification, context={'request': request}).data
        )
    
    @extend_schema(
        summary="Get Notification Statistics",
        description="Get notification statistics (admin only)",
        responses={200: NotificationStatsSerializer}
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get notification statistics"""
        if request.user.role != 'admin':
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Calculate statistics
        total_notifications = Notification.objects.count()
        
        # Notifications by type
        notifications_by_type = dict(
            Notification.objects.values('notification_type').annotate(
                count=Count('id')
            ).values_list('notification_type', 'count')
        )
        
        # Notifications by status
        notifications_by_status = dict(
            Notification.objects.values('status').annotate(
                count=Count('id')
            ).values_list('status', 'count')
        )
        
        # Calculate delivery and open rates
        sent_count = Notification.objects.filter(status__in=['sent', 'delivered', 'opened']).count()
        delivered_count = Notification.objects.filter(status__in=['delivered', 'opened']).count()
        opened_count = Notification.objects.filter(status='opened').count()
        
        delivery_rate = (delivered_count / sent_count * 100) if sent_count > 0 else 0
        open_rate = (opened_count / delivered_count * 100) if delivered_count > 0 else 0
        
        # Recent notifications
        recent_notifications = Notification.objects.all()[:10]
        
        stats = {
            'total_notifications': total_notifications,
            'notifications_by_type': notifications_by_type,
            'notifications_by_status': notifications_by_status,
            'delivery_rate': delivery_rate,
            'open_rate': open_rate,
            'recent_notifications': NotificationSerializer(recent_notifications, many=True, context={'request': request}).data
        }
        
        serializer = NotificationStatsSerializer(stats)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Send Bulk Notification",
        description="Send bulk notifications to users (admin only)",
        request=BulkNotificationSerializer,
        responses={200: OpenApiResponse(description="Bulk notification sent successfully")}
    )
    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        """Send bulk notifications"""
        if request.user.role != 'admin':
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = BulkNotificationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                notification_service = NotificationService()
                result = notification_service.send_bulk_notification(serializer.validated_data)
                
                return Response({
                    'message': 'Bulk notification sent successfully',
                    'sent_count': result.get('sent_count', 0),
                    'failed_count': result.get('failed_count', 0)
                })
            
            except Exception as e:
                return Response({
                    'error': 'Failed to send bulk notification',
                    'details': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification templates (admin only)
    """
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """Only admins can manage templates"""
        if self.request.user.is_authenticated and self.request.user.role == 'admin':
            return [permissions.IsAuthenticated()]
        class DenyPermission(permissions.BasePermission):
            def has_permission(self, request, view):
                return False
        return [DenyPermission()]
    
    @extend_schema(
        summary="List Notification Templates",
        description="Get list of notification templates (admin only)",
        responses={200: NotificationTemplateSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Create Notification Template",
        description="Create a new notification template (admin only)",
        request=NotificationTemplateSerializer,
        responses={201: NotificationTemplateSerializer}
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user notification preferences
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create notification preferences for the user"""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return preferences
    
    @extend_schema(
        summary="Get Notification Preferences",
        description="Get current user's notification preferences",
        responses={200: NotificationPreferenceSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update Notification Preferences",
        description="Update current user's notification preferences",
        request=NotificationPreferenceSerializer,
        responses={200: NotificationPreferenceSerializer}
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @extend_schema(
        summary="Partially Update Notification Preferences",
        description="Partially update current user's notification preferences",
        request=NotificationPreferenceSerializer,
        responses={200: NotificationPreferenceSerializer}
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's notification preferences"""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences)
        return Response(serializer.data)
