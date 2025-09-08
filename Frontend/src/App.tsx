// src/AppRoutes.tsx

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
// REMPLACEZ la ligne suivante
// import ProfilePage from './pages/ProfilePage'
// PAR cette ligne :
import ParticipantDashboard from './pages/ParticipantDashboard'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import CreateEventPage from './pages/CreateEventPage'
import OrganizerDashboard from './pages/OrganizerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import CreateTicketPage from './pages/CreateTicketPage'

// Composant pour gérer la redirection de la racine
const RootRedirect: React.FC = () =>{
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    console.log('RootRedirect - Utilisateur non connecté, redirection vers /home')
    return <Navigate to="/home" replace />
  }

  // Rediriger selon le rôle de l'utilisateur
  console.log('RootRedirect - Utilisateur connecté:', user.email, 'Rôle:', user.role)
  
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin-dashboard" replace />
    case 'organizer':
      return <Navigate to="/organizer-dashboard" replace />
    case 'participant':
    default:
      // Redirigez les participants vers leur tableau de bord
      return <Navigate to="/participant-dashboard" replace />
  }
}

// Composant de routes internes (à l'intérieur du AuthProvider)
const AppRoutes: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        {/* Redirection de la racine */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Routes publiques */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        
        {/* Routes protégées pour les participants */}
        <Route
          path="/participant-dashboard"
          element={
            <ProtectedRoute requiredRole="participant">
              <ParticipantDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Routes pour les organisateurs */}
        <Route
          path="/create-event"
          element={
            <ProtectedRoute requiredRole="organizer">
              <CreateEventPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer-dashboard"
          element={
            <ProtectedRoute requiredRole="organizer">
              <OrganizerDashboard />
            </ProtectedRoute>
          }
        />
        

        <Route
         path="/events/:eventId/tickets/create"
         element={
      <ProtectedRoute requiredRole="organizer">
      <CreateTicketPage />
      </ProtectedRoute>
  }
/>
        
        {/* Routes pour les admins */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Route 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

// Composant 404
const NotFoundPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth()

  const getHomeLink = () => {
    if (!isAuthenticated || !user) {
      return '/home'
    }
    
    switch (user.role) {
      case 'admin':
        return '/admin-dashboard'
      case 'organizer':
        return '/organizer-dashboard'
      case 'participant':
      default:
        // Redirigez les participants vers leur nouveau tableau de bord
        return '/participant-dashboard'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
          <p className="text-xl text-gray-600 mb-4">Page non trouvée</p>
          <p className="text-gray-500 mb-8">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>
        
        <div className="space-x-4">
          <a 
            href={getHomeLink()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </a>
          <a 
            href="/events"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Voir les événements
          </a>
        </div>
      </div>
    </div>
  )
}

// Composant principal App
function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App