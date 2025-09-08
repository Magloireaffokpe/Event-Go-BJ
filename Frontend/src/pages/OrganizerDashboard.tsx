import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Users, DollarSign, TrendingUp, Plus, Eye, Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import { eventAPI, ticketAPI, dashboardAPI } from '../services/endpoints';
import { Event, Ticket } from '../services/endpoints';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

// Types pour les statistiques
interface EventStats {
  event: Event;
  total_tickets: number;
  tickets_sold: number;
  total_revenue: number;
  attendees_count: number;
}

interface DashboardStats {
  total_events: number;
  total_revenue: number;
  total_attendees: number;
  upcoming_events: number;
}

const OrganizerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // États
  const [events, setEvents] = useState<EventStats[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Chargement des données du tableau de bord...');
      
      let eventsWithStats: EventStats[] = [];
      let calculatedStats: DashboardStats | null = null;
      
      try {
        // Essayer d'abord l'endpoint dédié du dashboard
        const dashboardResponse = await dashboardAPI.getOrganizerStats();
        console.log('Données du dashboard:', dashboardResponse);

        // Mettre à jour les statistiques globales
        setDashboardStats({
            total_events: dashboardResponse.total_events,
            total_revenue: dashboardResponse.total_revenue || 0,
            total_attendees: dashboardResponse.total_attendees || 0,
            upcoming_events: dashboardResponse.upcoming_events || 0
        });

        // L'API renvoie une liste d'événements récents avec des stats intégrées
        eventsWithStats = dashboardResponse.recent_events.map((eventData: any) => ({
            event: eventData,
            total_tickets: eventData.max_attendees || 0, // Utiliser la capacité maximale de l'événement
            tickets_sold: eventData.attendees || 0, // Le nombre de participants est le nombre de billets vendus
            total_revenue: eventData.revenue || 0,
            attendees_count: eventData.attendees || 0
        }));

      } catch (dashboardError) {
        // Fallback: Si l'API du dashboard échoue, on utilise l'API des événements
        console.log('Endpoint dashboard non disponible, utilisation de l\'endpoint events');
        
        const eventsResponse = await eventAPI.getEvents();
        let eventsData = eventsResponse.results;
        
        if (user) {
          eventsData = eventsData.filter((event: any) => {
            if (typeof event.organizer === 'object' && event.organizer !== null) {
              return event.organizer.id === user.id;
            }
            return event.organizer === user.id;
          });
        }
        
        eventsWithStats = [];
        let totalRevenue = 0;
        let totalAttendees = 0;
        let upcomingEvents = 0;
  
        for (const event of eventsData) {
          try {
            const tickets = await ticketAPI.getEventTickets(event.id);
  
            const totalTickets = tickets.reduce((sum, ticket) => sum + ticket.quantity_available, 0);
            const ticketsSold = tickets.reduce((sum, ticket) => sum + (ticket.quantity_sold || 0), 0);
            const revenue = tickets.reduce((sum, ticket) => {
              const sold = ticket.quantity_sold || 0;
              const price = Number(ticket.price) || 0;
              return sum + (sold * price);
            }, 0);
  
            const eventStats = {
              event,
              total_tickets: totalTickets,
              tickets_sold: ticketsSold,
              total_revenue: revenue,
              attendees_count: ticketsSold
            };
  
            eventsWithStats.push(eventStats);
            totalRevenue += revenue;
            totalAttendees += ticketsSold;
  
            const eventDate = new Date(event.start_datetime);
            if (eventDate > new Date()) {
              upcomingEvents++;
            }
  
          } catch (ticketError) {
            console.error(`Erreur lors du chargement des billets pour l'événement ${event.id}:`, ticketError);
            eventsWithStats.push({
              event,
              total_tickets: 0,
              tickets_sold: 0,
              total_revenue: 0,
              attendees_count: 0
            });
          }
        }
        
        setDashboardStats({
            total_events: eventsData.length,
            total_revenue: totalRevenue,
            total_attendees: totalAttendees,
            upcoming_events: upcomingEvents
        });
      }
      
      setEvents(eventsWithStats);
      console.log('Données finales:', {
        events: eventsWithStats,
        stats: dashboardStats
      });

    } catch (error: any) {
      console.error('Erreur lors du chargement du tableau de bord:', error);
      if (error.response?.status === 403) {
        setError('Vous n\'avez pas l\'autorisation d\'accéder à ces données');
      } else if (error.response?.status === 404) {
        setError('Aucun événement trouvé');
      } else {
        setError('Erreur lors du chargement des données du tableau de bord');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    setShowConfirmModal(false);
    setDeleteLoading(eventToDelete.id);
    
    try {
      console.log(`Suppression de l'événement ${eventToDelete.id}...`);
      await eventAPI.deleteEvent(eventToDelete.id);
      
      // Recharger les données après suppression
      await loadDashboardData();
      
      console.log('Événement supprimé avec succès');
      
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      
      if (error.response?.status === 403) {
        setError('Vous n\'avez pas l\'autorisation de supprimer cet événement');
      } else if (error.response?.status === 404) {
        setError('Événement non trouvé');
      } else {
        setError('Erreur lors de la suppression de l\'événement');
      }
    } finally {
      setDeleteLoading(null);
      setEventToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.start_datetime);
    const endDate = new Date(event.end_datetime);

    if (endDate < now) {
      return { label: 'Terminé', color: 'bg-gray-100 text-gray-800' };
    } else if (startDate <= now && endDate >= now) {
      return { label: 'En cours', color: 'bg-green-100 text-green-800' };
    } else {
      return { label: 'À venir', color: 'bg-blue-100 text-blue-800' };
    }
  };

  const getCategoryLabel = (category: string) => {
    const categories = {
      music: 'Musique',
      sports: 'Sports',
      conference: 'Conférence',
      art: 'Art',
      theater: 'Théâtre',
      other: 'Autre'
    };
    return categories[category as keyof typeof categories] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Modal de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer l'événement "{eventToDelete?.title}" ? 
              Cette action est irréversible et supprimera également tous les billets associés.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteEvent}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Tableau de bord organisateur
            </h1>
            <p className="text-gray-600 mt-2">
              Bienvenue {user?.first_name} {user?.last_name}, gérez vos événements et suivez vos performances
            </p>
          </div>
          <Link
            to="/create-event"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvel événement
          </Link>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Événements créés</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.total_events}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-3 mr-4">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenus totaux</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats.total_revenue.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-full p-3 mr-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Participants totaux</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.total_attendees}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="bg-orange-100 rounded-full p-3 mr-4">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Événements à venir</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.upcoming_events}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Mes événements</h2>
          </div>

          {events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Événement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenus
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((eventStats) => {
                    const { event } = eventStats;
                    const status = getEventStatus(event);
                    
                    return (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {event.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {event.location}
                            </div>
                            <div className="text-xs text-gray-400">
                              {getCategoryLabel(event.category)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(event.start_datetime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span>{eventStats.tickets_sold} / {eventStats.total_tickets}</span>
                            {eventStats.total_tickets > 0 && (
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className="bg-blue-600 h-1.5 rounded-full" 
                                  style={{ 
                                    width: `${(eventStats.tickets_sold / eventStats.total_tickets) * 100}%` 
                                  }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-1" />
                            {eventStats.attendees_count}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                            {eventStats.total_revenue.toLocaleString()} FCFA
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/events/${event.id}`}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/events/${event.id}/edit`}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/events/${event.id}/tickets/create`}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              title="Gérer les billets"
                            >
                              <Plus className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => {
                                setEventToDelete(event);
                                setShowConfirmModal(true);
                              }}
                              disabled={deleteLoading === event.id}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 disabled:opacity-50"
                              title="Supprimer"
                            >
                              {deleteLoading === event.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun événement créé
              </h3>
              <p className="text-gray-500 mb-6">
                Commencez par créer votre premier événement pour voir vos statistiques ici.
              </p>
              <Link
                to="/create-event"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un événement
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;