import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Ticket, Plus, Trash2, Save, ArrowLeft, Calendar, DollarSign, Users } from 'lucide-react'
import apiClient from '../services/apiClient'
import LoadingSpinner from '../components/LoadingSpinner'

// Types
interface TicketType {
  id: number
  name: string
  price: number
  quantity_available: number
  quantity_sold?: number
  event: number
  created_at: string
}

interface TicketFormData {
  name: string
  price: string
  quantity_available: string
}

interface TicketFormRow extends TicketFormData {
  id: string
  errors: Record<string, string>
  loading: boolean
}

const CreateTicketPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  
  // État pour les billets existants
  const [existingTickets, setExistingTickets] = useState<TicketType[]>([])
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [loadingError, setLoadingError] = useState<string>('')
  
  // État pour le formulaire de création
  const [ticketRows, setTicketRows] = useState<TicketFormRow[]>([
    {
      id: '1',
      name: '',
      price: '',
      quantity_available: '',
      errors: {},
      loading: false
    }
  ])
  const [globalLoading, setGlobalLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [createdCount, setCreatedCount] = useState(0)

  // Charger les billets existants au mount
  useEffect(() => {
    loadExistingTickets()
  }, [eventId])

  const loadExistingTickets = async () => {
    if (!eventId) return
    
    try {
      setLoadingExisting(true)
      setLoadingError('')
      const response = await apiClient.get(`/events/${eventId}/tickets/`)
      
      console.log('Réponse API pour les billets existants:', response.data)
      console.log('Type de response.data:', typeof response.data)
      console.log('Est-ce un array?', Array.isArray(response.data))
      
      // Vérifier si response.data est un array
      let ticketsData: TicketType[] = []
      
      if (Array.isArray(response.data)) {
        ticketsData = response.data
      } else if (response.data && typeof response.data === 'object') {
        // Si c'est un objet, chercher la propriété qui contient les tickets
        if (Array.isArray(response.data.tickets)) {
          ticketsData = response.data.tickets
        } else if (Array.isArray(response.data.results)) {
          ticketsData = response.data.results
        } else if (Array.isArray(response.data.data)) {
          ticketsData = response.data.data
        } else {
          console.warn('Structure de réponse inattendue:', response.data)
          ticketsData = []
        }
      } else {
        console.warn('Réponse API inattendue:', response.data)
        ticketsData = []
      }
      
      console.log('Billets traités:', ticketsData)
      setExistingTickets(ticketsData)
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des billets:', error)
      if (error.response?.status === 404) {
        setLoadingError('Événement non trouvé')
      } else if (error.response?.status === 403) {
        setLoadingError('Vous n\'avez pas l\'autorisation de voir ces billets')
      } else {
        setLoadingError('Erreur lors du chargement des billets existants')
      }
      // En cas d'erreur, s'assurer que existingTickets reste un array
      setExistingTickets([])
    } finally {
      setLoadingExisting(false)
    }
  }

  // Validation d'une ligne de formulaire
  const validateTicketRow = (row: TicketFormData): Record<string, string> => {
    const errors: Record<string, string> = {}
    
    if (!row.name.trim()) {
      errors.name = 'Le nom du billet est requis'
    }
    
    const price = parseFloat(row.price)
    if (!row.price.trim()) {
      errors.price = 'Le prix est requis'
    } else if (isNaN(price) || price <= 0) {
      errors.price = 'Le prix doit être supérieur à 0'
    }
    
    const quantity = parseInt(row.quantity_available)
    if (!row.quantity_available.trim()) {
      errors.quantity_available = 'La quantité est requise'
    } else if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      errors.quantity_available = 'La quantité doit être un nombre entier supérieur à 0'
    }
    
    return errors
  }

  // Ajouter une nouvelle ligne
  const addTicketRow = () => {
    const newRow: TicketFormRow = {
      id: Date.now().toString(),
      name: '',
      price: '',
      quantity_available: '',
      errors: {},
      loading: false
    }
    setTicketRows([...ticketRows, newRow])
  }

  // Supprimer une ligne
  const removeTicketRow = (id: string) => {
    if (ticketRows.length > 1) {
      setTicketRows(ticketRows.filter(row => row.id !== id))
    }
  }

  // Mettre à jour une ligne
  const updateTicketRow = (id: string, field: keyof TicketFormData, value: string) => {
    setTicketRows(rows => rows.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value }
        // Clear error for this field
        const errors = { ...row.errors }
        delete errors[field]
        return { ...updatedRow, errors }
      }
      return row
    }))
  }

  // Créer un billet
  const createTicket = async (rowData: TicketFormData): Promise<TicketType> => {
    if (!eventId) throw new Error('Event ID manquant')
    
    // Payload adapté au TicketCreateUpdateSerializer
    const payload = {
      name: rowData.name.trim(),
      description: '', // Optionnel mais dans le serializer
      price: parseFloat(rowData.price).toFixed(2), // Format décimal
      quantity_available: parseInt(rowData.quantity_available),
    }
    
    console.log('Payload envoyé:', payload)
    
    const response = await apiClient.post(`/events/${eventId}/tickets/`, payload)
    console.log('Réponse de création:', response.data)
    
    return response.data
  }

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')
    
    // Valider toutes les lignes non vides
    const validRows: TicketFormRow[] = []
    const updatedRows = ticketRows.map(row => {
      const isRowFilled = row.name.trim() || row.price.trim() || row.quantity_available.trim()
      
      if (isRowFilled) {
        const errors = validateTicketRow(row)
        validRows.push({ ...row, errors })
        return { ...row, errors }
      }
      return { ...row, errors: {} }
    })
    
    setTicketRows(updatedRows)
    
    // Vérifier s'il y a des erreurs
    const hasErrors = validRows.some(row => Object.keys(row.errors).length > 0)
    if (hasErrors) {
      return
    }
    
    if (validRows.length === 0) {
      return
    }
    
    setGlobalLoading(true)
    let successCount = 0
    
    // Créer chaque billet
    for (const row of validRows) {
      try {
        // Mettre à jour le loading de cette ligne
        setTicketRows(rows => rows.map(r =>
          r.id === row.id ? { ...r, loading: true, errors: {} } : r
        ))
        
        const createdTicket = await createTicket(row)
        
        // Ajouter à la liste des billets existants
        setExistingTickets(prev => [...prev, createdTicket])
        successCount++
        
        // Marquer cette ligne comme réussie
        setTicketRows(rows => rows.map(r =>
          r.id === row.id ? { ...r, loading: false, name: '', price: '', quantity_available: '' } : r
        ))
        
      } catch (error: any) {
        console.error(`Erreur lors de la création du billet "${row.name}":`, error)
        let errorMessage = 'Erreur lors de la création'
        
        if (error.response?.status === 400) {
          errorMessage = 'Données invalides'
          if (error.response?.data) {
            console.log('Détails de l\'erreur 400:', error.response.data)
          }
        } else if (error.response?.status === 403) {
          errorMessage = 'Non autorisé'
        }
        
        // Marquer cette ligne en erreur
        setTicketRows(rows => rows.map(r =>
          r.id === row.id ? {
            ...r,
            loading: false,
            errors: { general: errorMessage }
          } : r
        ))
      }
    }
    
    setGlobalLoading(false)
    setCreatedCount(successCount)
    
    if (successCount > 0) {
      setSuccessMessage(`${successCount} billet(s) créé(s) avec succès !`)
      // Recharger la liste des billets existants
      await loadExistingTickets()
      
      // Rediriger après un court délai si au moins un billet a été créé
      setTimeout(() => {
        navigate(`/events/${eventId}`, {
          state: {
            successMessage: `${successCount} billet(s) créé(s) avec succès !`
          }
        })
      }, 2000)
    }
  }

  if (loadingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour à l'événement
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <Ticket className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Créer des billets
            </h1>
          </div>
          <p className="text-gray-600">
            Événement #{eventId} - Définissez les différents types de billets pour votre événement
          </p>
        </div>

        {/* Messages d'erreur/succès */}
        {loadingError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {loadingError}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale - Création de billets */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-xl rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Nouveaux billets
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {ticketRows.map((row, index) => (
                  <div key={row.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Billet #{index + 1}
                      </h3>
                      {ticketRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTicketRow(row.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    {row.errors.general && (
                      <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                        {row.errors.general}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom du billet *
                        </label>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateTicketRow(row.id, 'name', e.target.value)}
                          placeholder="ex: Standard, VIP, Étudiant"
                          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                            row.errors.name ? 'border-red-300' : ''
                          }`}
                          disabled={row.loading}
                        />
                        {row.errors.name && (
                          <p className="mt-1 text-sm text-red-600">{row.errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prix (FCFA) *
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.price}
                            onChange={(e) => updateTicketRow(row.id, 'price', e.target.value)}
                            placeholder="3000"
                            className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                              row.errors.price ? 'border-red-300' : ''
                            }`}
                            disabled={row.loading}
                          />
                        </div>
                        {row.errors.price && (
                          <p className="mt-1 text-sm text-red-600">{row.errors.price}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantité disponible *
                        </label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            min="1"
                            value={row.quantity_available}
                            onChange={(e) => updateTicketRow(row.id, 'quantity_available', e.target.value)}
                            placeholder="100"
                            className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                              row.errors.quantity_available ? 'border-red-300' : ''
                            }`}
                            disabled={row.loading}
                          />
                        </div>
                        {row.errors.quantity_available && (
                          <p className="mt-1 text-sm text-red-600">{row.errors.quantity_available}</p>
                        )}
                      </div>
                    </div>

                    {row.loading && (
                      <div className="mt-2 flex items-center text-sm text-gray-600">
                        <LoadingSpinner />
                        <span className="ml-2">Création en cours...</span>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={addTicketRow}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un type de billet
                  </button>
                </div>

                <div className="flex space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={globalLoading}
                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {globalLoading ? (
                      <>
                        <LoadingSpinner />
                        <span className="ml-2">Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer les billets
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/events/${eventId}`)}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Plus tard
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Colonne latérale - Billets existants */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-xl rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Billets existants
              </h2>
              
              {/* Debug info */}
              <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
                Debug: {existingTickets.length} billets trouvés
              </div>
              
              {!Array.isArray(existingTickets) || existingTickets.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Aucun billet créé pour cet événement
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {existingTickets.map((ticket) => (
                    <div key={ticket.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{ticket.name}</h3>
                        <span className="text-sm text-gray-500">#{ticket.id}</span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Prix:</span>
                          <span className="font-medium">{Number(ticket.price).toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Disponible:</span>
                          <span className="font-medium">{ticket.quantity_available}</span>
                        </div>
                        {ticket.quantity_sold !== undefined && (
                          <div className="flex justify-between">
                            <span>Vendus:</span>
                            <span className="font-medium">{ticket.quantity_sold}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateTicketPage