from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import timedelta

from .models import Event, EventReview

User = get_user_model()

class EventModelTest(TestCase):
    """
    Test cases for Event model
    """
    
    def setUp(self):
        self.organizer = User.objects.create_user(
            email='organizer@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='Organizer',
            role='organizer'
        )
        
        self.event_data = {
            'title': 'Test Event',
            'description': 'Test event description',
            'start_datetime': timezone.now() + timedelta(days=7),
            'end_datetime': timezone.now() + timedelta(days=7, hours=3),
            'location': 'Cotonou',
            'category': 'music',
            'max_attendees': 100,
            'organizer': self.organizer
        }
    
    def test_create_event(self):
        """Test creating an event"""
        event = Event.objects.create(**self.event_data)
        
        self.assertEqual(event.title, self.event_data['title'])
        self.assertEqual(event.organizer, self.organizer)
        self.assertTrue(event.is_active)
        self.assertTrue(event.is_upcoming)
        self.assertFalse(event.is_ongoing)
        self.assertFalse(event.is_past)
    
    def test_event_string_representation(self):
        """Test event string representation"""
        event = Event.objects.create(**self.event_data)
        expected_str = f"{event.title} - {event.start_datetime.strftime('%Y-%m-%d %H:%M')}"
        self.assertEqual(str(event), expected_str)
    
    def test_event_status_properties(self):
        """Test event status properties"""
        # Upcoming event
        upcoming_event = Event.objects.create(**self.event_data)
        self.assertTrue(upcoming_event.is_upcoming)
        self.assertFalse(upcoming_event.is_ongoing)
        self.assertFalse(upcoming_event.is_past)
        
        # Ongoing event
        ongoing_data = self.event_data.copy()
        ongoing_data['start_datetime'] = timezone.now() - timedelta(hours=1)
        ongoing_data['end_datetime'] = timezone.now() + timedelta(hours=2)
        ongoing_event = Event.objects.create(**ongoing_data)
        
        self.assertFalse(ongoing_event.is_upcoming)
        self.assertTrue(ongoing_event.is_ongoing)
        self.assertFalse(ongoing_event.is_past)
        
        # Past event
        past_data = self.event_data.copy()
        past_data['start_datetime'] = timezone.now() - timedelta(days=2)
        past_data['end_datetime'] = timezone.now() - timedelta(days=2, hours=-3)
        past_event = Event.objects.create(**past_data)
        
        self.assertFalse(past_event.is_upcoming)
        self.assertFalse(past_event.is_ongoing)
        self.assertTrue(past_event.is_past)
    
    def test_available_spots_property(self):
        """Test available spots calculation"""
        event = Event.objects.create(**self.event_data)
        
        # Initially all spots should be available
        self.assertEqual(event.available_spots, event.max_attendees)
        self.assertTrue(event.tickets_available)

class EventAPITest(APITestCase):
    """
    Test cases for Event API endpoints
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
        
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            role='admin'
        )
        
        self.event_data = {
            'title': 'Test Event',
            'description': 'Test event description',
            'start_datetime': (timezone.now() + timedelta(days=7)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(days=7, hours=3)).isoformat(),
            'location': 'Cotonou',
            'category': 'music',
            'max_attendees': 100
        }
        
        self.event = Event.objects.create(
            title='Existing Event',
            description='Existing event description',
            start_datetime=timezone.now() + timedelta(days=14),
            end_datetime=timezone.now() + timedelta(days=14, hours=3),
            location='Porto-Novo',
            category='conference',
            max_attendees=50,
            organizer=self.organizer
        )
    
    def test_list_events_unauthenticated(self):
        """Test listing events without authentication"""
        url = reverse('event-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_create_event_as_organizer(self):
        """Test creating event as organizer"""
        self.client.force_authenticate(user=self.organizer)
        url = reverse('event-list')
        response = self.client.post(url, self.event_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], self.event_data['title'])
        self.assertEqual(response.data['organizer']['id'], self.organizer.id)
    
    def test_create_event_as_participant(self):
        """Test creating event as participant (should fail)"""
        self.client.force_authenticate(user=self.participant)
        url = reverse('event-list')
        response = self.client.post(url, self.event_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_create_event_as_admin(self):
        """Test creating event as admin"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('event-list')
        response = self.client.post(url, self.event_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_update_event_as_organizer(self):
        """Test updating own event as organizer"""
        self.client.force_authenticate(user=self.organizer)
        url = reverse('event-detail', kwargs={'pk': self.event.id})
        
        update_data = {
            'title': 'Updated Event Title',
            'max_attendees': 75
        }
        
        response = self.client.patch(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], update_data['title'])
        self.assertEqual(response.data['max_attendees'], update_data['max_attendees'])
    
    def test_update_other_organizer_event(self):
        """Test updating another organizer's event (should fail)"""
        other_organizer = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            first_name='Other',
            last_name='Organizer',
            role='organizer'
        )
        
        self.client.force_authenticate(user=other_organizer)
        url = reverse('event-detail', kwargs={'pk': self.event.id})
        
        update_data = {'title': 'Hacked Title'}
        response = self.client.patch(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_event_as_organizer(self):
        """Test deleting own event as organizer"""
        self.client.force_authenticate(user=self.organizer)
        url = reverse('event-detail', kwargs={'pk': self.event.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Event should be soft deleted (is_active = False)
        self.event.refresh_from_db()
        self.assertFalse(self.event.is_active)
    
    def test_search_events(self):
        """Test searching events"""
        url = reverse('event-list')
        response = self.client.get(url, {'search': 'Existing'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        
        # Check if the searched event is in results
        event_titles = [event['title'] for event in response.data['results']]
        self.assertIn('Existing Event', event_titles)
    
    def test_filter_events_by_category(self):
        """Test filtering events by category"""
        url = reverse('event-list')
        response = self.client.get(url, {'category': 'conference'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # All returned events should be conference category
        for event in response.data['results']:
            self.assertEqual(event['category'], 'conference')
    
    def test_get_event_details(self):
        """Test getting event details"""
        url = reverse('event-detail', kwargs={'pk': self.event.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.event.id)
        self.assertEqual(response.data['title'], self.event.title)
    
    def test_event_stats_as_organizer(self):
        """Test getting event stats as organizer"""
        self.client.force_authenticate(user=self.organizer)
        url = reverse('event-stats', kwargs={'pk': self.event.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_tickets_sold', response.data)
        self.assertIn('total_revenue', response.data)
        self.assertIn('available_spots', response.data)
    
    def test_event_stats_as_participant(self):
        """Test getting event stats as participant (should fail)"""
        self.client.force_authenticate(user=self.participant)
        url = reverse('event-stats', kwargs={'pk': self.event.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
