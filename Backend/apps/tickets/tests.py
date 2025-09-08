from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import timedelta
from decimal import Decimal

from .models import Ticket, Purchase, Attendee
from apps.events.models import Event

User = get_user_model()

class TicketModelTest(TestCase):
    """
    Test cases for Ticket model
    """
    
    def setUp(self):
        self.organizer = User.objects.create_user(
            email='organizer@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='Organizer',
            role='organizer'
        )
        
        self.event = Event.objects.create(
            title='Test Event',
            description='Test event description',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
            location='Cotonou',
            category='music',
            max_attendees=100,
            organizer=self.organizer
        )
        
        self.ticket_data = {
            'name': 'Regular Ticket',
            'description': 'Regular admission ticket',
            'price': Decimal('25.00'),
            'quantity_available': 50,
            'event': self.event
        }
    
    def test_create_ticket(self):
        """Test creating a ticket"""
        ticket = Ticket.objects.create(**self.ticket_data)
        
        self.assertEqual(ticket.name, self.ticket_data['name'])
        self.assertEqual(ticket.price, self.ticket_data['price'])
        self.assertEqual(ticket.quantity_available, self.ticket_data['quantity_available'])
        self.assertEqual(ticket.quantity_sold, 0)
        self.assertEqual(ticket.quantity_remaining, 50)
        self.assertFalse(ticket.is_sold_out)
        self.assertTrue(ticket.is_available_for_sale)
    
    def test_ticket_properties(self):
        """Test ticket properties"""
        ticket = Ticket.objects.create(**self.ticket_data)
        
        # Test can_purchase
        self.assertTrue(ticket.can_purchase(1))
        self.assertTrue(ticket.can_purchase(25))
        self.assertTrue(ticket.can_purchase(50))
        self.assertFalse(ticket.can_purchase(51))  # More than available
        self.assertFalse(ticket.can_purchase(0))   # Zero quantity
        
        # Test after some sales
        ticket.quantity_sold = 30
        ticket.save()
        
        self.assertEqual(ticket.quantity_remaining, 20)
        self.assertTrue(ticket.can_purchase(20))
        self.assertFalse(ticket.can_purchase(21))
    
    def test_ticket_sold_out(self):
        """Test ticket sold out scenario"""
        ticket = Ticket.objects.create(**self.ticket_data)
        ticket.quantity_sold = ticket.quantity_available
        ticket.save()
        
        self.assertTrue(ticket.is_sold_out)
        self.assertEqual(ticket.quantity_remaining, 0)
        self.assertFalse(ticket.can_purchase(1))
    
    def test_ticket_string_representation(self):
        """Test ticket string representation"""
        ticket = Ticket.objects.create(**self.ticket_data)
        expected_str = f"{ticket.name} - {ticket.event.title}"
        self.assertEqual(str(ticket), expected_str)

class PurchaseModelTest(TestCase):
    """
    Test cases for Purchase model
    """
    
    def setUp(self):
        self.participant = User.objects.create_user(
            email='participant@example.com',
            password='testpass123',
            first_name='John',
            last_name='Participant',
            role='participant'
        )
        
        self.organizer = User.objects.create_user(
            email='organizer@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='Organizer',
            role='organizer'
        )
        
        self.event = Event.objects.create(
            title='Test Event',
            description='Test event description',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
            location='Cotonou',
            category='music',
            max_attendees=100,
            organizer=self.organizer
        )
        
        self.ticket = Ticket.objects.create(
            name='Regular Ticket',
            price=Decimal('25.00'),
            quantity_available=50,
            event=self.event
        )
    
    def test_create_purchase(self):
        """Test creating a purchase"""
        purchase = Purchase.objects.create(
            ticket=self.ticket,
            user=self.participant,
            quantity=2,
            unit_price=self.ticket.price,
            payment_method='mobile_money'
        )
        
        self.assertEqual(purchase.quantity, 2)
        self.assertEqual(purchase.unit_price, self.ticket.price)
        self.assertEqual(purchase.total_amount, Decimal('50.00'))
        self.assertEqual(purchase.status, 'pending')
        self.assertTrue(purchase.purchase_reference.startswith('EVT-'))
        self.assertTrue(purchase.can_be_cancelled)
    
    def test_purchase_reference_generation(self):
        """Test purchase reference generation"""
        purchase1 = Purchase.objects.create(
            ticket=self.ticket,
            user=self.participant,
            quantity=1,
            unit_price=self.ticket.price
        )
        
        purchase2 = Purchase.objects.create(
            ticket=self.ticket,
            user=self.participant,
            quantity=1,
            unit_price=self.ticket.price
        )
        
        self.assertNotEqual(purchase1.purchase_reference, purchase2.purchase_reference)
        self.assertTrue(purchase1.purchase_reference.startswith('EVT-'))
        self.assertTrue(purchase2.purchase_reference.startswith('EVT-'))
    
    def test_purchase_cancellation(self):
        """Test purchase cancellation"""
        purchase = Purchase.objects.create(
            ticket=self.ticket,
            user=self.participant,
            quantity=1,
            unit_price=self.ticket.price
        )
        
        # Should be cancellable initially
        self.assertTrue(purchase.can_be_cancelled)
        
        # Cancel the purchase
        purchase.cancel()
        self.assertEqual(purchase.status, 'cancelled')
        
        # Should not be cancellable after cancellation
        self.assertFalse(purchase.can_be_cancelled)
    
    def test_qr_code_generation(self):
        """Test QR code generation when paid"""
        purchase = Purchase.objects.create(
            ticket=self.ticket,
            user=self.participant,
            quantity=1,
            unit_price=self.ticket.price,
            status='paid'
        )
        
        # QR code should be generated
        self.assertTrue(purchase.qr_code)
        self.assertTrue(purchase.qr_code_data)
        
        # Parse QR code data
        import json
        qr_data = json.loads(purchase.qr_code_data)
        self.assertEqual(qr_data['purchase_id'], str(purchase.id))
        self.assertEqual(qr_data['reference'], purchase.purchase_reference)

