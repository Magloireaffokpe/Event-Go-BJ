import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, User, CreditCard, Smartphone, ArrowLeft } from 'lucide-react';
import { Event, Ticket, eventAPI, ticketAPI } from '../services/endpoints';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import QRCodeDisplay from '../components/QRCodeDisplay';

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  
  const [purchaseData, setPurchaseData] = useState({
    quantity: 1,
    payment_method: 'mobile_money' as 'mobile_money' | 'card',
    phone: '',
    card_number: '',
    card_expiry: '',
    card_cvv: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
// Dans votre EventDetailPage.tsx
// REMPLACEZ la fonction fetchEventDetails par cette version corrigée :

useEffect(() => {
  if (id) {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching event details for ID: ${id}`); // Debug
        
        const [eventResponse, ticketsResponse] = await Promise.all([
          eventAPI.getEvent(Number(id)),
          ticketAPI.getEventTickets(Number(id))
        ]);
        
        console.log('Event response:', eventResponse); // Debug
        console.log('Tickets response:', ticketsResponse); // Debug
        
        // CORRECTION: Gérer les différents formats de réponse
        // Si la réponse a un .data, l'utiliser, sinon utiliser directement la réponse
        const eventData = eventResponse.data || eventResponse;
        const ticketsData = ticketsResponse.data || ticketsResponse;
        
        console.log('Processed event data:', eventData); // Debug
        console.log('Processed tickets data:', ticketsData); // Debug
        
        setEvent(eventData);
        
        // Gérer les tickets (peut être un array direct ou wrapped dans results)
        if (Array.isArray(ticketsData)) {
          setTickets(ticketsData);
        } else if (ticketsData && Array.isArray(ticketsData.results)) {
          setTickets(ticketsData.results);
        } else {
          setTickets([]);
        }
        
      } catch (error: any) {
        console.error('Error fetching event details:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }
}, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      music: 'info',
      sports: 'success',
      conference: 'default',
      art: 'warning',
      theater: 'danger',
      other: 'default'
    };
    
    const labels = {
      music: 'Musique',
      sports: 'Sport',
      conference: 'Conférence',
      art: 'Art',
      theater: 'Théâtre',
      other: 'Autre'
    };

    return (
      <Badge variant={colors[category as keyof typeof colors] as any}>
        {labels[category as keyof typeof labels]}
      </Badge>
    );
  };

  const handlePurchase = (ticket: Ticket) => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/events/${id}`;
      return;
    }
    
    setSelectedTicket(ticket);
    setShowPurchaseForm(true);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket) return;

    const newErrors: Record<string, string> = {};
    
    if (purchaseData.quantity < 1) {
      newErrors.quantity = 'La quantité doit être supérieure à 0';
    }
    
    if (purchaseData.quantity > selectedTicket.quantity_available) {
      newErrors.quantity = 'Quantité non disponible';
    }
    
    if (purchaseData.payment_method === 'mobile_money' && !purchaseData.phone) {
      newErrors.phone = 'Numéro de téléphone requis pour Mobile Money';
    }
    
    if (purchaseData.payment_method === 'card') {
      if (!purchaseData.card_number) newErrors.card_number = 'Numéro de carte requis';
      if (!purchaseData.card_expiry) newErrors.card_expiry = 'Date d\'expiration requise';
      if (!purchaseData.card_cvv) newErrors.card_cvv = 'Code CVV requis';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setPurchaseLoading(true);
   
    try {
        const purchaseResponse = await ticketAPI.purchaseTicket(selectedTicket.id, purchaseData);
        setPurchasedTicket(purchaseResponse.data);
        setShowPurchaseForm(false);
        
        const updatedTicketsResponse = await ticketAPI.getEventTickets(Number(id));
        setTickets(
          updatedTicketsResponse.data && typeof updatedTicketsResponse.data === 'object' && 'results' in updatedTicketsResponse.data
            ? updatedTicketsResponse.data.results
            : updatedTicketsResponse.data || []
        );

    } catch (error: any) {
        setErrors({ general: 'Erreur lors de l\'achat. Veuillez réessayer.' });
    } finally {
        setPurchaseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Chargement de l'événement..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Événement non trouvé</h2>
          <Link to="/events">
            <Button>Retour aux événements</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isEventPast = new Date(event.start_datetime) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Reste du code du composant... */}
      {/* Purchase Success Modal */}
      {purchasedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Achat réussi !</h3>
              <p className="text-gray-600 mb-6">Votre billet a été acheté avec succès</p>
            </div>
            
            <QRCodeDisplay 
              value={(purchasedTicket as any).qr_code} 
              title="Votre billet"
            />
            
            <div className="mt-6 text-center">
              <Button
                onClick={() => setPurchasedTicket(null)}
                className="w-full"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Form Modal */}
      {showPurchaseForm && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Acheter - {selectedTicket.name}
            </h3>
            
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {errors.general}
                </div>
              )}

              <div>
                <Input
                  label="Quantité"
                  type="number"
                  min="1"
                  max={selectedTicket.quantity_available}
                  value={purchaseData.quantity}
                  onChange={(e) => setPurchaseData(prev => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1
                  }))}
                  error={errors.quantity}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Prix unitaire : {selectedTicket.price}€ | Total : {(selectedTicket.price * purchaseData.quantity).toFixed(2)}€
                </p>
              </div>

              <Select
                label="Mode de paiement"
                options={[
                  { value: 'mobile_money', label: 'Mobile Money' },
                  { value: 'card', label: 'Carte bancaire' }
                ]}
                value={purchaseData.payment_method}
                onChange={(e) => setPurchaseData(prev => ({
                  ...prev,
                  payment_method: e.target.value as 'mobile_money' | 'card'
                }))}
              />

              {purchaseData.payment_method === 'mobile_money' && (
                <div className="relative">
                  <Input
                    label="Numéro de téléphone"
                    type="tel"
                    placeholder="+229 XX XX XX XX"
                    value={purchaseData.phone}
                    onChange={(e) => setPurchaseData(prev => ({
                      ...prev,
                      phone: e.target.value
                    }))}
                    error={errors.phone}
                    className="pl-10"
                  />
                  <Smartphone className="h-5 w-5 text-gray-400 absolute left-3 top-8" />
                </div>
              )}

              {purchaseData.payment_method === 'card' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      label="Numéro de carte"
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={purchaseData.card_number}
                      onChange={(e) => setPurchaseData(prev => ({
                        ...prev,
                        card_number: e.target.value
                      }))}
                      error={errors.card_number}
                      className="pl-10"
                    />
                    <CreditCard className="h-5 w-5 text-gray-400 absolute left-3 top-8" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Expiration"
                      type="text"
                      placeholder="MM/AA"
                      value={purchaseData.card_expiry}
                      onChange={(e) => setPurchaseData(prev => ({
                        ...prev,
                        card_expiry: e.target.value
                      }))}
                      error={errors.card_expiry}
                    />
                    
                    <Input
                      label="CVV"
                      type="text"
                      placeholder="123"
                      value={purchaseData.card_cvv}
                      onChange={(e) => setPurchaseData(prev => ({
                        ...prev,
                        card_cvv: e.target.value
                      }))}
                      error={errors.card_cvv}
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPurchaseForm(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  loading={purchaseLoading}
                  className="flex-1"
                >
                  Acheter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          to="/events" 
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux événements
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                      {event.title}
                    </h1>
                    {getCategoryBadge(event.category)}
                  </div>
                  {isEventPast && (
                    <Badge variant="default">Terminé</Badge>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-5 w-5 mr-3" />
                      <div>
                        <p className="font-medium">Début</p>
                        <p>{formatDate(event.start_datetime)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-5 w-5 mr-3" />
                      <div>
                        <p className="font-medium">Fin</p>
                        <p>{formatDate(event.end_datetime)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-5 w-5 mr-3" />
                      <div>
                        <p className="font-medium">Lieu</p>
                        <p>{event.location}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <Users className="h-5 w-5 mr-3" />
                      <div>
                        <p className="font-medium">Capacité</p>
                        <p>{event.max_attendees ? `${event.max_attendees} personnes` : 'Illimitée'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                  </div>
                </div>

                <div className="border-t pt-8 mt-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Organisateur</h2>
                  <div className="flex items-center">
                    <div className="bg-primary-100 rounded-full p-3 mr-4">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {event.organizer.first_name} {event.organizer.last_name}
                      </p>
                      <p className="text-gray-600">{event.organizer.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tickets Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Billets disponibles</h2>
              
              {tickets.length > 0 ? (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{ticket.name}</h3>
                          <p className="text-2xl font-bold text-primary-600">
                            {ticket.price === 0 ? 'Gratuit' : `${ticket.price}€`}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-600">Disponible</p>
                          <p className="font-medium">
                            {ticket.quantity_available - ticket.quantity_sold}
                          </p>
                        </div>
                      </div>
                      
                      {!isEventPast && ticket.quantity_available > ticket.quantity_sold ? (
                        <Button
                          onClick={() => handlePurchase(ticket)}
                          className="w-full"
                          disabled={!isAuthenticated && !ticket}
                        >
                          {isAuthenticated ? 'Acheter' : 'Se connecter pour acheter'}
                        </Button>
                      ) : (
                        <Button
                          disabled
                          className="w-full"
                          variant="outline"
                        >
                          {isEventPast ? 'Événement terminé' : 'Complet'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun billet disponible</p>
                </div>
              )}

              {!isAuthenticated && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    Connectez-vous pour acheter des billets
                  </p>
                  <Link to="/login">
                    <Button size="sm" className="w-full">
                      Se connecter
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;