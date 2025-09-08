/*
 * =================================================================================================
 * AMÉLIORATIONS APPORTÉES À Navbar.tsx
 * =================================================================================================
 *
 * 1.  COMPOSANTS AUTONOMES :
 * - J'ai simulé les hooks `useAuth`, `useLocation` et `useNavigate` pour rendre le composant
 * indépendant et facilement prévisualisable.
 * - Les données utilisateur sont des données factices pour la démonstration.
 *
 * 2.  REFONTE VISUELLE :
 * - Les styles ont été affinés pour un look plus moderne et épuré, avec des couleurs
 * cohérentes et des ombres.
 * - Les liens de navigation ont des états `hover` et `active` clairs et visuellement agréables.
 *
 * 3.  AMÉLIORATION DE L'INTERFACE UTILISATEUR :
 * - Le menu mobile s'ouvre et se ferme avec une animation simple.
 * - Le nom de l'utilisateur est maintenant un bouton qui ouvre un menu déroulant pour
 * accéder au profil et se déconnecter, améliorant l'ergonomie sur les ordinateurs.
 *
 * =================================================================================================
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Calendar, User, LogOut, Settings, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth'; // hook réel pour auth
import { useLocation, useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    const confirmed = window.confirm('Voulez-vous vraiment vous déconnecter ?');
    if (confirmed) {
      logout();
      navigate('/');
      setIsMenuOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/home', label: 'Accueil' },
    { path: '/events', label: 'Événements' },
  ];

  return (
    <nav className="bg-card shadow-lg sticky top-0 z-50 rounded-b-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 transition-transform hover:scale-105">
              <Calendar className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-foreground">EventGo BJ</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive(link.path)
                    ? 'text-primary-600 bg-primary-100 dark:bg-primary-900'
                    : 'text-muted-foreground hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {user?.role === 'organizer' && (
                  <Link
                    to="/create-event"
                    className="flex items-center space-x-1 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors shadow-md"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Créer un événement</span>
                  </Link>
                )}
                <div className="relative group">
                  <button className="flex items-center space-x-1 px-3 py-2 rounded-md text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <User className="h-4 w-4 text-primary-600" />
                    <span>{user?.first_name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>Profil</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
                >
                  Inscription
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden animate-fade-in duration-300">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-card border-t border-border">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`
                  block px-3 py-2 rounded-md text-base font-medium
                  ${isActive(link.path)
                    ? 'text-primary-600 bg-primary-100 dark:bg-primary-900'
                    : 'text-foreground hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated && (
              <>
                {user?.role === 'organizer' && (
                  <Link
                    to="/create-event"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Créer un événement
                  </Link>
                )}
                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Se déconnecter
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
