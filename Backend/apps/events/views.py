from rest_framework import generics, status, permissions, filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from apps.tickets.models import Ticket
from django.shortcuts import get_object_or_404





from .serializers import TicketSerializer
from .models import Event, EventReview
from .serializers import (
    EventSerializer,
    EventListSerializer, 
    EventCreateUpdateSerializer,
    EventReviewSerializer
)

class EventPermission(permissions.BasePermission):
    """
    Custom permission for events:
    - Anyone can read events
    - Only organizers can create events
    - Only event organizers can update/delete their own events
    - Admins can do everything
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if not request.user.is_authenticated:
            return False
        
        if request.method == 'POST':
            return request.user.role in ['organizer', 'admin']
        
        return True
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if request.user.role == 'admin':
            return True
        
        return obj.organizer == request.user

class EventFilter(filters.BaseFilterBackend):
    """
    Custom filter for events
    """
    
    def filter_queryset(self, request, queryset, view):
        # Filter by search query (title, description, location)
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(location__icontains=search)
            )
        
        # Filter by category
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by location
        location = request.query_params.get('location')
        if location:
            queryset = queryset.filter(location__icontains=location)
        
        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            try:
                start_datetime = timezone.datetime.fromisoformat(start_date)
                queryset = queryset.filter(start_datetime__gte=start_datetime)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_datetime = timezone.datetime.fromisoformat(end_date)
                queryset = queryset.filter(end_datetime__lte=end_datetime)
            except ValueError:
                pass
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter == 'upcoming':
            queryset = queryset.filter(start_datetime__gt=timezone.now())
        elif status_filter == 'ongoing':
            now = timezone.now()
            queryset = queryset.filter(
                start_datetime__lte=now,
                end_datetime__gte=now
            )
        elif status_filter == 'past':
            queryset = queryset.filter(end_datetime__lt=timezone.now())
        
        # Filter by featured events
        featured = request.query_params.get('featured')
        if featured and featured.lower() == 'true':
            queryset = queryset.filter(is_featured=True)
        
        return queryset

class EventViewSet(ModelViewSet):
    """
    ViewSet for managing events
    """
    queryset = Event.objects.filter(is_active=True).select_related('organizer').prefetch_related('images', 'reviews')
    permission_classes = [EventPermission]
    filter_backends = [EventFilter, DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['category', 'is_featured']
    ordering_fields = ['start_datetime', 'created_at', 'title']
    ordering = ['-created_at']

    
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EventListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EventCreateUpdateSerializer
        return EventSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Organizers see only their own events when creating/updating
        if self.action in ['update', 'partial_update', 'destroy']:
            if self.request.user.role == 'organizer':
                queryset = queryset.filter(organizer=self.request.user)
        
        return queryset
    
    @extend_schema(
        summary="List Events",
        description="Get list of events with filtering and search",
        parameters=[
            OpenApiParameter(name='search', description='Search in title, description, location'),
            OpenApiParameter(name='category', description='Filter by category'),
            OpenApiParameter(name='location', description='Filter by location'),
            OpenApiParameter(name='start_date', description='Filter events starting from this date'),
            OpenApiParameter(name='end_date', description='Filter events ending before this date'),
            OpenApiParameter(name='status', description='Filter by status: upcoming, ongoing, past'),
            OpenApiParameter(name='featured', description='Filter featured events'),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Create Event",
        description="Create a new event (organizers and admins only)",
        request=EventCreateUpdateSerializer,
        responses={201: EventSerializer}
    )
    def create(self, request, *args, **kwargs):
        # Valider la requête avec EventCreateUpdateSerializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Sauvegarder l'événement
        self.perform_create(serializer)
        # Créer une instance de EventSerializer pour la réponse
        instance = serializer.instance
        response_serializer = EventSerializer(instance, context={'request': request})
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @extend_schema(
        summary="Get Event Details",
        description="Get detailed information about a specific event",
        responses={200: EventSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update Event",
        description="Update event details (event organizer or admin only)",
        request=EventCreateUpdateSerializer,
        responses={200: EventSerializer}
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @extend_schema(
        summary="Partially Update Event",
        description="Partially update event details (event organizer or admin only)",
        request=EventCreateUpdateSerializer,
        responses={200: EventSerializer}
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @extend_schema(
        summary="Delete Event",
        description="Delete an event (event organizer or admin only)",
        responses={204: OpenApiResponse(description="Event deleted successfully")}
    )
    def destroy(self, request, *args, **kwargs):
        event = self.get_object()
        
        # Check if event has sold tickets
        if event.total_tickets_sold > 0:
            return Response({
                'error': 'Cannot delete event with sold tickets'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Soft delete by setting is_active to False
        event.is_active = False
        event.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @extend_schema(
        summary="Get Event Tickets",
        description="Get available tickets for an event",
        responses={200: TicketSerializer(many=True)}
    )
    #@action(detail=True, methods=['get'])
    #def tickets(self, request, pk=None):
        #"""Get tickets for this event"""
        #event = self.get_object()
        #tickets = Ticket.objects.filter(event=event, is_active=True)
        
        #from apps.tickets.serializers import TicketSerializer
        #serializer = TicketSerializer(tickets, many=True, context={'request': request})
        #return Response(serializer.data)
    
    @extend_schema(
        summary="Get Event Stats",
        description="Get event statistics (event organizer or admin only)",
        responses={200: "Event statistics"}
    )
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request, pk=None):
        """Get event statistics"""
        event = self.get_object()
        
        # Check permission
        if request.user.role not in ['admin'] and event.organizer != request.user:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        stats = {
            'total_tickets_sold': event.total_tickets_sold,
            'total_revenue': float(event.total_revenue),
            'available_spots': event.available_spots,
            'attendance_rate': (event.total_tickets_sold / event.max_attendees * 100) if event.max_attendees > 0 else 0,
            'tickets_by_type': []
        }
        
        # Get ticket sales by type
        tickets = Ticket.objects.filter(event=event)
        for ticket in tickets:
            ticket_stats = {
                'ticket_name': ticket.name,
                'price': float(ticket.price),
                'quantity_sold': ticket.quantity_sold,
                'quantity_available': ticket.quantity_available,
                'revenue': float(ticket.quantity_sold * ticket.price)
            }
            stats['tickets_by_type'].append(ticket_stats)
        
        return Response(stats)

class EventReviewViewSet(ModelViewSet):
    """
    ViewSet for managing event reviews
    """
    serializer_class = EventReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        event_id = self.kwargs.get('event_pk')
        return EventReview.objects.filter(event_id=event_id).select_related('user', 'event')
    
    def perform_create(self, serializer):
        event_id = self.kwargs.get('event_pk')
        event = Event.objects.get(id=event_id)
        serializer.save(user=self.request.user, event=event)
    
    def create(self, request, *args, **kwargs):
        event_id = self.kwargs.get('event_pk')
        
        # Check if user has already reviewed this event
        if EventReview.objects.filter(event_id=event_id, user=request.user).exists():
            return Response({
                'error': 'You have already reviewed this event'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if event exists and has ended
        try:
            event = Event.objects.get(id=event_id)
            if not event.is_past:
                return Response({
                    'error': 'You can only review events that have ended'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Event.DoesNotExist:
            return Response({
                'error': 'Event not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return super().create(request, *args, **kwargs)


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_serializer_class(self):
        """Utiliser le bon serializer selon l'action"""
        if self.action in ['create', 'update', 'partial_update']:
            # Importer le bon serializer pour la création/modification
            from apps.tickets.serializers import TicketCreateUpdateSerializer
            return TicketCreateUpdateSerializer
        else:
            # Utiliser le serializer de lecture pour GET
            from apps.tickets.serializers import TicketSerializer
            return TicketSerializer

    def get_queryset(self):
        """
        Retourne tous les tickets associés à l'événement passé dans l'URL.
        """
        event_id = self.kwargs.get("event_pk")
        return Ticket.objects.filter(event_id=event_id)

    def perform_create(self, serializer):
        """
        Crée un ticket et l'associe à l'événement parent.
        """
        event_id = self.kwargs.get("event_pk")
        event = get_object_or_404(Event, pk=event_id)
        
        # Vérification de permission
        if event.organizer != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous n'êtes pas autorisé à créer des tickets pour cet événement.")
        
        serializer.save(event=event)

    def create(self, request, *args, **kwargs):
        """
        POST /api/events/<event_pk>/tickets/
        Avec debug pour identifier le problème
        """
        print(f"=== DEBUG CREATE TICKET ===")
        print(f"Data received: {request.data}")
        print(f"Event PK: {self.kwargs.get('event_pk')}")
        print(f"User: {request.user}")
        print(f"User role: {getattr(request.user, 'role', 'N/A')}")
        
        event_id = self.kwargs.get("event_pk")
        try:
            event = get_object_or_404(Event, pk=event_id)
            print(f"Event found: {event.title}")
            print(f"Event organizer: {event.organizer}")
            print(f"Current user: {request.user}")
            
            # Vérifier permission
            if event.organizer != request.user:
                print("Permission denied - user is not organizer")
                return Response(
                    {"detail": "Vous n'êtes pas autorisé à créer des tickets pour cet événement."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Créer le serializer avec le bon serializer
            serializer = self.get_serializer(data=request.data)
            print(f"Serializer class used: {type(serializer).__name__}")
            print(f"Serializer data: {request.data}")
            
            if serializer.is_valid():
                print("Serializer is valid, saving...")
                serializer.save(event=event)
                print(f"Ticket created successfully: {serializer.data}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                print(f"Serializer validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"Exception occurred: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": f"Erreur: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

