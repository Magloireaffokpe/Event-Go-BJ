import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken') // ✅ Cohérent avec AuthContext
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('Request interceptor - Token ajouté:', token.substring(0, 20) + '...')
    } else {
      console.log('Request interceptor - Aucun token trouvé')
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for handling token refresh
apiClient.interceptors.response.use(
  (response) => {
    console.log('Response interceptor - Succès:', response.status, response.config.url)
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    console.log('Response interceptor - Erreur:', error.response?.status, originalRequest.url)

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem('refreshToken') // ✅ Cohérent
      
      if (refreshToken) {
        try {
          console.log('Tentative de refresh du token...')
          
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken
          })
          
          const newToken = response.data.access
          localStorage.setItem('accessToken', newToken)
          
          console.log('Token refreshed avec succès')
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)
          
        } catch (refreshError) {
          console.error('Échec du refresh du token:', refreshError)
          
          // Refresh failed, clear storage and redirect to login
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          
          // Déclencher un événement pour notifier les composants
          window.dispatchEvent(new Event('authStateChanged'))
          
          // Redirection conditionnelle (éviter la redirection si on est déjà sur login)
          if (!window.location.pathname.includes('/login')) {
            console.log('Redirection vers /login après échec du refresh')
            window.location.href = '/login'
          }
        }
      } else {
        console.log('Aucun refresh token disponible, redirection vers login')
        
        // No refresh token, clear storage and redirect
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        
        // Déclencher un événement pour notifier les composants
        window.dispatchEvent(new Event('authStateChanged'))
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default apiClient