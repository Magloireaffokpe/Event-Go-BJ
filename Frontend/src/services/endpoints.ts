import apiClient from './apiClient'

// Types from OpenAPI
export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  role: 'participant' | 'organizer' | 'admin'
  is_active: boolean
  date_joined: string
}

export interface Event {
  id: number
  title: string
  description: string
  start_datetime: string
  end_datetime: string
  location: string
  category: 'music' | 'sports' | 'conference' | 'art' | 'theater' | 'other'
  max_attendees: number
  organizer: User | number  // L'organizer peut être un objet User complet ou seulement son ID
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: number
  name: string
  price: number
  quantity_available: number
  quantity_sold: number
  event: number
  created_at: string
}

export interface Purchase {
  id: number
  ticket: Ticket
  user: User
  quantity: number
  total_amount: number
  qr_code: string
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
  role?: 'participant' | 'organizer'
}

export interface TokenResponse {
  access: string
  refresh: string
  user: User
}

// Authentication endpoints
export const authAPI = {
  register: async (data: RegisterRequest): Promise<TokenResponse> => {
    const response = await apiClient.post('/auth/register/', data)
    return response.data
  },

  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post('/auth/login/', data)
    return response.data
  },

  refresh: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh/', { refresh: refreshToken })
    return response.data
  }
}

// User endpoints
export const userAPI = {
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/users/me/')
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch('/users/me/', data)
    return response.data
  }
}

// Event endpoints
export const eventAPI = {
  getEvents: async (params?: {
    search?: string
    category?: string
    location?: string
    start_date?: string
  }) => {
    const response = await apiClient.get('/events/', { params })
    return response.data
  },

  getEvent: async (id: number): Promise<Event> => {
    const response = await apiClient.get(`/events/${id}/`)
    return response.data
  },

  createEvent: async (data: Partial<Event>): Promise<Event> => {
    const response = await apiClient.post('/events/', data)
    return response.data
  },

  updateEvent: async (id: number, data: Partial<Event>): Promise<Event> => {
    const response = await apiClient.patch(`/events/${id}/`, data)
    return response.data
  },

  deleteEvent: async (id: number): Promise<void> => {
    await apiClient.delete(`/events/${id}/`)
  }
}


// Ticket endpoints
export const ticketAPI = {
  getEventTickets: async (eventId: number): Promise<Ticket[]> => {
    const response = await apiClient.get(`/events/${eventId}/tickets/`)
    return response.data
  },

  createTicket: async (eventId: number, data: {
    name: string
    price: number
    quantity_available: number
  }): Promise<Ticket> => {
    const response = await apiClient.post(`/events/${eventId}/tickets/`, data)
    return response.data
  },

  purchaseTicket: async (ticketId: number, data: {
    quantity: number
    payment_method: 'mobile_money' | 'card'
    phone?: string
    card_number?: string
    card_expiry?: string
    card_cvv?: string
  }): Promise<Purchase> => {
    const response = await apiClient.post(`/tickets/${ticketId}/purchase/`, data)
    return response.data
  },

  getTicketDetails: async (ticketId: number): Promise<Purchase> => {
    const response = await apiClient.get(`/tickets/${ticketId}/`)
    return response.data
  }
}

// Dashboard endpoints
export const dashboardAPI = {
  getOrganizerStats: async () => {
    const response = await apiClient.get('/dashboard/organizer/')
    return response.data
  },

  getAdminStats: async () => {
    const response = await apiClient.get('/dashboard/admin/')
    return response.data
  }
}