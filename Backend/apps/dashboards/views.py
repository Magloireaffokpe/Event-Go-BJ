from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from datetime import timedelta
from decimal import Decimal


from apps.events.models import Event
from apps.tickets.models import Purchase, Ticket
from apps.payments.models import Payment
from apps.users.models import User
from .serializers import (
    OrganizerDashboardSerializer,
    AdminDashboardSerializer,
    EventStatsSerializer,
    UserStatsSerializer,
    RevenueStatsSerializer
)

class DashboardPermission(permissions.BasePermission):
    """
    Custom permission for dashboard endpoints
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['organizer', 'admin']

class OrganizerDashboardView(APIView):
    """
    Dashboard view for event organizers
    """
    permission_classes = [DashboardPermission]
    
    @extend_schema(
        summary="Get Organizer Dashboard",
        description="Get dashboard data for event organizers",
        responses={200: OrganizerDashboardSerializer}
    )
    def get(self, request):
        user = request.user
        
        if user.role not in ['organizer', 'admin']:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get organizer's events
        if user.role == 'admin':
            # Admin can see all events, but for organizer dashboard, show their own
            events = Event.objects.filter(organizer=user)
        else:
            events = Event.objects.filter(organizer=user)
        
        # Calculate basic stats
        total_events = events.count()
        active_events = events.filter(is_active=True).count()
        upcoming_events = events.filter(start_datetime__gt=timezone.now()).count()
        past_events = events.filter(end_datetime__lt=timezone.now()).count()
        
        # Calculate sales stats
        event_ids = events.values_list('id', flat=True)
        paid_purchases = Purchase.objects.filter(
            ticket__event_id__in=event_ids,
            status='paid'
        )
        
        total_sales = paid_purchases.aggregate(
            total_amount=Sum('total_amount'),
            total_tickets=Sum('quantity')
        )
        
        total_revenue = total_sales['total_amount'] or Decimal('0.00')
        total_tickets_sold = total_sales['total_tickets'] or 0
        
        # Calculate attendee stats
        total_attendees = paid_purchases.aggregate(
            total=Sum('quantity')
        )['total'] or 0
        
        # Get recent events with stats
        recent_events = []
        for event in events.order_by('-created_at')[:5]:
            event_purchases = Purchase.objects.filter(
                ticket__event=event,
                status='paid'
            )
            
            event_revenue = event_purchases.aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            event_attendees = event_purchases.aggregate(
                total=Sum('quantity')
            )['total'] or 0
            
            recent_events.append({
                'id': event.id,
                'title': event.title,
                'start_datetime': event.start_datetime,
                'location': event.location,
                'revenue': float(event_revenue),
                'attendees': event_attendees,
                'max_attendees': event.max_attendees,
                'status': 'upcoming' if event.is_upcoming else 'ongoing' if event.is_ongoing else 'past'
            })
        
        # Calculate monthly revenue for the last 6 months
        monthly_revenue = []
        for i in range(6):
            month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30*i)
            month_end = month_start.replace(day=28) + timedelta(days=4)
            month_end = month_end - timedelta(days=month_end.day)
            
            month_purchases = paid_purchases.filter(
                created_at__range=[month_start, month_end]
            )
            




            revenue = month_purchases.aggregate(total_revenue=Sum('total_amount'))['total_revenue'] or Decimal('0.00')
            ticket_count = month_purchases.aggregate(total_quantity=Sum('quantity'))['total_quantity'] or 0
            
   

            monthly_revenue.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': float(revenue),
                'tickets_sold': ticket_count
            })
        
        monthly_revenue.reverse()  # Show oldest to newest
        
        # Top performing events
        top_events = []
        for event in events.annotate(
            revenue=Sum('tickets__purchases__total_amount', filter=Q(tickets__purchases__status='paid'))
        ).order_by('-revenue')[:5]:
            top_events.append({
                'id': event.id,
                'title': event.title,
                'revenue': float(event.revenue or 0),
                'attendees': event.total_tickets_sold
            })
        
        dashboard_data = {
            'total_events': total_events,
            'active_events': active_events,
            'upcoming_events': upcoming_events,
            'past_events': past_events,
            'total_revenue': float(total_revenue),
            'total_tickets_sold': total_tickets_sold,
            'total_attendees': total_attendees,
            'recent_events': recent_events,
            'monthly_revenue': monthly_revenue,
            'top_events': top_events
        }
        
        serializer = OrganizerDashboardSerializer(dashboard_data)
        return Response(serializer.data)

class AdminDashboardView(APIView):
    """
    Dashboard view for administrators
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """Only admins can access this dashboard"""
        if self.request.user.is_authenticated and self.request.user.role == 'admin':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]
    
    @extend_schema(
        summary="Get Admin Dashboard",
        description="Get dashboard data for administrators",
        responses={200: AdminDashboardSerializer}
    )
    def get(self, request):
        # User statistics
        total_users = User.objects.count()
        new_users_this_month = User.objects.filter(
            date_joined__gte=timezone.now().replace(day=1)
        ).count()
        
        users_by_role = dict(
            User.objects.values('role').annotate(count=Count('id')).values_list('role', 'count')
        )
        
        # Event statistics
        total_events = Event.objects.count()
        active_events = Event.objects.filter(is_active=True).count()
        events_this_month = Event.objects.filter(
            created_at__gte=timezone.now().replace(day=1)
        ).count()
        
        # Sales statistics
        paid_purchases = Purchase.objects.filter(status='paid')
        total_sales = paid_purchases.aggregate(
            total_amount=Sum('total_amount'),
            total_tickets=Sum('quantity')
        )
        
        total_revenue = total_sales['total_amount'] or Decimal('0.00')
        total_tickets_sold = total_sales['total_tickets'] or 0
        
        # Payment statistics
        total_payments = Payment.objects.count()
        successful_payments = Payment.objects.filter(status='success').count()
        payment_success_rate = (successful_payments / total_payments * 100) if total_payments > 0 else 0
        
        payments_by_method = dict(
            Payment.objects.values('method').annotate(count=Count('id')).values_list('method', 'count')
        )
        
        # Monthly statistics for the last 12 months
        monthly_stats = []
        for i in range(12):
            month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30*i)
            month_end = month_start.replace(day=28) + timedelta(days=4)
            month_end = month_end - timedelta(days=month_end.day)
            
            # Users registered this month
            month_users = User.objects.filter(
                date_joined__range=[month_start, month_end]
            ).count()
            
            # Events created this month
            month_events = Event.objects.filter(
                created_at__range=[month_start, month_end]
            ).count()
            
            # Revenue this month
            month_revenue = paid_purchases.filter(
                created_at__range=[month_start, month_end]
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0.00')
            
            # Tickets sold this month
            month_tickets = paid_purchases.filter(
                created_at__range=[month_start, month_end]
            ).aggregate(Sum('quantity'))['quantity__sum'] or 0
            
            monthly_stats.append({
                'month': month_start.strftime('%Y-%m'),
                'users': month_users,
                'events': month_events,
                'revenue': float(month_revenue),
                'tickets_sold': month_tickets
            })
        
        monthly_stats.reverse()  # Show oldest to newest
        
        # Top events by revenue
        top_events = Event.objects.annotate(
            revenue=Sum('tickets__purchases__total_amount', filter=Q(tickets__purchases__status='paid')),
            tickets_sold=Sum('tickets__purchases__quantity', filter=Q(tickets__purchases__status='paid'))
        ).order_by('-revenue')[:10]
        
        top_events_data = []
        for event in top_events:
            if event.revenue:  # Only include events with sales
                top_events_data.append({
                    'id': event.id,
                    'title': event.title,
                    'organizer': event.organizer.full_name,
                    'revenue': float(event.revenue),
                    'tickets_sold': event.tickets_sold or 0,
                    'start_date': event.start_datetime.date()
                })
        
        # Top organizers by revenue
        from django.db.models import F
        top_organizers = User.objects.filter(role='organizer').annotate(
            revenue=Sum('organized_events__tickets__purchases__total_amount', 
                       filter=Q(organized_events__tickets__purchases__status='paid')),
            events_count=Count('organized_events', filter=Q(organized_events__is_active=True))
        ).filter(revenue__isnull=False).order_by('-revenue')[:10]
        
        top_organizers_data = []
        for organizer in top_organizers:
            top_organizers_data.append({
                'id': organizer.id,
                'name': organizer.full_name,
                'email': organizer.email,
                'events_count': organizer.events_count,
                'revenue': float(organizer.revenue)
            })
        
        # Recent activity
        recent_users = User.objects.order_by('-date_joined')[:5]
        recent_events = Event.objects.order_by('-created_at')[:5]
        recent_purchases = Purchase.objects.filter(status='paid').order_by('-created_at')[:5]
        
        dashboard_data = {
            'user_stats': {
                'total_users': total_users,
                'new_users_this_month': new_users_this_month,
                'users_by_role': users_by_role
            },
            'event_stats': {
                'total_events': total_events,
                'active_events': active_events,
                'events_this_month': events_this_month
            },
            'revenue_stats': {
                'total_revenue': float(total_revenue),
                'total_tickets_sold': total_tickets_sold,
                'total_payments': total_payments,
                'payment_success_rate': payment_success_rate,
                'payments_by_method': payments_by_method
            },
            'monthly_stats': monthly_stats,
            'top_events': top_events_data,
            'top_organizers': top_organizers_data,
            'recent_activity': {
                'recent_users': [{'id': u.id, 'name': u.full_name, 'email': u.email, 'date_joined': u.date_joined} for u in recent_users],
                'recent_events': [{'id': e.id, 'title': e.title, 'organizer': e.organizer.full_name, 'created_at': e.created_at} for e in recent_events],
                'recent_purchases': [{'id': p.id, 'reference': p.purchase_reference, 'amount': float(p.total_amount), 'user': p.user.full_name, 'created_at': p.created_at} for p in recent_purchases]
            }
        }
        
        serializer = AdminDashboardSerializer(dashboard_data)
        return Response(serializer.data)

class EventStatsView(APIView):
    """
    Detailed statistics for a specific event
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Get Event Statistics",
        description="Get detailed statistics for a specific event",
        responses={200: EventStatsSerializer}
    )
    def get(self, request, event_id):
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({
                'error': 'Event not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check permission
        if request.user.role not in ['admin'] and event.organizer != request.user:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get event tickets and purchases
        tickets = Ticket.objects.filter(event=event)
        purchases = Purchase.objects.filter(ticket__event=event, status='paid')
        
        # Basic stats
        total_revenue = purchases.aggregate(Sum('total_amount'))['total_amount'] or Decimal('0.00')
        total_tickets_sold = purchases.aggregate(Sum('quantity'))['quantity'] or 0
        total_tickets_available = tickets.aggregate(Sum('quantity_available'))['quantity_available'] or 0
        
        # Sales by ticket type
        sales_by_ticket = []
        for ticket in tickets:
            ticket_purchases = purchases.filter(ticket=ticket)
            ticket_revenue = ticket_purchases.aggregate(Sum('total_amount'))['total_amount'] or Decimal('0.00')
            ticket_sold = ticket_purchases.aggregate(Sum('quantity'))['quantity'] or 0
            
            sales_by_ticket.append({
                'ticket_name': ticket.name,
                'price': float(ticket.price),
                'available': ticket.quantity_available,
                'sold': ticket_sold,
                'revenue': float(ticket_revenue),
                'sold_percentage': (ticket_sold / ticket.quantity_available * 100) if ticket.quantity_available > 0 else 0
            })
        
        # Daily sales (last 30 days)
        daily_sales = []
        for i in range(30):
            day = timezone.now().date() - timedelta(days=i)
            day_start = timezone.datetime.combine(day, timezone.datetime.min.time())
            day_end = timezone.datetime.combine(day, timezone.datetime.max.time())
            
            day_purchases = purchases.filter(created_at__range=[day_start, day_end])
            day_revenue = day_purchases.aggregate(Sum('total_amount'))['total_amount'] or Decimal('0.00')
            day_tickets = day_purchases.aggregate(Sum('quantity'))['quantity'] or 0
            
            daily_sales.append({
                'date': day.isoformat(),
                'revenue': float(day_revenue),
                'tickets_sold': day_tickets
            })
        
        daily_sales.reverse()  # Show oldest to newest
        
        # Payment methods
        payment_methods = dict(
            purchases.values('payment_method').annotate(count=Count('id')).values_list('payment_method', 'count')
        )
        
        stats_data = {
            'event': {
                'id': event.id,
                'title': event.title,
                'start_datetime': event.start_datetime,
                'max_attendees': event.max_attendees
            },
            'total_revenue': float(total_revenue),
            'total_tickets_sold': total_tickets_sold,
            'total_tickets_available': total_tickets_available,
            'attendance_rate': (total_tickets_sold / event.max_attendees * 100) if event.max_attendees > 0 else 0,
            'sales_by_ticket': sales_by_ticket,
            'daily_sales': daily_sales,
            'payment_methods': payment_methods
        }
        
        serializer = EventStatsSerializer(stats_data)
        return Response(serializer.data)
