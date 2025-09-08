import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  start_datetime: string;
  location: string;
  max_attendees: number | null;
  category: string;
  organizer: {
    first_name: string;
    last_name: string;
  };
}

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      music: 'bg-purple-100 text-purple-800',
      sports: 'bg-green-100 text-green-800',
      conference: 'bg-blue-100 text-blue-800',
      art: 'bg-pink-100 text-pink-800',
      theater: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
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
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[category as keyof typeof colors]}`}>
        {labels[category as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden group">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
            {event.title}
          </h3>
          {getCategoryBadge(event.category)}
        </div>
        
        <p className="text-gray-600 mb-4 line-clamp-2">
          {event.description}
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDate(event.start_datetime)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Users className="h-4 w-4 mr-2" />
            <span>{event.max_attendees ? `Max ${event.max_attendees} participants` : 'Participation libre'}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Par {event.organizer.first_name} {event.organizer.last_name}
          </p>
          <Link
            to={`/events/${event.id}`}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            Voir détails
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
