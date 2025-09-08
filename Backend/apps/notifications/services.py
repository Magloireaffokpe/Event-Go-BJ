"""
Notification services for EventGo BJ.
Handles sending various types of notifications including email, SMS, and push notifications.
This is a mock implementation for demonstration purposes.
"""

import logging
from typing import Dict, Any, List
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from .models import NotificationTemplate, NotificationLog, NotificationPreference

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Mock notification service for handling various types of notifications.
    In production, this would integrate with email services, SMS providers, and push notification services.
    """
    
    def send_bulk_notification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send bulk notifications to multiple users.
        
        Args:
            data: Dictionary containing notification details and recipient list
            
        Returns:
            dict: Result of bulk notification sending
        """
        try:
            message = data.get('message', '')
            notification_type = data.get('notification_type', 'general')
            channels = data.get('channels', ['email'])
            user_ids = data.get('user_ids', [])
            
            if not user_ids:
                return {
                    'success': False,
                    'error': 'No recipients specified'
                }
            
            sent_count = 0
            failed_count = 0
            
            # Mock bulk sending - in production this would use actual notification services
            for user_id in user_ids:
                try:
                    # Check user preferences
                    preferences = self._get_user_preferences(user_id)
                    
                    for channel in channels:
                        if self._is_channel_enabled(preferences, channel, notification_type):
                            # Mock sending - in production this would call actual services
                            success = self._mock_send_notification(user_id, message, channel)
                            if success:
                                sent_count += 1
                            else:
                                failed_count += 1
                            
                            # Log notification
                            self._log_notification(
                                user_id=user_id,
                                notification_type=notification_type,
                                channel=channel,
                                message=message,
                                status='sent' if success else 'failed'
                            )
                except Exception as e:
                    logger.error(f"Failed to send notification to user {user_id}: {str(e)}")
                    failed_count += 1
            
            return {
                'success': True,
                'sent_count': sent_count,
                'failed_count': failed_count,
                'message': f'Bulk notification completed. Sent: {sent_count}, Failed: {failed_count}'
            }
            
        except Exception as e:
            logger.error(f"Bulk notification failed: {str(e)}")
            return {
                'success': False,
                'error': f'Bulk notification failed: {str(e)}'
            }
    
    def send_refund_request_notification(self, refund_request) -> None:
        """
        Send notification about new refund request to administrators.
        
        Args:
            refund_request: RefundRequest instance
        """
        try:
            # Mock notification to admins about new refund request
            message = f"New refund request #{refund_request.id} has been submitted for payment {refund_request.payment.payment_reference}."
            
            # In production, this would send to actual admin users
            self._mock_send_admin_notification(
                subject='New Refund Request',
                message=message,
                notification_type='refund_request'
            )
            
            logger.info(f"Refund request notification sent for request #{refund_request.id}")
            
        except Exception as e:
            logger.error(f"Failed to send refund request notification: {str(e)}")
    
    def send_refund_status_notification(self, refund_request) -> None:
        """
        Send notification about refund status update to user.
        
        Args:
            refund_request: RefundRequest instance
        """
        try:
            user = refund_request.payment.purchase.user if refund_request.payment.purchase else None
            
            if not user:
                logger.warning(f"No user found for refund request #{refund_request.id}")
                return
            
            status_messages = {
                'approved': 'Your refund request has been approved and is being processed.',
                'rejected': f'Your refund request has been rejected. Reason: {refund_request.admin_notes}',
                'completed': 'Your refund has been processed successfully.',
                'failed': 'Your refund processing failed. Please contact support.'
            }
            
            message = status_messages.get(refund_request.status, 'Your refund request status has been updated.')
            
            # Mock notification sending
            self._mock_send_user_notification(
                user_id=user.id,
                subject=f'Refund Update - Request #{refund_request.id}',
                message=message,
                notification_type='refund_status'
            )
            
            logger.info(f"Refund status notification sent to user {user.id}")
            
        except Exception as e:
            logger.error(f"Failed to send refund status notification: {str(e)}")
    
    def send_purchase_confirmation(self, purchase) -> None:
        """
        Send purchase confirmation notification to user.
        
        Args:
            purchase: Purchase instance
        """
        try:
            user = purchase.user
            event = purchase.ticket.event
            
            message = f"Your ticket purchase for '{event.title}' has been confirmed! Purchase reference: {purchase.purchase_reference}"
            
            # Check user preferences
            preferences = self._get_user_preferences(user.id)
            
            # Send via enabled channels
            if self._is_channel_enabled(preferences, 'email', 'purchase_confirmation'):
                self._mock_send_email(user.email, 'Purchase Confirmed', message)
            
            if self._is_channel_enabled(preferences, 'sms', 'purchase_confirmation'):
                self._mock_send_sms(user.phone if hasattr(user, 'phone') else None, message)
            
            logger.info(f"Purchase confirmation sent for purchase {purchase.purchase_reference}")
            
        except Exception as e:
            logger.error(f"Failed to send purchase confirmation: {str(e)}")
    
    def send_purchase_cancellation(self, purchase) -> None:
        """
        Send purchase cancellation notification to user.
        
        Args:
            purchase: Purchase instance
        """
        try:
            user = purchase.user
            event = purchase.ticket.event
            
            message = f"Your ticket purchase for '{event.title}' has been cancelled. Reference: {purchase.purchase_reference}"
            
            # Check user preferences
            preferences = self._get_user_preferences(user.id)
            
            # Send via enabled channels
            if self._is_channel_enabled(preferences, 'email', 'purchase_cancellation'):
                self._mock_send_email(user.email, 'Purchase Cancelled', message)
            
            if self._is_channel_enabled(preferences, 'sms', 'purchase_cancellation'):
                self._mock_send_sms(user.phone if hasattr(user, 'phone') else None, message)
            
            logger.info(f"Purchase cancellation sent for purchase {purchase.purchase_reference}")
            
        except Exception as e:
            logger.error(f"Failed to send purchase cancellation: {str(e)}")
    
    def _get_user_preferences(self, user_id: int) -> Dict[str, Any]:
        """Get user notification preferences."""
        try:
            preferences = NotificationPreference.objects.filter(user_id=user_id).first()
            if preferences:
                return {
                    'email_enabled': True,  # Simplified - check specific preferences per event type
                    'sms_enabled': True,
                    'push_enabled': True,
                    'preferences_object': preferences
                }
        except Exception as e:
            logger.error(f"Error getting user preferences for user {user_id}: {str(e)}")
        
        # Default preferences
        return {
            'email_enabled': True,
            'sms_enabled': False,
            'push_enabled': True,
            'notification_types': {}
        }
    
    def _is_channel_enabled(self, preferences: Dict[str, Any], channel: str, notification_type: str) -> bool:
        """Check if a notification channel is enabled for a user."""
        preferences_object = preferences.get('preferences_object')
        
        if not preferences_object:
            # Default preferences if user hasn't set any
            return channel in ['email', 'push']
        
        # Map notification types to specific preferences
        if channel == 'email' and notification_type in ['purchase_confirmation', 'purchase_cancellation']:
            return preferences_object.email_purchase_confirmation
        elif channel == 'email' and 'event' in notification_type:
            return preferences_object.email_event_reminders
        elif channel == 'push' and notification_type in ['purchase_confirmation', 'purchase_cancellation']:
            return preferences_object.push_purchase_confirmation
        elif channel == 'push' and 'event' in notification_type:
            return preferences_object.push_event_reminders
        elif channel == 'sms' and notification_type in ['purchase_confirmation', 'purchase_cancellation']:
            return preferences_object.sms_purchase_confirmation
        elif channel == 'sms' and 'event' in notification_type:
            return preferences_object.sms_event_reminders
        
        # Default to enabled for email and push, disabled for sms
        return channel in ['email', 'push']
    
    def _mock_send_notification(self, user_id: int, message: str, channel: str) -> bool:
        """Mock notification sending with success simulation."""
        # Simulate 95% success rate
        import random
        success = random.random() < 0.95
        
        if success:
            logger.info(f"Mock {channel} notification sent to user {user_id}: {message[:50]}...")
        else:
            logger.warning(f"Mock {channel} notification failed for user {user_id}")
        
        return success
    
    def _mock_send_email(self, email: str, subject: str, message: str) -> bool:
        """Mock email sending."""
        logger.info(f"Mock email sent to {email}: {subject}")
        return True
    
    def _mock_send_sms(self, phone: str, message: str) -> bool:
        """Mock SMS sending."""
        if phone:
            logger.info(f"Mock SMS sent to {phone}: {message[:30]}...")
            return True
        return False
    
    def _mock_send_admin_notification(self, subject: str, message: str, notification_type: str) -> None:
        """Mock admin notification sending."""
        logger.info(f"Mock admin notification: {subject}")
    
    def _mock_send_user_notification(self, user_id: int, subject: str, message: str, notification_type: str) -> None:
        """Mock user notification sending."""
        logger.info(f"Mock user notification sent to user {user_id}: {subject}")
    
    def _log_notification(self, user_id: int, notification_type: str, channel: str, message: str, status: str) -> None:
        """Log notification for tracking and debugging."""
        try:
            NotificationLog.objects.create(
                user_id=user_id,
                notification_type=notification_type,
                channel=channel,
                message=message[:500],  # Truncate long messages
                status=status,
                sent_at=timezone.now()
            )
        except Exception as e:
            logger.error(f"Failed to log notification: {str(e)}")