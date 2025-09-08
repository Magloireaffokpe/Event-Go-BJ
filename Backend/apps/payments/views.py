from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from datetime import timedelta

from .models import Payment, RefundRequest, PaymentLog
from .serializers import (
    PaymentSerializer,
    RefundRequestSerializer,
    RefundRequestCreateSerializer,
    RefundApprovalSerializer,
    PaymentStatsSerializer,
    PaymentWebhookSerializer
)
from .services import PaymentService

class PaymentPermission(permissions.BasePermission):
    """
    Custom permission for payments:
    - Users can view their own payments
    - Admins can view all payments
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        
        return obj.user == request.user

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing payments
    """
    serializer_class = PaymentSerializer
    permission_classes = [PaymentPermission]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return Payment.objects.all().select_related('user', 'purchase__ticket__event')
        else:
            return Payment.objects.filter(user=user).select_related('purchase__ticket__event')
    
    @extend_schema(
        summary="List Payments",
        description="Get list of payments for the authenticated user",
        responses={200: PaymentSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Get Payment Details",
        description="Get detailed information about a specific payment",
        responses={200: PaymentSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        summary="Retry Payment",
        description="Retry a failed payment",
        responses={200: PaymentSerializer}
    )
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed payment"""
        payment = self.get_object()
        
        if payment.status not in ['failed', 'cancelled']:
            return Response({
                'error': 'Only failed or cancelled payments can be retried'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if purchase is still valid
        if payment.purchase and payment.purchase.status == 'cancelled':
            return Response({
                'error': 'Cannot retry payment for cancelled purchase'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            payment_service = PaymentService()
            result = payment_service.retry_payment(payment)
            
            if result['success']:
                return Response({
                    'message': 'Payment retry initiated',
                    'payment': PaymentSerializer(payment, context={'request': request}).data
                })
            else:
                return Response({
                    'error': 'Payment retry failed',
                    'details': result.get('error', 'Unknown error')
                }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({
                'error': 'Payment retry failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @extend_schema(
        summary="Get Payment Statistics",
        description="Get payment statistics (admin only)",
        responses={200: PaymentStatsSerializer}
    )
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request):
        """Get payment statistics"""
        if request.user.role != 'admin':
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Calculate statistics
        total_payments = Payment.objects.count()
        total_amount = Payment.objects.aggregate(Sum('amount'))['amount__sum'] or 0
        
        successful_payments = Payment.objects.filter(status='success').count()
        successful_amount = Payment.objects.filter(status='success').aggregate(Sum('amount'))['amount__sum'] or 0
        
        failed_payments = Payment.objects.filter(status='failed').count()
        pending_payments = Payment.objects.filter(status__in=['pending', 'processing']).count()
        refund_requests_count = RefundRequest.objects.count()
        
        # Payments by method
        payments_by_method = dict(
            Payment.objects.values('method').annotate(count=Count('id')).values_list('method', 'count')
        )
        
        # Monthly revenue for the last 12 months
        monthly_revenue = []
        for i in range(12):
            month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30*i)
            month_end = month_start.replace(day=28) + timedelta(days=4)
            month_end = month_end - timedelta(days=month_end.day)
            
            revenue = Payment.objects.filter(
                status='success',
                created_at__range=[month_start, month_end]
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            monthly_revenue.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': float(revenue)
            })
        
        stats = {
            'total_payments': total_payments,
            'total_amount': total_amount,
            'successful_payments': successful_payments,
            'successful_amount': successful_amount,
            'failed_payments': failed_payments,
            'pending_payments': pending_payments,
            'refund_requests': refund_requests_count,
            'payments_by_method': payments_by_method,
            'monthly_revenue': monthly_revenue
        }
        
        serializer = PaymentStatsSerializer(stats)
        return Response(serializer.data)

class RefundRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing refund requests
    """
    serializer_class = RefundRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return RefundRequest.objects.all().select_related('payment', 'requested_by', 'reviewed_by')
        else:
            return RefundRequest.objects.filter(requested_by=user).select_related('payment', 'reviewed_by')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return RefundRequestCreateSerializer
        return RefundRequestSerializer
    
    @extend_schema(
        summary="Create Refund Request",
        description="Create a new refund request for a payment",
        request=RefundRequestCreateSerializer,
        responses={201: RefundRequestSerializer}
    )
    def create(self, request, *args, **kwargs):
        # Get payment from URL or request data
        payment_id = request.data.get('payment_id')
        if not payment_id:
            return Response({
                'error': 'payment_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        payment = get_object_or_404(Payment, id=payment_id, user=request.user)
        
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request, 'payment': payment}
        )
        
        if serializer.is_valid():
            refund_request = serializer.save(
                payment=payment,
                requested_by=request.user
            )
            
            # Send notification to admins
            from apps.notifications.services import NotificationService
            notification_service = NotificationService()
            notification_service.send_refund_request_notification(refund_request)
            
            return Response(
                RefundRequestSerializer(refund_request, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Review Refund Request",
        description="Approve or reject a refund request (admin only)",
        request=RefundApprovalSerializer,
        responses={200: RefundRequestSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def review(self, request, pk=None):
        """Review a refund request (admin only)"""
        if request.user.role != 'admin':
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        refund_request = self.get_object()
        serializer = RefundApprovalSerializer(data=request.data)
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            admin_notes = serializer.validated_data.get('admin_notes', '')
            
            try:
                if action == 'approve':
                    refund_request.approve(request.user, admin_notes)
                    
                    # Process the refund
                    payment_service = PaymentService()
                    refund_result = payment_service.process_refund(refund_request)
                    
                    if refund_result['success']:
                        refund_request.status = 'completed'
                        refund_request.refund_reference = refund_result.get('refund_reference', '')
                        refund_request.processed_amount = refund_request.amount
                        refund_request.processed_at = timezone.now()
                        refund_request.save()
                    else:
                        refund_request.status = 'failed'
                        refund_request.admin_notes += f"\nRefund processing failed: {refund_result.get('error', 'Unknown error')}"
                        refund_request.save()
                
                elif action == 'reject':
                    refund_request.reject(request.user, admin_notes)
                
                # Send notification to user
                from apps.notifications.services import NotificationService
                notification_service = NotificationService()
                notification_service.send_refund_status_notification(refund_request)
                
                return Response(
                    RefundRequestSerializer(refund_request, context={'request': request}).data
                )
            
            except ValueError as e:
                return Response({
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PaymentWebhookView(viewsets.GenericViewSet):
    """
    ViewSet for handling payment webhooks
    """
    permission_classes = []  # Webhook endpoints don't require authentication
    serializer_class = PaymentWebhookSerializer
    
    @extend_schema(
        summary="Payment Webhook",
        description="Handle payment status updates from payment providers",
        request=PaymentWebhookSerializer,
        responses={200: OpenApiResponse(description="Webhook processed successfully")}
    )
    @action(detail=False, methods=['post'])
    def mobile_money(self, request):
        """Handle mobile money payment webhooks"""
        serializer = PaymentWebhookSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                payment_service = PaymentService()
                result = payment_service.handle_webhook(
                    'mobile_money',
                    serializer.validated_data
                )
                
                if result['success']:
                    return Response({
                        'status': 'success',
                        'message': 'Webhook processed successfully'
                    })
                else:
                    return Response({
                        'status': 'error',
                        'message': result.get('error', 'Webhook processing failed')
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Card Payment Webhook",
        description="Handle card payment status updates from payment providers",
        request=PaymentWebhookSerializer,
        responses={200: OpenApiResponse(description="Webhook processed successfully")}
    )
    @action(detail=False, methods=['post'])
    def card(self, request):
        """Handle card payment webhooks"""
        serializer = PaymentWebhookSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                payment_service = PaymentService()
                result = payment_service.handle_webhook(
                    'card',
                    serializer.validated_data
                )
                
                if result['success']:
                    return Response({
                        'status': 'success',
                        'message': 'Webhook processed successfully'
                    })
                else:
                    return Response({
                        'status': 'error',
                        'message': result.get('error', 'Webhook processing failed')
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
