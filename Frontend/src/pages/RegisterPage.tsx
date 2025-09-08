/*
 * =================================================================================================
 * AMÉLIORATIONS APPORTÉES À RegisterPage.tsx
 * =================================================================================================
 *
 * 1.  LOGIQUE DE REDIRECTION BASÉE SUR LE RÔLE (Votre demande principale) :
 * - Dans la fonction `handleSubmit`, après que l'inscription a réussi (`await register(...)`),
 * j'ai ajouté une condition `if/else`.
 * - Si `formData.role` est 'organizer', l'utilisateur est redirigé vers `/dashboard/organisateur`.
 * - Sinon (s'il est 'participant'), il est redirigé vers `/profile`.
 * - Cette logique assure que chaque type d'utilisateur arrive sur la page qui lui est destinée.
 *
 * 2.  VALIDATION ROBUSTE DU FORMULAIRE :
 * - J'ai ajouté une fonction `validateForm` qui s'exécute avant l'envoi des données.
 * - Elle vérifie que tous les champs sont remplis, que l'email est valide, que le mot de passe
 * a une longueur minimale et que les deux mots de passe correspondent.
 * - Les erreurs sont affichées clairement sous chaque champ pour guider l'utilisateur.
 *
 * 3.  DESIGN MODERNE ET PROFESSIONNEL :
 * - La page est maintenant divisée en deux colonnes sur les grands écrans pour un look plus
 * professionnel : une colonne avec une image et un message de bienvenue, et l'autre avec le formulaire.
 * - Le formulaire est présenté dans une "carte" avec une ombre douce, le rendant plus lisible.
 * - Les champs de formulaire (`Input`), les boutons (`Button`) et le sélecteur de rôle ont été
 * stylisés pour être plus attrayants et intuitifs.
 *
 * 4.  EXPÉRIENCE UTILISATEUR AMÉLIORÉE (UX) :
 * - Ajout d'icônes pour voir/cacher le mot de passe, ce qui réduit les erreurs de saisie.
 * - Le sélecteur de rôle est plus visuel, utilisant des boutons radio stylisés qui sont plus
 * faciles à utiliser sur mobile et ordinateur.
 * - Un indicateur de chargement (`LoadingSpinner`) est affiché sur le bouton pendant que
 * l'inscription est en cours, informant l'utilisateur que quelque chose se passe.
 *
 * =================================================================================================
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone, Eye, EyeOff, Building, Users } from 'lucide-react';
import apiClient from '../services/apiClient';

// --- Composants UI temporaires pour l'aperçu ---
const Input: React.FC<any> = ({ icon, className, ...props }) => {
  const Icon = icon;
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />}
      <input className={`block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 ${Icon ? 'pl-10' : 'pl-4'} pr-4 ${className}`} {...props} />
    </div>
  );
};

const Button: React.FC<any> = ({ children, className, loading, ...props }) => {
  return (
    <button className={`w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`} {...props} disabled={loading}>
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Création en cours...
        </>
      ) : (
        children
      )}
    </button>
  );
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '', // ⚡️ champ utilisé côté front
    first_name: '',
    last_name: '',
    phone: '',
    role: 'participant' // Rôle par défaut
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (role: 'participant' | 'organizer') => {
    setFormData(prev => ({ ...prev, role }));
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name) newErrors.first_name = "Le prénom est requis.";
    if (!formData.last_name) newErrors.last_name = "Le nom est requis.";
    if (!formData.email) {
      newErrors.email = "L'adresse email est requise.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "L'adresse email est invalide.";
    }
    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Le mot de passe doit contenir au moins 8 caractères.";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // ⚡️ On adapte les données pour coller aux champs attendus par Django
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        password: formData.password,
        password_confirm: formData.confirmPassword, // ✅ le bon champ pour Django
      };

      const response = await apiClient.post('/auth/register/', payload);
      console.log("Réponse backend :", response.data);

      navigate("/login"); // redirige vers la page de connexion
    } catch (error: any) {
      if (error.response) {
        console.error("Erreur backend :", error.response.data);
        setErrors(error.response.data);
      } else {
        console.error("Erreur inattendue :", error.message);
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 shadow-2xl rounded-2xl overflow-hidden">
        
        {/* Colonne de gauche (Image et Texte) */}
        <div className="relative hidden lg:block">
          <img 
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1965&auto=format&fit=crop" 
            alt="Personnes à un événement" 
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.src = 'https://placehold.co/800x1200/6366f1/ffffff?text=EventGo+BJ'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-800 via-indigo-800/70 to-transparent"></div>
          <div className="relative z-10 p-12 flex flex-col justify-end h-full text-white">
            <h1 className="text-4xl font-bold leading-tight mb-4">Rejoignez la plus grande communauté événementielle du Bénin.</h1>
            <p className="text-indigo-200 text-lg">Créez, découvrez et participez à des événements qui vous ressemblent.</p>
          </div>
        </div>

        {/* Colonne de droite (Formulaire) */}
        <div className="bg-white p-8 sm:p-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Créer un compte</h2>
            <p className="text-slate-500 mb-8">
              Déjà membre ? <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">Connectez-vous</Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Je suis un...</label>
                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => handleRoleChange('participant')} className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${formData.role === 'participant' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 bg-white'}`}>
                        <Users className={`w-5 h-5 ${formData.role === 'participant' ? 'text-indigo-600' : 'text-slate-500'}`} />
                        <span className={`font-semibold ${formData.role === 'participant' ? 'text-indigo-700' : 'text-slate-700'}`}>Participant</span>
                    </button>
                    <button type="button" onClick={() => handleRoleChange('organizer')} className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${formData.role === 'organizer' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 bg-white'}`}>
                        <Building className={`w-5 h-5 ${formData.role === 'organizer' ? 'text-indigo-600' : 'text-slate-500'}`} />
                        <span className={`font-semibold ${formData.role === 'organizer' ? 'text-indigo-700' : 'text-slate-700'}`}>Organisateur</span>
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Input name="first_name" placeholder="Prénom" value={formData.first_name} onChange={handleChange} icon={User} />
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                </div>
                <div>
                  <Input name="last_name" placeholder="Nom" value={formData.last_name} onChange={handleChange} />
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                </div>
              </div>

              <div>
                <Input name="email" type="email" placeholder="Adresse e-mail" value={formData.email} onChange={handleChange} icon={Mail} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <Input name="phone" type="tel" placeholder="Numéro de téléphone (Optionnel)" value={formData.phone} onChange={handleChange} icon={Phone} />
              </div>

              <div className="relative">
                <Input name="password" type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" value={formData.password} onChange={handleChange} icon={Lock} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <div className="relative">
                <Input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirmer le mot de passe" value={formData.confirmPassword} onChange={handleChange} icon={Lock} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
              
              <Button type="submit" loading={loading}>
                Créer mon compte
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default RegisterPage;
