from django.urls import path

from .views import OrganizerDashboardView, AdminDashboardView, EventStatsView

urlpatterns = [
    path('organizer/', OrganizerDashboardView.as_view(), name='organizer-dashboard'),
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('events/<int:event_id>/stats/', EventStatsView.as_view(), name='event-stats'),
]
