// src/pages/ParticipantDashboard.tsx

import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { Plane, Calendar, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Purchase {
  id: number;
  purchase_reference: string;
  quantity: number;
  total_amount: string;
  status: string;
  qr_code_url: string;
  created_at: string;
  paid_at: string;
  ticket: {
    id: number;
    name: string;
    description: string;
    price: string;
    event: {
      id: number;
      title: string;
      start_datetime: string;
      end_datetime: string;
      location: string;
      image: string;
    };
  };
}

const ParticipantDashboard: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const response = await apiClient.get('/tickets/purchases/');
        setPurchases(response.data.results);
      } catch (err) {
        console.error('Erreur lors du chargement des réservations:', err);
        setError('Impossible de charger vos réservations. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p>Chargement de vos réservations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-12">
        <p>{error}</p>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <Plane className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium">Aucune réservation</h3>
        <p className="mt-1 text-sm text-gray-500">
          Vous n'avez pas encore acheté de billets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Mes Réservations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {purchases.map(purchase => (
          <div key={purchase.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <TicketIcon className="h-6 w-6 text-primary-500 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold">{purchase.ticket.event.title}</h3>
                  <p className="text-sm text-gray-600">{purchase.ticket.name}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>
                  {format(new Date(purchase.ticket.event.start_datetime), 'd MMMM yyyy HH:mm', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                <span>{purchase.ticket.event.location}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Quantité: {purchase.quantity}</span>
                <span>Statut: <span className="text-green-600 font-semibold">{purchase.status}</span></span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 flex flex-col items-center">
              {purchase.qr_code_url ? (
                <>
                  <img
                    src={purchase.qr_code_url}
                    alt={`QR Code pour la réservation ${purchase.purchase_reference}`}
                    className="w-32 h-32 mb-4 border border-gray-200 rounded-md p-1"
                  />
                  <a
                    href={purchase.qr_code_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    Voir le code QR en grand
                  </a>
                </>
              ) : (
                <p className="text-center text-sm text-gray-500 italic">
                  Code QR disponible après paiement.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantDashboard;