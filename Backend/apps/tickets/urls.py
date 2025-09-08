# apps/tickets/urls.py

from rest_framework.routers import DefaultRouter
from django.urls import path, include

from .views import TicketViewSet, PurchaseViewSet, TicketValidationViewSet, AttendeeViewSet

# Créez une instance de routeur
router = DefaultRouter()

# Enregistrez vos ViewSets avec le routeur
router.register(r'tickets', TicketViewSet, basename='tickets')
router.register(r'purchases', PurchaseViewSet, basename='purchases')
router.register(r'attendees', AttendeeViewSet, basename='attendees')
router.register(r'validations', TicketValidationViewSet, basename='validations')

# Note : Les URLs générées par ce routeur commenceront par /api/tickets/ grâce à l'inclusion dans le fichier eventgo/urls.py
# Exemple : L'URL pour la liste des achats sera /api/tickets/purchases/

urlpatterns = [
    # Incluez les URLs générées par le routeur
    path('', include(router.urls)),
]