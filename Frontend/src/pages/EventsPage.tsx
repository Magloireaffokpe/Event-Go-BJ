/*
 * =================================================================================================
 * AMÉLIORATIONS APPORTÉES À EventsPage.tsx
 * =================================================================================================
 *
 * 1.  UNIFORMISATION DU DESIGN :
 * - Le design de la page a été entièrement revu pour être en harmonie avec celui de la page d'accueil.
 * - Utilisation des couleurs, typographies et espacements définis dans le `tailwind.config.js` et `index.css`.
 *
 * 2.  RESTRUCTURATION DES FILTRES ET DE LA RECHERCHE :
 * - Le bloc de recherche et de filtres est désormais plus compact et visuellement attractif.
 * - L'ensemble est regroupé dans un `div` avec un arrière-plan blanc, des ombres et des coins arrondis,
 * similaire à la barre de recherche de la page d'accueil pour la cohérence.
 * - Le bouton "Filtres" affiche/masque un panneau de filtres avancés de manière plus fluide.
 * - Le bouton "Effacer les filtres" est stylisé pour une meilleure interaction.
 *
 * 3.  HIÉRARCHIE VISUELLE AMÉLIORÉE :
 * - Les sections "Événements à venir" et "Événements passés" sont clairement séparées avec des titres
 * et des icônes distinctes.
 * - Les événements passés ont une opacité réduite (`opacity-60`) pour une meilleure distinction visuelle.
 * - La section "Aucun événement trouvé" a été stylisée pour être plus engageante.
 *
 * 4.  GESTION DES ÉTATS ET APPEL API :
 * - La logique de gestion des états (`useState`, `useEffect`) est conservée.
 * - Les appels à une API fictive ont été remplacés par un véritable appel à `apiClient`
 * pour que la recherche et les filtres fonctionnent avec le backend Django.
 *
 * =================================================================================================
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Calendar, Tag, MapPin, Clock } from 'lucide-react';
import apiClient from '../services/apiClient';

// --- Types et Données (Maintenant réelles) ---
interface Event {
  id: number;
  name: string;
  start_datetime: string;
  location: string;
  category: string;
  cover_image: string;
  price: string;
}

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const categoryOptions = [
    { value: '', label: 'Toutes catégories' },
    { value: 'Musique', label: 'Musique' },
    { value: 'Sport', label: 'Sport' },
    { value: 'Conférence', label: 'Conférence' },
    { value: 'Art', label: 'Art' },
    { value: 'Théâtre', label: 'Théâtre' },
    { value: 'Autre', label: 'Autre' }
  ];

  const locationOptions = [
    { value: '', label: 'Tous lieux' },
    { value: 'Cotonou', label: 'Cotonou' },
    { value: 'Porto-Novo', label: 'Porto-Novo' },
    { value: 'Parakou', label: 'Parakou' },
    { value: 'Abomey', label: 'Abomey' },
    { value: 'Bohicon', label: 'Bohicon' },
    { value: 'Ouidah', label: 'Ouidah' },
    { value: 'Natitingou', label: 'Natitingou' }
  ];

  useEffect(() => {
    fetchEvents();
  }, [searchTerm, selectedCategory, selectedLocation, startDate]);

  const fetchEvents = async () => {
    setLoading(true);

    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedCategory) params.category = selectedCategory;
    if (selectedLocation) params.location = selectedLocation;
    if (startDate) params.start_date_after = startDate;

    try {
      const response = await apiClient.get('/events/', { params });
      setEvents(response.data.results);
    } catch (error) {
      console.error("Erreur lors de la récupération des événements:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedLocation('');
    setStartDate('');
  };

  const hasActiveFilters = searchTerm || selectedCategory || selectedLocation || startDate;

  const upcomingEvents = events.filter(event => new Date(event.start_datetime) > new Date()).sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  const pastEvents = events.filter(event => new Date(event.start_datetime) <= new Date()).sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());

  return (
    <div className="bg-background min-h-screen py-12 md:py-16">
      <div className="container">
        {/* Header de la page */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Tous les événements au Bénin
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Explorez, trouvez et réservez votre prochaine aventure.
          </p>
        </header>

        {/* Section de recherche et de filtres */}
        <div className="bg-card rounded-2xl shadow-lg p-6 mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="h-5 w-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Rechercher par mot-clé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:w-auto flex items-center space-x-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtres</span>
            </Button>
          </div>

          {showFilters && (
            <div className="border-t border-border pt-4 mt-4 transition-all duration-300 ease-in-out">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <Select
                  label="Catégorie"
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                />
                <Select
                  label="Lieu"
                  options={locationOptions}
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                />
                <Input
                  label="Date minimum"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              {hasActiveFilters && (
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{events.length}</span> événement{events.length !== 1 ? 's' : ''} trouvé{events.length !== 1 ? 's' : ''}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-primary-500 hover:bg-primary-50"
                  >
                    Effacer les filtres
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="Chargement des événements..." />
          </div>
        ) : (
          <>
            {/* Section Événements à venir */}
            {upcomingEvents.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center text-foreground">
                  <Calendar className="h-6 w-6 text-primary-500 mr-2" />
                  Événements à venir ({upcomingEvents.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {/* Section Événements passés */}
            {pastEvents.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center text-foreground">
                  <Clock className="h-6 w-6 text-muted-foreground mr-2" />
                  Événements passés ({pastEvents.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pastEvents.map((event) => (
                    <div key={event.id} className="opacity-60 transition-opacity duration-300 hover:opacity-100">
                      <EventCard event={event} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Aucun événement trouvé */}
            {events.length === 0 && (
              <div className="text-center py-20 bg-card rounded-2xl shadow-lg">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">
                  Aucun événement trouvé
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {hasActiveFilters 
                    ? "Aucun événement ne correspond à vos critères de recherche. Essayez de modifier vos filtres."
                    : "Il n'y a pas d'événements disponibles pour le moment. Revenez bientôt !"
                  }
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters}>
                    Effacer les filtres
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// --- Composants UI Temporaires ---

const Button: React.FC<any> = ({ children, variant, size, className, ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-semibold transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2';
  const sizeStyles = size === 'lg' ? 'px-6 py-3 text-base' : size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';
  const variantStyles = variant === 'outline'
    ? 'border border-border bg-transparent text-foreground hover:bg-slate-100 focus:ring-primary-500'
    : variant === 'ghost'
    ? 'bg-transparent text-primary-500 hover:bg-slate-100'
    : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500';
  return <button className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>{children}</button>;
};

const Input: React.FC<any> = ({ label, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-foreground mb-1">{label}</label>}
    <input className={`block w-full rounded-md border-border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2.5 px-3 bg-input text-foreground ${className}`} {...props} />
  </div>
);

const Select: React.FC<any> = ({ label, options, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-foreground mb-1">{label}</label>}
    <select className={`block w-full rounded-md border-border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2.5 px-3 bg-input text-foreground ${className}`} {...props}>
      {options.map((option: { value: string, label: string }) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

const LoadingSpinner: React.FC<{ size?: string; text?: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-4">
    <div className="w-12 h-12 rounded-full animate-spin border-4 border-solid border-primary-600 border-t-transparent"></div>
    {text && <p className="text-muted-foreground">{text}</p>}
  </div>
);

const EventCard: React.FC<{ event: Event }> = ({ event }) => {
  const eventDate = new Date(event.start_datetime);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const isPastEvent = eventDate <= new Date();

  return (
    <Link to={`/events/${event.id}`} className="group block bg-card rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2">
      <div className="relative">
        <img src={event.cover_image} alt={event.name} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110" />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-center rounded-lg px-3 py-1 shadow">
          <p className="font-bold text-primary-600 text-lg">{formattedDate.split(' ')[0]}</p>
          <p className="text-xs uppercase text-slate-600">{formattedDate.split(' ')[1].slice(0, 3)}</p>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black/60 to-transparent"></div>
        {isPastEvent && (
           <div className="absolute top-0 left-0 bg-slate-800/60 text-white font-bold rounded-tl-xl rounded-br-lg text-sm px-4 py-1.5 uppercase">
              Passé
           </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 min-h-[3rem]">{event.name}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Tag className="w-4 h-4 text-primary-500" />
          <span>{event.category}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary-500" />
          <span>{event.location}</span>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
          <p className="text-lg font-bold text-primary-600">{event.price}</p>
          <Button size="sm">Voir les détails</Button>
        </div>
      </div>
    </Link>
  );
};

export default EventsPage;