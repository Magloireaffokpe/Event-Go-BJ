from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import PaymentViewSet, RefundRequestViewSet, PaymentWebhookView

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'refunds', RefundRequestViewSet, basename='refund')
router.register(r'webhooks', PaymentWebhookView, basename='webhook')

urlpatterns = [
    path('', include(router.urls)),
]
