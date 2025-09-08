import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ListFilter, TrendingUp, CalendarDays, Users, Megaphone, CalendarX2, Ticket, Clock, Tag, ArrowRight } from 'lucide-react';
import apiClient from '../services/apiClient';

// Types
interface Event {
  id: number;
  title: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  category: string;
  description: string;
  max_attendees: number;
  organizer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

const HomePage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const categoryOptions = [
    { value: '', label: 'Catégorie' },
    { value: 'music', label: 'Musique' },
    { value: 'sports', label: 'Sport' },
    { value: 'conference', label: 'Conférence' },
    { value: 'art', label: 'Art' },
    { value: 'theater', label: 'Théâtre' },
    { value: 'other', label: 'Autre' }
  ];

  const locationOptions = [
    { value: '', label: 'Lieu' },
    { value: 'Cotonou', label: 'Cotonou' },
    { value: 'Porto-Novo', label: 'Porto-Novo' },
    { value: 'Parakou', label: 'Parakou' },
    { value: 'Abomey', label: 'Abomey' },
    { value: 'Bohicon', label: 'Bohicon' },
    { value: 'Ouidah', label: 'Ouidah' },
    { value: 'Natitingou', label: 'Natitingou' }
  ];

  // Fonction pour récupérer les événements depuis l'API
  const fetchEvents = async (params: any = {}) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/events/', { params });
      
      // Gérer la réponse (peut être un array direct ou wrapped dans results)
      const eventsData = response.data.results || response.data || [];
      setEvents(eventsData);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les événements au montage du composant
  useEffect(() => {
    fetchEvents({ status: 'upcoming', ordering: '-created_at' });
  }, []);

  // Fonction pour gérer la recherche
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedCategory) params.category = selectedCategory;
    if (selectedLocation) params.location = selectedLocation;
    
    fetchEvents(params);
  };

  // Filtrer les événements
  const now = new Date();
  const featuredEvents = events.slice(0, 3);
  const upcomingEvents = events.filter(event => new Date(event.start_datetime) > now).slice(0, 6);

  // Fonction pour obtenir une image par défaut selon la catégorie
  const getCategoryImage = (category: string) => {
    const images = {
      music: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?q=80&w=800&auto=format&fit=crop',
      sports: 'https://images.unsplash.com/photo-1587392949453-9563a552541e?q=80&w=800&auto=format&fit=crop',
      conference: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
      art: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=800&auto=format&fit=crop',
      theater: 'https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=800&auto=format&fit=crop',
      other: 'https://images.unsplash.com/photo-1625944228743-e30190113958?q=80&w=800&auto=format&fit=crop'
    };
    return images[category as keyof typeof images] || images.other;
  };

  // Fonction pour obtenir le label de la catégorie en français
  const getCategoryLabel = (category: string) => {
    const labels = {
      music: 'Musique',
      sports: 'Sport',
      conference: 'Conférence',
      art: 'Art',
      theater: 'Théâtre',
      other: 'Autre'
    };
    return labels[category as keyof typeof labels] || 'Autre';
  };

  return (
    <div className="bg-slate-50 text-slate-800">
      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white min-h-[70vh] md:min-h-[80vh] flex flex-col justify-center">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1519750157634-b6d4e74a1de1?q=80&w=1974&auto=format&fit=crop" 
            alt="Foule en festival" 
            className="w-full h-full object-cover opacity-25" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent"></div>
        </div>
        
        <div className="relative z-10 container text-center pt-24 pb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-white drop-shadow-lg leading-tight">
            Le meilleur du Bénin, <span className="text-teal-400">en un seul clic.</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 text-slate-300 max-w-3xl mx-auto">
            Découvrez des concerts, festivals, et conférences qui animent le pays.
          </p>
          
          {/* Barre de recherche fonctionnelle */}
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-xl p-3 shadow-2xl border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="relative md:col-span-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  placeholder="Quoi ? Ex: Festival de Jazz" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-12" 
                />
              </div>
              <div className="relative md:col-span-3">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Select 
                  options={locationOptions} 
                  value={selectedLocation} 
                  onChange={(e) => setSelectedLocation(e.target.value)} 
                  className="pl-12"
                />
              </div>
              <div className="relative md:col-span-3">
                <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Select 
                  options={categoryOptions} 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)} 
                  className="pl-12" 
                />
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="md:col-span-1 bg-teal-500 hover:bg-teal-600 focus:ring-teal-500 w-full flex justify-center items-center"
              >
                <Search className="h-6 w-6" />
                <span className="sr-only">Rechercher</span>
              </Button>
            </div>
          </form>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-20 bg-slate-50" style={{clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 20%)'}}></div>
      </section>

      {/* Section Événements à la une */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Événements à la une</h2>
            <p className="text-slate-500 mt-2 text-lg">Les incontournables du moment, sélectionnés pour vous.</p>
          </div>
          
          {loading ? (
            <LoadingSpinner text="Recherche des pépites..." />
          ) : featuredEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <CalendarX2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800">Aucun événement à la une</h3>
              <p className="text-slate-500">
                {searchTerm || selectedCategory || selectedLocation 
                  ? 'Aucun événement ne correspond à vos critères de recherche.'
                  : 'Revenez bientôt pour découvrir nos sélections !'
                }
              </p>
              {(searchTerm || selectedCategory || selectedLocation) && (
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                    setSelectedLocation('');
                    fetchEvents({ status: 'upcoming', ordering: '-created_at' });
                  }}
                  className="mt-4"
                >
                  Voir tous les événements
                </Button>
              )}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link to="/events">
              <Button size="lg" variant="outline" className="group">
                Voir tous les événements <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section Prochains rendez-vous */}
      <div className="relative bg-white">
        <div className="absolute top-0 left-0 w-full h-20 bg-slate-50" style={{clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 100%)'}}></div>
        <section className="py-16 md:py-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Prochains rendez-vous</h2>
              <p className="text-slate-500 mt-2 text-lg">Planifiez vos prochaines sorties.</p>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-slate-800">Pas d'événements à venir</h3>
                <p className="text-slate-500">De nouvelles aventures se préparent. Restez à l'affût !</p>
              </div>
            )}
          </div>
        </section>
        <div className="absolute bottom-0 left-0 w-full h-20 bg-slate-50" style={{clipPath: 'polygon(0 100%, 100% 100%, 100% 20%, 0 0)'}}></div>
      </div>

      {/* Section Statistiques */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <CalendarDays className="h-8 w-8 text-teal-600" />
              </div>
              <div className="text-5xl font-extrabold text-slate-900">
                {events.length > 0 ? `+${events.length}` : '120+'}
              </div>
              <p className="text-slate-500 mt-1">Événements disponibles</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="text-5xl font-extrabold text-slate-900">1.5K+</div>
              <p className="text-slate-500 mt-1">Participants heureux</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Megaphone className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-5xl font-extrabold text-slate-900">50+</div>
              <p className="text-slate-500 mt-1">Organisateurs partenaires</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section CTA Organisateur */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="relative bg-gradient-to-br from-indigo-600 to-slate-800 rounded-2xl p-8 md:p-12 text-white overflow-hidden text-center md:text-left">
            <div className="md:flex md:items-center md:gap-12">
              <div className="flex-shrink-0 mb-8 md:mb-0 text-center">
                <Megaphone className="w-24 h-24 text-teal-400 mx-auto" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">Organisez votre prochain succès.</h2>
                <p className="text-lg md:text-xl mb-8 text-indigo-200 max-w-2xl">
                  Rejoignez notre communauté d'organisateurs et touchez un public passionné au Bénin.
                </p>
                <Link to="/register?role=organizer">
                  <Button size="lg" className=" text-indigo-600 hover:bg-slate-100 transform hover:scale-105 transition-transform duration-300">
                    Devenir organisateur
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Composant EventCard adapté aux données réelles
const EventCard: React.FC<{ event: Event }> = ({ event }) => {
  const eventDate = new Date(event.start_datetime);
  const categoryImage = getCategoryImage(event.category);
  const categoryLabel = getCategoryLabel(event.category);

  return (
    <Link 
      to={`/events/${event.id}`} 
      className="group block bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2"
    >
      <div className="relative">
        <img 
          src={categoryImage} 
          alt={event.title} 
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            e.currentTarget.src = `https://placehold.co/600x400/a78bfa/ffffff?text=${encodeURIComponent(categoryLabel)}`;
          }}
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-center rounded-lg px-3 py-1 shadow-md">
          <p className="font-bold text-indigo-600 text-lg">{eventDate.getDate()}</p>
          <p className="text-xs uppercase text-slate-600 font-semibold">
            {eventDate.toLocaleDateString('fr-FR', { month: 'short' })}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/70 to-transparent">
          <h3 className="text-white font-bold text-lg leading-tight truncate">{event.title}</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Tag className="w-4 h-4 text-teal-500" />
          <span className="font-medium">{categoryLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="w-4 h-4 text-teal-500" />
          <span className="font-medium">{event.location}</span>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
          <p className="text-lg font-bold text-indigo-600">Voir prix</p>
          <span className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2">
            Détails
          </span>
        </div>
      </div>
    </Link>
  );
};

