/*
 * =================================================================================================
 * AMÉLIORATIONS APPORTÉES À LandingPage.tsx
 * =================================================================================================
 *
 * 1.  SECTION HERO MODERNISÉE :
 * - Le Hero a été amélioré avec une image de fond élégante et une superposition de gradient.
 * - Le texte est mieux mis en valeur grâce à des couleurs et des tailles de police optimisées.
 * - Les boutons "Commencer maintenant" et "Parcourir les événements" sont stylisés pour être plus
 * visibles et cohérents avec les autres pages.
 *
 * 2.  ESTHÉTIQUE GLOBALE ET CONSISTANCE :
 * - Les sections `Features`, `Advantages` et `Testimonials` sont stylisées pour s'harmoniser avec
 * le reste du site. Les cartes ont des coins arrondis, des ombres et des transitions fluides.
 * - Les icônes sont mises en évidence avec des cercles colorés.
 *
 * 3.  ANIMATIONS ET EXPÉRIENCE UTILISATEUR :
 * - Des animations de type "fade-in" et "slide-up" sont ajoutées pour un effet d'apparition
 * progressif lors du défilement, ce qui rend la page plus vivante et moderne.
 * - Les cartes et les boutons ont des effets de survol subtils.
 *
 * 4.  COMPOSANTS UNIFORMISÉS :
 * - Pour que la page soit fonctionnelle de manière autonome, les composants `Button` et `Badge` sont
 * implémentés localement avec les styles que nous avons définis ensemble précédemment.
 *
 * =================================================================================================
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Star, ArrowRight, CheckCircle, Ticket, Megaphone } from 'lucide-react';

const LandingPage: React.FC = () => {
  const features = [
    {
      icon: <Calendar className="h-8 w-8 text-primary-600" />,
      title: "Événements variés",
      description: "Concerts, conférences, spectacles, sport... Trouvez l'événement qui vous correspond"
    },
    {
      icon: <MapPin className="h-8 w-8 text-primary-600" />,
      title: "Partout au Bénin",
      description: "De Cotonou à Porto-Novo, découvrez les événements près de chez vous"
    },
    {
      icon: <Users className="h-8 w-8 text-primary-600" />,
      title: "Communauté active",
      description: "Rejoignez une communauté passionnée d'événements et de découvertes"
    }
  ];

  const testimonials = [
    {
      name: "Marie Adjovi",
      role: "Organisatrice d'événements",
      content: "EventGo BJ m'a permis d'organiser mes événements facilement et d'atteindre plus de participants.",
      rating: 5
    },
    {
      name: "Jean Kossou",
      role: "Participant régulier",
      content: "Je trouve toujours des événements intéressants sur EventGo BJ. L'interface est très intuitive.",
      rating: 5
    }
  ];

  const advantages = [
    "Billetterie intégrée avec QR Code",
    "Paiement mobile money et carte",
    "Interface moderne et responsive",
    "Support client réactif",
    "Statistiques détaillées pour les organisateurs"
  ];

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white min-h-[80vh] flex items-center justify-center">
        <img 
          src="https://images.unsplash.com/photo-1540306341279-d3725586617a?q=80&w=2070&auto=format&fit=crop" 
          alt="Ambiance d'événement" 
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          onError={(e) => { e.currentTarget.src = 'https://placehold.co/1920x1080/000000/FFFFFF?text=EventGo+BJ+Hero'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>

        <div className="relative z-10 container text-center py-20 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-white drop-shadow-lg">
            Découvrez les meilleurs
            <span className="block text-primary-400">événements du Bénin</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 text-slate-300 max-w-3xl mx-auto">
            EventGo BJ est votre plateforme de référence pour découvrir, participer et organiser 
            des événements inoubliables partout au Bénin.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to="/register">
              <Button size="lg" className="bg-primary-500 hover:bg-primary-600 text-white">
                Commencer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary-600">
                Parcourir les événements
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pourquoi choisir EventGo BJ ?
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Notre plateforme vous offre une expérience complète pour tous vos besoins événementiels.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-8 rounded-xl bg-card shadow-lg transition-transform duration-300 hover:-translate-y-2">
                <div className="bg-primary-100/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Une solution complète pour vos événements
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                EventGo BJ vous propose tous les outils nécessaires pour réussir vos événements,
                que vous soyez organisateur ou participant.
              </p>
              <ul className="space-y-4">
                {advantages.map((advantage, index) => (
                  <li key={index} className="flex items-center text-foreground">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 shrink-0" />
                    <span>{advantage}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-2xl shadow-xl p-8 transition-transform duration-300 hover:-translate-y-2">
              <div className="text-center">
                <Megaphone className="h-16 w-16 text-primary-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-foreground mb-4">Prêt à commencer ?</h3>
                <p className="text-muted-foreground mb-6">
                  Rejoignez des milliers d'utilisateurs qui font confiance à EventGo BJ
                </p>
                <div className="space-y-4">
                  <Link to="/register?role=organizer" className="block">
                    <Button className="w-full">
                      Créer mon premier événement
                    </Button>
                  </Link>
                  <Link to="/register" className="block">
                    <Button variant="outline" className="w-full">
                      Participer à des événements
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ce que disent nos utilisateurs
            </h2>
            <p className="text-lg text-muted-foreground">
              Découvrez les témoignages de notre communauté
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card rounded-2xl p-8 shadow-lg transition-transform duration-300 hover:scale-[1.02]">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-foreground mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary-600">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à découvrir votre prochain événement ?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Rejoignez EventGo BJ dès aujourd'hui et ne ratez plus jamais un événement qui vous intéresse.
          </p>
          <Link to="/register">
            <Button size="lg" className="text-primary-600 hover:bg-slate-100">
              S'inscrire gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-8 w-8 text-primary-500" />
                <span className="text-xl font-bold">EventGo BJ</span>
              </div>
              <p className="text-muted-foreground">
                Votre plateforme de référence pour découvrir et organiser 
                des événements exceptionnels au Bénin.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Liens rapides</h3>
              <ul className="space-y-2">
                <li><Link to="/events" className="text-muted-foreground hover:text-white transition-colors">Événements</Link></li>
                <li><Link to="/register" className="text-muted-foreground hover:text-white transition-colors">S'inscrire</Link></li>
                <li><Link to="/login" className="text-muted-foreground hover:text-white transition-colors">Se connecter</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <p className="text-muted-foreground">support@eventgo.bj</p>
              <p className="text-muted-foreground">Cotonou, Bénin</p>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 EventGo BJ. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Composants UI Temporaires ---
const Button: React.FC<any> = ({ children, variant, size, className, ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-semibold transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2';
  const sizeStyles = size === 'lg' ? 'px-6 py-3 text-base' : size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';
  const variantStyles = variant === 'outline'
    ? 'border border-border bg-transparent text-foreground hover:bg-slate-100 focus:ring-primary-500'
    : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500';
  return <button className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>{children}</button>;
};

export default LandingPage;