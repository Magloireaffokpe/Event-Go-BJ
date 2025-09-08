from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

class UserModelTest(TestCase):
    """
    Test cases for User model
    """
    
    def setUp(self):
        self.user_data = {
            'email': 'test@example.com',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone': '+22912345678',
            'role': 'participant'
        }
    
    def test_create_user(self):
        """Test creating a user"""
        user = User.objects.create_user(
            email=self.user_data['email'],
            password='testpass123',
            **{k: v for k, v in self.user_data.items() if k != 'email'}
        )
        
        self.assertEqual(user.email, self.user_data['email'])
        self.assertEqual(user.first_name, self.user_data['first_name'])
        self.assertEqual(user.role, 'participant')
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
    
    def test_user_string_representation(self):
        """Test user string representation"""
        user = User.objects.create_user(
            email=self.user_data['email'],
            password='testpass123',
            **{k: v for k, v in self.user_data.items() if k != 'email'}
        )
        
        expected_str = f"{user.first_name} {user.last_name} ({user.email})"
        self.assertEqual(str(user), expected_str)
    
    def test_user_role_methods(self):
        """Test user role checking methods"""
        participant = User.objects.create_user(
            email='participant@example.com',
            password='testpass123',
            first_name='John',
            last_name='Participant',
            role='participant'
        )
        
        organizer = User.objects.create_user(
            email='organizer@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='Organizer',
            role='organizer'
        )
        
        admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            role='admin'
        )
        
        self.assertTrue(participant.is_participant())
        self.assertFalse(participant.is_organizer())
        self.assertFalse(participant.is_admin_user())
        
        self.assertTrue(organizer.is_organizer())
        self.assertFalse(organizer.is_participant())
        self.assertFalse(organizer.is_admin_user())
        
        self.assertTrue(admin.is_admin_user())
        self.assertFalse(admin.is_participant())
        self.assertFalse(admin.is_organizer())

class UserAPITest(APITestCase):
    """
    Test cases for User API endpoints
    """
    
    def setUp(self):
        self.registration_data = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone': '+22912345678',
            'role': 'participant'
        }
        
        self.login_data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
    
    def test_user_registration(self):
        """Test user registration"""
        url = reverse('user-register')
        response = self.client.post(url, self.registration_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        
        # Check if user was created
        user = User.objects.get(email=self.registration_data['email'])
        self.assertEqual(user.first_name, self.registration_data['first_name'])
    
    def test_user_registration_password_mismatch(self):
        """Test registration with password mismatch"""
        url = reverse('user-register')
        data = self.registration_data.copy()
        data['password_confirm'] = 'differentpassword'
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_login(self):
        """Test user login"""
        # First register a user
        User.objects.create_user(
            email=self.login_data['email'],
            password=self.login_data['password'],
            first_name='John',
            last_name='Doe'
        )
        
        url = reverse('user-login')
        response = self.client.post(url, self.login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
    
    def test_user_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        url = reverse('user-login')
        response = self.client.post(url, self.login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_user_profile(self):
        """Test getting user profile"""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        
        self.client.force_authenticate(user=user)
        url = reverse('user-profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)
        self.assertEqual(response.data['first_name'], user.first_name)
    
    def test_update_user_profile(self):
        """Test updating user profile"""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        
        self.client.force_authenticate(user=user)
        url = reverse('user-profile')
        
        update_data = {
            'first_name': 'Jane',
            'phone': '+22987654321'
        }
        
        response = self.client.patch(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Jane')
        self.assertEqual(response.data['phone'], '+22987654321')
        
        # Verify user was updated in database
        user.refresh_from_db()
        self.assertEqual(user.first_name, 'Jane')
        self.assertEqual(user.phone, '+22987654321')