class TicketAPITest(APITestCase):
    """
    Test cases for Ticket API endpoints
    """
    
    def setUp(self):
        self.participant = User.objects.create_user(
            email='participant@example.com',
            password='testpass123',
            first_name='John',
            last_name='Participant',
            role='participant'
        )
        
        self.organizer = User.objects.create_user(
            email='organizer@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='Organizer',
            role='organizer'
        )
        
        self.event = Event.objects.create(
            title='Test Event',
            description='Test event description',
            start_datetime=timezone.now() + timedelta(days=7),
            end_datetime=timezone.now() + timedelta(days=7, hours=3),
            location='Cotonou',
            category='music',
            max_attendees=100,
            organizer=self.organizer
        )
        
        self.ticket = Ticket.objects.create(
            name='Regular Ticket',
            price=Decimal('25.00'),
            quantity_available=50,
            event=self.event
        )
        
        self.ticket_data = {
            'name': 'VIP Ticket',
            'description': 'VIP admission ticket',
            'price': '75.00',
            'quantity_available': 20
        }
        
        self.purchase_data = {
            'quantity': 2,
            'payment_method': 'mobile_money',
            'phone': '+22912345678'
        }
    
    def test_list_event_tickets_unauthenticated(self):
        """Test listing event tickets without authentication"""
        url = reverse('event-tickets-list', kwargs={'event_pk': self.event.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_create_ticket_as_organizer(self):
        """Test creating ticket as event organizer"""
        self.client.force_authenticate(user=self.organizer)
        url = reverse('event-tickets-list', kwargs={'event_pk': self.event.id})
        response = self.client.post(url, self.ticket_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], self.ticket_data['name'])
    
    def test_create_ticket_as_participant(self):
        """Test creating ticket as participant (should fail)"""
        self.client.force_authenticate(user=self.participant)
        url = reverse('event-tickets-list', kwargs={'event_pk': self.event.id})
        response = self.client.post(url, self.ticket_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_purchase_ticket_success(self):
        """Test successful ticket purchase"""
        self.client.force_authenticate(user=self.participant)
        url = reverse('event-tickets-purchase', kwargs={'event_pk': self.event.id, 'pk': self.ticket.id})
        response = self.client.post(url, self.purchase_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('purchase_reference', response.data)
        self.assertEqual(response.data['quantity'], self.purchase_data['quantity'])
    
    def test_purchase_ticket_insufficient_quantity(self):
        """Test ticket purchase with insufficient quantity"""
        self.client.force_authenticate(user=self.participant)
        url = reverse('event-tickets-purchase', kwargs={'event_pk': self.event.id, 'pk': self.ticket.id})
        
        # Try to purchase more than available
        invalid_data = self.purchase_data.copy()
        invalid_data['quantity'] = 100
        
        response = self.client.post(url, invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_purchase_ticket_unauthenticated(self):
        """Test ticket purchase without authentication"""
        url = reverse('event-tickets-purchase', kwargs={'event_pk': self.event.id, 'pk': self.ticket.id})
        response = self.client.post(url, self.purchase_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_user_purchases(self):
        """Test listing user purchases"""
        # Create a purchase first
        purchase = Purchase.objects.create(
            ticket=self.ticket,
            user=self.participant,
            quantity=1,
            unit_price=self.ticket.price,
            status='paid'
        )
        
        self.client.force_authenticate(user=self.participant)
        url = reverse('purchase-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_cancel_purchase(self):
        """Test cancelling a purchase"""
        purchase = Purchase.objects.create(
            ticket=self.ticket,
            user=self.participant,
            quantity=1,
            unit_price=self.ticket.price
        )
        
        self.client.force_authenticate(user=self.participant)
        url = reverse('purchase-cancel', kwargs={'pk': purchase.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if purchase was cancelled
        purchase.refresh_from_db()
        self.assertEqual(purchase.status, 'cancelled')
