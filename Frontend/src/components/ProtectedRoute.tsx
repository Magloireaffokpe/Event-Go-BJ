import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'participant' | 'organizer' | 'admin'
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  // Debug: afficher l'état actuel
  useEffect(() => {
    console.log('ProtectedRoute - État actuel:', {
      isAuthenticated,
      loading,
      user: user ? { 
        id: user.id, 
        role: user.role, 
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name 
      } : null,
      requiredRole,
      currentPath: location.pathname,
      localStorage: {
        hasAccessToken: !!localStorage.getItem('accessToken'),
        hasUser: !!localStorage.getItem('user')
      }
    })
  }, [isAuthenticated, loading, user, requiredRole, location.pathname])

  // Afficher un spinner pendant le chargement
  if (loading) {
    console.log('ProtectedRoute - Chargement en cours...')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated || !user) {
    console.log('ProtectedRoute - Utilisateur non authentifié, redirection vers login')
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    )
  }

  // Vérifier le rôle requis
  if (requiredRole && user.role !== requiredRole) {
    console.log(`ProtectedRoute - Rôle insuffisant. Requis: ${requiredRole}, Actuel: ${user.role}`)
    
    // Rediriger selon le rôle de l'utilisateur
    const redirectPath = getRoleBasedRedirect(user.role)
    return (
      <Navigate 
        to={redirectPath} 
        state={{ 
          error: `Accès refusé. Cette page nécessite le rôle: ${requiredRole}`,
          from: location 
        }}
        replace 
      />
    )
  }

  console.log('ProtectedRoute - Accès autorisé pour', user.email, 'avec le rôle', user.role)
  return <>{children}</>
}

// Fonction helper pour déterminer la redirection basée sur le rôle
const getRoleBasedRedirect = (role: string): string => {
  switch (role) {
    case 'admin':
      return '/admin-dashboard'
    case 'organizer':
      return '/organizer-dashboard'
    case 'participant':
    default:
      return '/profile'
  }
}

export default ProtectedRoute