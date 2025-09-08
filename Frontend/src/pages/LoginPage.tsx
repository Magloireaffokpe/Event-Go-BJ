import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Calendar, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { LoginRequest } from '../services/endpoints'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, user, loading } = useAuth()
  
  const [formData, setFormData] = useState<LoginRequest>({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Rediriger si déjà connecté
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      console.log('Utilisateur déjà connecté, redirection...')
      
      // Récupérer la page d'origine depuis location.state
      const from = location.state?.from?.pathname || getRoleBasedRedirect(user.role)
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, user, loading, navigate, location.state])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = "L'email est requis"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Format d'email invalide"
    }
    
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      console.log('Tentative de connexion...', formData.email)
      
      await login(formData)
      
      // La redirection sera gérée par l'useEffect après la mise à jour de l'état
      
    } catch (err: any) {
      console.error('Erreur de connexion:', err)
      
      // Gérer différents types d'erreurs
      if (err.response?.status === 401) {
        setErrors({ general: 'Email ou mot de passe incorrect' })
      } else if (err.response?.status === 400) {
        setErrors({ general: 'Données invalides. Veuillez vérifier vos informations.' })
      } else if (err.response?.status === 403) {
        setErrors({ general: 'Compte désactivé. Contactez l\'administrateur.' })
      } else {
        setErrors({ general: 'Erreur de connexion. Veuillez réessayer plus tard.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Fonction pour obtenir la redirection basée sur le rôle
  const getRoleBasedRedirect = (role: string): string => {
    switch (role) {
      case 'admin':
        return '/admin-dashboard'
      case 'organizer':
        return '/organizer-dashboard'
      case 'participant':
      default:
        return '/participant-dashboard'
    }
  }

  // Afficher un spinner si l'authentification est en cours de chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen flex items-center justify-center py-12 md:py-20">
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Calendar className="h-10 w-10 text-primary-600" />
            <span className="text-2xl font-bold text-foreground">EventGo BJ</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground">Connectez-vous à votre compte</h2>
          {location.state?.error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {location.state.error}
            </div>
          )}
        </div>

        {/* Formulaire */}
        <div className="bg-card py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {errors.general}
              </div>
            )}

            <Input
              label="Adresse email"
              name="email"
              type="email"
              placeholder="votre@email.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={<Mail className="h-5 w-5 text-muted-foreground" />}
            />

            <Input
              label="Mot de passe"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={<Lock className="h-5 w-5 text-muted-foreground" />}
              actionButton={
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500" 
                />
                <span className="text-sm text-foreground">Se souvenir de moi</span>
              </label>
              <Link to="#" className="text-sm font-medium text-primary-600 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">Nouveau sur EventGo BJ ?</span>
            </div>
          </div>

          <Link to="/register">
            <Button variant="outline" className="w-full mt-6">
              Créer un compte gratuit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Comptes de démo */}
        <div className="mt-8 bg-primary-50 border border-primary-200 rounded-lg p-4 text-sm text-primary-800">
          <h4 className="font-semibold mb-2">Comptes de démonstration :</h4>
          <p><strong>Participant :</strong> <code>user@demo.com</code> / <code>demo123</code></p>
          <p><strong>Organisateur :</strong> <code>organizer@demo.com</code> / <code>demo123</code></p>
          <p><strong>Admin :</strong> <code>admin@demo.com</code> / <code>demo123</code></p>
        </div>
      </div>
    </div>
  )
}

// --- Composants UI ---
const Button: React.FC<any> = ({ children, variant, className, loading, disabled, ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-md font-semibold transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2.5 text-sm'
  const styles = variant === 'outline' 
    ? 'border border-border bg-transparent text-foreground hover:bg-slate-100 focus:ring-primary-500' 
    : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-400 disabled:cursor-not-allowed'
  
  return (
    <button 
      className={`${base} ${styles} ${className}`} 
      disabled={loading || disabled} 
      {...props}
    >
      {loading ? <LoadingSpinner /> : children}
    </button>
  )
}

const Input: React.FC<any> = ({ label, icon, actionButton, error, ...props }) => (
  <div className="w-full mb-4">
    {label && <label className="block text-sm font-medium text-foreground mb-1">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
      <input
        className={`block w-full rounded-md border border-border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2.5 px-3 bg-input text-foreground ${icon ? 'pl-10' : ''} ${actionButton ? 'pr-10' : ''} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
        {...props}
      />
      {actionButton && <div className="absolute right-3 top-1/2 -translate-y-1/2">{actionButton}</div>}
    </div>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
)

const LoadingSpinner: React.FC = () => (
  <div className="w-5 h-5 rounded-full animate-spin border-2 border-solid border-white border-t-transparent"></div>
)

export default LoginPage