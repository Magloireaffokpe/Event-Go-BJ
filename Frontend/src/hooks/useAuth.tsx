import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, authAPI, LoginRequest, RegisterRequest } from '../services/endpoints'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Fonction pour charger l'utilisateur depuis le localStorage
  const loadUserFromStorage = () => {
    try {
      const storedUser = localStorage.getItem('user')
      const token = localStorage.getItem('accessToken') // ✅ Cohérent avec apiClient
      
      if (storedUser && token) {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        console.log('Utilisateur chargé depuis le storage:', userData)
      } else {
        console.log('Aucun utilisateur trouvé dans le storage')
        setUser(null)
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error)
      // Nettoyer le localStorage en cas d'erreur
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUserFromStorage()

    // Écouter les changements d'authentification
    const handleAuthStateChange = () => {
      console.log('Changement d\'état d\'authentification détecté')
      loadUserFromStorage()
    }

    // Écouter l'événement personnalisé
    window.addEventListener('authStateChanged', handleAuthStateChange)
    
    // Écouter les changements de localStorage (pour les onglets multiples)
    window.addEventListener('storage', handleAuthStateChange)

    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange)
      window.removeEventListener('storage', handleAuthStateChange)
    }
  }, [])

  const login = async (credentials: LoginRequest) => {
    try {
      setLoading(true)
      console.log('Tentative de connexion pour:', credentials.email)
      
      const response = await authAPI.login(credentials)
      
      // Sauvegarde cohérente avec apiClient.ts
      localStorage.setItem('accessToken', response.access)
      localStorage.setItem('refreshToken', response.refresh)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      setUser(response.user)
      
      console.log('Connexion réussie:', response.user)
      
      // Déclencher un événement personnalisé
      window.dispatchEvent(new Event('authStateChanged'))
      
    } catch (error) {
      console.error('Échec de la connexion:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      setLoading(true)
      console.log('Tentative d\'inscription pour:', data.email)
      
      const response = await authAPI.register(data)
      
      // Sauvegarde cohérente avec apiClient.ts
      localStorage.setItem('accessToken', response.access)
      localStorage.setItem('refreshToken', response.refresh)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      setUser(response.user)
      
      console.log('Inscription réussie:', response.user)
      
      // Déclencher un événement personnalisé
      window.dispatchEvent(new Event('authStateChanged'))
      
    } catch (error) {
      console.error('Échec de l\'inscription:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    console.log('Déconnexion de l\'utilisateur')
    
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    
    setUser(null)
    
    // Déclencher un événement personnalisé
    window.dispatchEvent(new Event('authStateChanged'))
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!localStorage.getItem('accessToken')
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}