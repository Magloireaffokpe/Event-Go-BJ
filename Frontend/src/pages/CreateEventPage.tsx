import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, FileText, ArrowLeft, Info, Clock } from 'lucide-react'
import { eventAPI } from '../services/endpoints'

// Composants UI cohérents avec votre design system
const Input: React.FC<any> = ({ label, name, error, className = '', ...props }) => (
  <div>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
    )}
    <input
      id={name}
      name={name}
      className={`block w-full rounded-lg border border-border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-3 px-4 bg-input text-foreground ${
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
      } ${className}`}
      {...props}
    />
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
)

const Textarea: React.FC<any> = ({ label, name, error, className = '', ...props }) => (
  <div>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
    )}
    <textarea
      id={name}
      name={name}
      className={`block w-full rounded-lg border border-border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-3 px-4 bg-input text-foreground resize-none ${
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
      } ${className}`}
      {...props}
    />
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
)

const Select: React.FC<any> = ({ label, name, options, error, className = '', ...props }) => (
  <div>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
    )}
    <select
      id={name}
      name={name}
      className={`block w-full rounded-lg border border-border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-3 px-4 bg-input text-foreground ${
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
      } ${className}`}
      {...props}
    >
      {options.map((option: { value: string; label: string }) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
)

const Button: React.FC<any> = ({ children, variant, loading, className = '', ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-base'
  const variantStyles = variant === 'outline'
    ? 'border border-border bg-transparent text-foreground hover:bg-slate-100 focus:ring-primary-500'
    : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles} ${className}`} 
      disabled={loading} 
      {...props}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Création...
        </>
      ) : (
        children
      )}
    </button>
  )
}

const CreateEventPage: React.FC = () => {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    location: '',
    category: 'other',
    max_attendees: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const categoryOptions = [
    { value: 'music', label: 'Musique' },
    { value: 'sports', label: 'Sport' },
    { value: 'conference', label: 'Conférence' },
    { value: 'art', label: 'Art' },
    { value: 'theater', label: 'Théâtre' },
    { value: 'other', label: 'Autre' }
  ]

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis'
    } else if (formData.title.length < 5) {
      newErrors.title = 'Le titre doit contenir au moins 5 caractères'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise'
    } else if (formData.description.length < 20) {
      newErrors.description = 'La description doit contenir au moins 20 caractères'
    }
    
    if (!formData.start_datetime) {
      newErrors.start_datetime = 'La date de début est requise'
    } else {
      const startDate = new Date(formData.start_datetime)
      const now = new Date()
      if (startDate <= now) {
        newErrors.start_datetime = 'La date de début doit être dans le futur'
      }
    }
    
    if (!formData.end_datetime) {
      newErrors.end_datetime = 'La date de fin est requise'
    }
    
    if (formData.start_datetime && formData.end_datetime) {
      const startDate = new Date(formData.start_datetime)
      const endDate = new Date(formData.end_datetime)
      if (endDate <= startDate) {
        newErrors.end_datetime = 'La date de fin doit être après la date de début'
      }
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Le lieu est requis'
    }
    
    if (formData.max_attendees) {
      const maxAttendees = parseInt(formData.max_attendees)
      if (isNaN(maxAttendees) || maxAttendees < 1) {
        newErrors.max_attendees = 'Le nombre de participants doit être supérieur à 0'
      } else if (maxAttendees > 100000) {
        newErrors.max_attendees = 'Le nombre de participants ne peut pas dépasser 100 000'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setLoading(true)
    setErrors({})
    
    try {
      // Préparer les données selon l'interface attendue par l'API
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_datetime: formData.start_datetime,
        end_datetime: formData.end_datetime,
        location: formData.location.trim(),
        category: formData.category as 'music' | 'sports' | 'conference' | 'art' | 'theater' | 'other',
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : undefined
      }
      
      console.log('Création de l\'événement:', eventData)
      
      const createdEvent = await eventAPI.createEvent(eventData)
      
      console.log('Événement créé avec succès:', createdEvent)
      console.log("📦 Réponse brute du backend:", createdEvent)

      console.log("createdEvent complet:", createdEvent)
      console.log("createdEvent.id:", createdEvent?.id)
      

      
      // Redirection vers la page de création de billets
      navigate(`/events/${createdEvent.id}/tickets/create`, {
        state: { 
          eventTitle: createdEvent.title,
          justCreated: true 
        }
      })
      
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'événement:', error)
      
      if (error.response?.status === 400) {
        const responseData = error.response.data
        // Mapper les erreurs du backend aux champs du formulaire
        const mappedErrors: Record<string, string> = {}
        
        Object.keys(responseData).forEach(key => {
          if (Array.isArray(responseData[key])) {
            mappedErrors[key] = responseData[key][0]
          } else {
            mappedErrors[key] = responseData[key]
          }
        })
        
        setErrors(mappedErrors)
      } else if (error.response?.status === 401) {
        setErrors({ general: 'Vous devez être connecté pour créer un événement' })
      } else if (error.response?.status === 403) {
        setErrors({ general: 'Vous n\'avez pas l\'autorisation de créer un événement' })
      } else {
        setErrors({ general: 'Une erreur est survenue lors de la création de l\'événement' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Définir des dates par défaut (dans 1 semaine et 2h plus tard)
  const defaultStartDate = new Date()
  defaultStartDate.setDate(defaultStartDate.getDate() + 7)
  defaultStartDate.setHours(19, 0, 0, 0) // 19h00

  const defaultEndDate = new Date(defaultStartDate)
  defaultEndDate.setHours(21, 0, 0, 0) // 21h00

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/organizer-dashboard')} 
            className="flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au tableau de bord
          </button>
          
          <div className="text-center">
            <div className="flex justify-center items-center space-x-2 mb-4">
              <Calendar className="h-10 w-10 text-primary-600" />
              <span className="text-2xl font-bold text-foreground">EventGo BJ</span>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Créer un nouvel événement
            </h1>
            <p className="text-muted-foreground text-lg">
              Donnez vie à votre idée et partagez-la avec la communauté
            </p>
          </div>
        </div>
        
        {/* Formulaire principal */}
        <div className="bg-card shadow-xl rounded-2xl overflow-hidden">
          <div className="p-8 border-b border-border">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-primary-600" />
              <h2 className="text-2xl font-semibold text-foreground">
                Détails de votre événement
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                {errors.general}
              </div>
            )}

            {/* Informations générales */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-2 border-b border-border">
                <FileText className="h-5 w-5 text-primary-600" />
                <h3 className="text-xl font-semibold text-foreground">
                  Informations générales
                </h3>
              </div>
              
              <Input
                label="Titre de l'événement *"
                name="title"
                value={formData.title}
                onChange={handleChange}
                error={errors.title}
                placeholder="Ex: Concert de Jazz en Plein Air"
                maxLength={200}
              />
              
              <Textarea
                label="Description *"
                name="description"
                rows={6}
                value={formData.description}
                onChange={handleChange}
                error={errors.description}
                placeholder="Décrivez votre événement : le programme, les artistes, l'ambiance, ce qui rend votre événement unique..."
                maxLength={2000}
              />
              
              <Select
                label="Catégorie"
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={categoryOptions}
                error={errors.category}
              />
            </div>

            {/* Date et heure */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-2 border-b border-border">
                <Clock className="h-5 w-5 text-primary-600" />
                <h3 className="text-xl font-semibold text-foreground">
                  Date et heure
                </h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Date et heure de début *"
                  name="start_datetime"
                  type="datetime-local"
                  value={formData.start_datetime || formatDateTimeLocal(defaultStartDate)}
                  onChange={handleChange}
                  error={errors.start_datetime}
                />
                
                <Input
                  label="Date et heure de fin *"
                  name="end_datetime"
                  type="datetime-local"
                  value={formData.end_datetime || formatDateTimeLocal(defaultEndDate)}
                  onChange={handleChange}
                  error={errors.end_datetime}
                />
              </div>
            </div>

            {/* Lieu */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-2 border-b border-border">
                <MapPin className="h-5 w-5 text-primary-600" />
                <h3 className="text-xl font-semibold text-foreground">
                  Localisation
                </h3>
              </div>
              
              <Input
                label="Adresse du lieu *"
                name="location"
                value={formData.location}
                onChange={handleChange}
                error={errors.location}
                placeholder="Ex: Place de l'Indépendance, Cotonou, Bénin"
              />
            </div>

            {/* Capacité */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-2 border-b border-border">
                <Users className="h-5 w-5 text-primary-600" />
                <h3 className="text-xl font-semibold text-foreground">
                  Capacité
                </h3>
              </div>
              
              <Input
                label="Nombre maximum de participants"
                name="max_attendees"
                type="number"
                min="1"
                max="100000"
                value={formData.max_attendees}
                onChange={handleChange}
                error={errors.max_attendees}
                placeholder="Laisser vide pour une capacité illimitée"
              />
              
              <p className="text-sm text-muted-foreground">
                Si vous ne définissez pas de limite, votre événement pourra accueillir un nombre illimité de participants.
              </p>
            </div>
            
            {/* Boutons d'action */}
            <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/organizer-dashboard')}
                className="sm:order-1"
              >
                Annuler
              </Button>
              
              <Button 
                type="submit" 
                loading={loading}
                className="sm:order-2"
              >
                Créer l'événement
              </Button>
            </div>
          </form>
        </div>

        {/* Conseils */}
        <div className="mt-10 bg-primary-50 border-l-4 border-primary-400 p-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-primary-800">
                Prochaine étape : définir vos billets
              </h3>
              <div className="mt-2 text-primary-700">
                <p className="mb-2">
                  Une fois votre événement créé, vous pourrez :
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Créer différents types de billets (Gratuit, Standard, VIP, etc.)</li>
                  <li>Définir les prix et quantités disponibles</li>
                  <li>Gérer les ventes et suivre les inscriptions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateEventPage