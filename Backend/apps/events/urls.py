# apps/events/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from . import views

# Router principal pour les événements
router = DefaultRouter()
router.register(r'events', views.EventViewSet, basename='event')

# Router imbriqué pour les tickets d'un événement
events_router = routers.NestedDefaultRouter(router, r'events', lookup='event')
events_router.register(r'tickets', views.TicketViewSet, basename='event-tickets')

# Router pour les reviews d'événements (si vous en avez besoin)
events_router.register(r'reviews', views.EventReviewViewSet, basename='event-reviews')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(events_router.urls)),
]