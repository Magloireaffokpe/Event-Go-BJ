from rest_framework import generics, status, permissions, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
import json
from apps.notifications.services import NotificationService
from apps.payments.services import PaymentService  # Assurez-vous que ce service existe

from .models import Ticket, Purchase, Attendee, TicketValidation
from .serializers import (
    TicketSerializer,
    TicketCreateUpdateSerializer,
    PurchaseSerializer,
    TicketPurchaseSerializer,
    AttendeeSerializer,
    QRCodeValidationSerializer,
    TicketValidationSerializer,
    PurchaseCreateSerializer
)
from apps.events.models import Event
from apps.payments.services import PaymentService

class TicketPermission(permissions.BasePermission):
    """
    Custom permission for tickets:
    - Anyone can read tickets
    - Only event organizers can create/update/delete tickets for their events
    - Admins can do everything
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if not request.user.is_authenticated:
            return False
        
        return request.user.role in ['organizer', 'admin']
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if request.user.role == 'admin':
            return True
        
        # Check if user is the event organizer
        if hasattr(obj, 'event'):
            return obj.event.organizer == request.user
        elif hasattr(obj, 'ticket'):
            return obj.ticket.event.organizer == request.user
        
        return False
class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les tickets d'événements.
    Nested route: /api/events/<event_pk>/tickets/
    """
    serializer_class = TicketSerializer
    permission_classes = [TicketPermission]

    def get_queryset(self):
        event_id = self.kwargs.get("event_pk")
        if event_id:
            return Ticket.objects.filter(
                event_id=event_id,
                is_active=True
            ).select_related('event')
        return Ticket.objects.filter(is_active=True).select_related('event')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TicketCreateUpdateSerializer
        elif self.action == 'purchase':
            return TicketPurchaseSerializer
        return TicketSerializer

    def perform_create(self, serializer):
        event = get_object_or_404(Event, id=self.kwargs.get('event_pk'))
        if self.request.user.role != 'admin' and event.organizer != self.request.user:
            raise PermissionDenied("You can only create tickets for your own events")
        serializer.save(event=event)

    @extend_schema(
        summary="Create Ticket Type",
        description="Create a new ticket type for an event (organizers and admins only)",
        request=TicketCreateUpdateSerializer,
        responses={201: TicketSerializer}
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        response_serializer = TicketSerializer(serializer.instance, context={'request': request})
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @extend_schema(
        summary="List Tickets",
        description="Get list of available tickets for an event",
        responses={200: TicketSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Purchase Ticket",
        description="Purchase a ticket",
        request=TicketPurchaseSerializer,
        responses={201: PurchaseSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def purchase(self, request, pk=None):
        """Purchase a ticket"""
        ticket = self.get_object()
        serializer = TicketPurchaseSerializer(data=request.data)
        
        if serializer.is_valid():
            quantity = serializer.validated_data['quantity']
            payment_method = serializer.validated_data['payment_method']
            attendees_data = serializer.validated_data.get('attendees', [])
            
            if not ticket.can_purchase(quantity):
                return Response({
                    'error': 'Ticket not available for purchase or insufficient quantity'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if ticket.event.is_past:
                return Response({
                    'error': 'Cannot purchase tickets for past events'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                with transaction.atomic():
                    purchase_data = {
                        'ticket': ticket,
                        'user': request.user,
                        'quantity': quantity,
                        'unit_price': ticket.price,
                        'payment_method': payment_method
                    }
                    
                    purchase_serializer = PurchaseCreateSerializer(data=purchase_data)
                    purchase_serializer.is_valid(raise_exception=True)
                    purchase = purchase_serializer.save()
                    
                    payment_service = PaymentService()
                    payment_data = {
                        'amount': purchase.total_amount,
                        'method': payment_method,
                        'purchase_reference': purchase.purchase_reference
                    }
                    
                    if payment_method == 'mobile_money':
                        payment_data['phone'] = serializer.validated_data['phone']
                    elif payment_method == 'card':
                        payment_data.update({
                            'card_number': serializer.validated_data['card_number'],
                            'card_expiry': serializer.validated_data['card_expiry'],
                            'card_cvv': serializer.validated_data['card_cvv'],
                            'card_holder_name': serializer.validated_data['card_holder_name']
                        })
                    
                    payment_result = payment_service.process_payment(payment_data)
                    
                    if payment_result['success']:
                        purchase.status = 'paid'
                        purchase.payment_reference = payment_result['reference']
                        purchase.save()
                        
                        if attendees_data:
                            for attendee_data in attendees_data:
                                Attendee.objects.create(
                                    purchase=purchase,
                                    **attendee_data
                                )
                        else:
                            Attendee.objects.create(
                                purchase=purchase,
                                first_name=request.user.first_name,
                                last_name=request.user.last_name,
                                email=request.user.email,
                                phone=request.user.phone or ''
                            )
                        
                        notification_service = NotificationService()
                        notification_service.send_purchase_confirmation(purchase)
                        
                        return Response(
                            PurchaseSerializer(purchase, context={'request': request}).data,
                            status=status.HTTP_201_CREATED
                        )
                    else:
                        purchase.status = 'cancelled'
                        purchase.save()
                        
                        return Response({
                            'error': 'Payment failed',
                            'details': payment_result.get('error', 'Unknown error')
                        }, status=status.HTTP_400_BAD_REQUEST)
            
            except Exception as e:
                return Response({
                    'error': 'Purchase failed',
                    'details': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class PurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing purchases
    """
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return Purchase.objects.all().select_related('ticket__event', 'user').prefetch_related('attendees')
        
        # NEW LOGIC: Organizers can see purchases for their events
        if user.role == 'organizer':
            # Get all events organized by the current user
            organized_events = Event.objects.filter(organizer=user)
            # Filter purchases for these events
            return Purchase.objects.filter(ticket__event__in=organized_events).select_related('ticket__event', 'user').prefetch_related('attendees')
        
        # Default: Users can only see their own purchases
        return Purchase.objects.filter(user=user).select_related('ticket__event').prefetch_related('attendees')
    @extend_schema(
        summary="Get Purchase Details",
        description="Get detailed information about a purchase including QR code",
        responses={200: PurchaseSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        summary="Cancel Purchase",
        description="Cancel a purchase if allowed",
        responses={200: PurchaseSerializer}
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a purchase"""
        purchase = self.get_object()
        
        if not purchase.can_be_cancelled:
            return Response({
                'error': 'Purchase cannot be cancelled'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            purchase.cancel()
            
            # Send cancellation notification
            from apps.notifications.services import NotificationService
            notification_service = NotificationService()
            notification_service.send_purchase_cancellation(purchase)
            
            return Response(
                PurchaseSerializer(purchase, context={'request': request}).data
            )
        
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Download Ticket",
        description="Download ticket as PDF",
        responses={200: "PDF file"}
    )
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download ticket as PDF"""
        purchase = self.get_object()
        
        if purchase.status != 'paid':
            return Response({
                'error': 'Ticket not available for download'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Here you would generate a PDF ticket
        # For now, return the purchase data
        return Response({
            'message': 'PDF generation would be implemented here',
            'purchase': PurchaseSerializer(purchase, context={'request': request}).data
        })

class TicketValidationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ticket validation at events
    """
    serializer_class = TicketValidationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TicketValidation.objects.all().select_related('purchase__ticket__event', 'validated_by')
    
    @extend_schema(
        summary="Validate QR Code",
        description="Validate a ticket QR code for event entry",
        request=QRCodeValidationSerializer,
        responses={200: TicketValidationSerializer}
    )
    @action(detail=False, methods=['post'])
    def validate_qr(self, request):
        """Validate a QR code for event entry"""
        serializer = QRCodeValidationSerializer(data=request.data)
        
        if serializer.is_valid():
            qr_code_data = serializer.validated_data['qr_code_data']
            location = serializer.validated_data.get('location', '')
            notes = serializer.validated_data.get('notes', '')
            
            try:
                # Parse QR code data
                qr_data = json.loads(qr_code_data)
                purchase_id = qr_data.get('purchase_id')
                
                if not purchase_id:
                    return Response({
                        'error': 'Invalid QR code format'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Get purchase
                purchase = get_object_or_404(Purchase, id=purchase_id)
                
                # Validate purchase
                if purchase.status != 'paid':
                    return Response({
                        'error': 'Ticket is not valid for entry',
                        'status': purchase.status
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if event is today or ongoing
                event = purchase.ticket.event
                now = timezone.now()
                
                if event.end_datetime < now:
                    return Response({
                        'error': 'Event has ended'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if event.start_datetime.date() > now.date():
                    return Response({
                        'error': 'Event has not started yet'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if already validated recently (prevent double entry)
                recent_validation = TicketValidation.objects.filter(
                    purchase=purchase,
                    validation_datetime__gte=now - timezone.timedelta(hours=1)
                ).first()
                
                if recent_validation:
                    return Response({
                        'warning': 'Ticket was already validated recently',
                        'validation': TicketValidationSerializer(recent_validation).data,
                        'purchase': PurchaseSerializer(purchase, context={'request': request}).data
                    })
                
                # Create validation record
                validation = TicketValidation.objects.create(
                    purchase=purchase,
                    validated_by=request.user,
                    location=location,
                    notes=notes
                )
                
                return Response({
                    'success': True,
                    'message': 'Ticket validated successfully',
                    'validation': TicketValidationSerializer(validation).data,
                    'purchase': PurchaseSerializer(purchase, context={'request': request}).data
                })
            
            except json.JSONDecodeError:
                return Response({
                    'error': 'Invalid QR code format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            except Exception as e:
                return Response({
                    'error': 'Validation failed',
                    'details': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AttendeeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing attendees
    """
    serializer_class = AttendeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return Attendee.objects.all().select_related('purchase__ticket__event')
        else:
            # Users can only see attendees from their own purchases
            return Attendee.objects.filter(purchase__user=user).select_related('purchase__ticket__event')
    
    @extend_schema(
        summary="Check In Attendee",
        description="Check in an attendee to the event",
        responses={200: AttendeeSerializer}
    )
    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        """Check in an attendee"""
        attendee = self.get_object()
        
        if attendee.checked_in:
            return Response({
                'message': 'Attendee is already checked in',
                'attendee': AttendeeSerializer(attendee).data
            })
        
        attendee.check_in()
        
        return Response({
            'message': 'Attendee checked in successfully',
            'attendee': AttendeeSerializer(attendee).data
        })