// Fonctions utilitaires
const getCategoryImage = (category: string) => {
  const images = {
    music: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?q=80&w=800&auto=format&fit=crop',
    sports: 'https://images.unsplash.com/photo-1587392949453-9563a552541e?q=80&w=800&auto=format&fit=crop',
    conference: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
    art: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=800&auto=format&fit=crop',
    theater: 'https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=800&auto=format&fit=crop',
    other: 'https://images.unsplash.com/photo-1625944228743-e30190113958?q=80&w=800&auto=format&fit=crop'
  };
  return images[category as keyof typeof images] || images.other;
};

const getCategoryLabel = (category: string) => {
  const labels = {
    music: 'Musique',
    sports: 'Sport',
    conference: 'Conférence',
    art: 'Art',
    theater: 'Théâtre',
    other: 'Autre'
  };
  return labels[category as keyof typeof labels] || 'Autre';
};

// Composants UI
const Button: React.FC<any> = ({ children, variant, size, className, ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const sizeStyles = size === 'lg' ? 'px-5 py-4 text-base' : 'px-4 py-2 text-sm';
  const variantStyles = variant === 'outline'
    ? 'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-indigo-500'
    : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500';
  return <button className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>{children}</button>;
};

const Input: React.FC<any> = ({ className, ...props }) => (
  <input className={`block w-full rounded-lg border-transparent shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-4 px-4 bg-white/20 md:bg-white text-slate-900 placeholder:text-slate-400 ${className}`} {...props} />
);

const Select: React.FC<any> = ({ options, className, ...props }) => (
  <select className={`block w-full rounded-lg border-transparent shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-4 px-4 bg-white/20 md:bg-white text-slate-900 ${className}`} {...props}>
    {options.map((option: { value: string, label: string }) => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
);

const LoadingSpinner: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-12">
    <div className="w-12 h-12 rounded-full animate-spin border-4 border-solid border-teal-500 border-t-transparent"></div>
    {text && <p className="text-slate-600 text-lg">{text}</p>}
  </div>
);

export default HomePage;