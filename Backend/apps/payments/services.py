"""
Payment processing services for EventGo BJ.
Handles payment processing, webhooks, and refunds for both Mobile Money and Card payments.
This is a mock implementation for demonstration purposes.
"""

import uuid
import random
from decimal import Decimal
from django.utils import timezone
from django.conf import settings
from django.db import transaction

from .models import Payment, Refund


class PaymentService:
    """
    Mock payment service for handling Mobile Money and Card payments.
    In production, this would integrate with real payment gateways.
    """
    
    def process_payment(self, payment_data):
        """
        Process a payment request.
        
        Args:
            payment_data (dict): Payment information including amount, method, and details
            
        Returns:
            dict: Payment processing result with success status and reference
        """
        try:
            # Mock payment processing - in production this would call external APIs
            payment_method = payment_data.get('method')
            amount = payment_data.get('amount')
            
            # Simulate payment processing with random success/failure
            success_rate = 0.9 if payment_method == 'mobile_money' else 0.95
            is_successful = random.random() < success_rate
            
            if is_successful:
                payment_reference = self._generate_payment_reference(payment_method)
                return {
                    'success': True,
                    'payment_reference': payment_reference,
                    'status': 'completed',
                    'message': f'{payment_method.title()} payment processed successfully'
                }
            else:
                return {
                    'success': False,
                    'status': 'failed',
                    'error': 'Payment processing failed. Please try again.'
                }
                
        except Exception as e:
            return {
                'success': False,
                'status': 'failed',
                'error': f'Payment processing error: {str(e)}'
            }
    
    def retry_payment(self, payment):
        """
        Retry a failed payment.
        
        Args:
            payment: Payment instance to retry
            
        Returns:
            dict: Retry result with success status
        """
        try:
            # Mock retry logic - in production this would call external APIs
            payment_data = {
                'amount': payment.amount,
                'method': payment.payment_method,
                'purchase_reference': payment.purchase.purchase_reference if payment.purchase else None
            }
            
            result = self.process_payment(payment_data)
            
            if result['success']:
                # Update payment status
                payment.status = 'completed'
                payment.payment_reference = result['payment_reference']
                payment.processed_at = timezone.now()
                payment.save()
                
                # Update related purchase if exists
                if payment.purchase:
                    payment.purchase.status = 'confirmed'
                    payment.purchase.save()
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Payment retry failed: {str(e)}'
            }
    
    def handle_webhook(self, provider_type, webhook_data):
        """
        Handle payment webhook from external providers.
        
        Args:
            provider_type (str): Type of payment provider ('mobile_money' or 'card')
            webhook_data (dict): Webhook payload data
            
        Returns:
            dict: Webhook processing result
        """
        try:
            payment_reference = webhook_data.get('payment_reference')
            transaction_status = webhook_data.get('status')
            
            if not payment_reference:
                return {
                    'success': False,
                    'error': 'Payment reference is required'
                }
            
            # Find payment by reference
            try:
                payment = Payment.objects.get(payment_reference=payment_reference)
            except Payment.DoesNotExist:
                return {
                    'success': False,
                    'error': 'Payment not found'
                }
            
            # Update payment status based on webhook
            status_mapping = {
                'success': 'completed',
                'completed': 'completed',
                'failed': 'failed',
                'cancelled': 'cancelled',
                'pending': 'pending'
            }
            
            new_status = status_mapping.get(transaction_status, 'pending')
            
            with transaction.atomic():
                payment.status = new_status
                if new_status == 'completed':
                    payment.processed_at = timezone.now()
                payment.save()
                
                # Update related purchase
                if payment.purchase:
                    if new_status == 'completed':
                        payment.purchase.status = 'confirmed'
                    elif new_status in ['failed', 'cancelled']:
                        payment.purchase.status = 'cancelled'
                    payment.purchase.save()
            
            return {
                'success': True,
                'message': f'Webhook processed successfully for {provider_type} payment'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Webhook processing failed: {str(e)}'
            }
    
    def process_refund(self, refund_request):
        """
        Process a refund request.
        
        Args:
            refund_request: RefundRequest instance
            
        Returns:
            dict: Refund processing result
        """
        try:
            # Mock refund processing - in production this would call external APIs
            payment = refund_request.payment
            
            # Simulate refund processing with high success rate
            is_successful = random.random() < 0.95
            
            if is_successful:
                refund_reference = self._generate_refund_reference()
                
                # Create refund record
                refund = Refund.objects.create(
                    payment=payment,
                    refund_request=refund_request,
                    amount=refund_request.amount,
                    refund_reference=refund_reference,
                    refund_method=payment.payment_method,
                    status='completed',
                    processed_at=timezone.now()
                )
                
                return {
                    'success': True,
                    'refund_reference': refund_reference,
                    'message': 'Refund processed successfully'
                }
            else:
                return {
                    'success': False,
                    'error': 'Refund processing failed. Please try again.'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Refund processing error: {str(e)}'
            }
    
    def _generate_payment_reference(self, payment_method):
        """Generate a unique payment reference."""
        prefix = 'MM' if payment_method == 'mobile_money' else 'CC'
        return f"{prefix}{uuid.uuid4().hex[:12].upper()}"
    
    def _generate_refund_reference(self):
        """Generate a unique refund reference."""
        return f"RF{uuid.uuid4().hex[:12].upper()}"