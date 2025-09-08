import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  Settings,
  UserCheck,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { dashboardAPI } from '../services/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/ui/Badge';

// Types selon votre schéma API
interface UserStats {
  total_users: number;
  new_users_this_month: number;
  users_by_role: {
    participant: number;
    organizer: number;
    admin: number;
  };
}

interface RevenueStats {
  total_revenue: number;
  total_tickets_sold: number;
  total_payments: number;
  payment_success_rate: number;
  payments_by_method: {
    mobile_money: number;
    card: number;
  };
}

// Interface corrigée pour correspondre à la réponse réelle de l'API
interface AdminDashboardData {
  user_stats: UserStats;
  event_stats: {
    total_events: number;
    active_events: number;
    events_this_month: number;
    upcoming_events: number;
  };
  revenue_stats: RevenueStats;
  monthly_stats: Array<{
    month: string;
    events: number;
    revenue: number;
    tickets_sold: number;
  }>;
  top_events: Array<{
    id: number;
    title: string;
    tickets_sold: number;
    revenue: number;
  }>;
  top_organizers: Array<{
    id: number;
    name: string;
    events_count: number;
    total_revenue: number;
  }>;
  recent_activity: {
    recent_users: Array<{ id: number; first_name: string; last_name: string; created_at: string }>;
    recent_events: Array<{ id: number; title: string; organizer: string; created_at: string }>;
    recent_purchases: Array<{ id: number; total_amount: number; created_at: string }>;
  };
}

const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardAPI.getAdminStats();
      console.log('Dashboard data received:', data); // Debug
      setDashboardData(data);
    } catch (error: any) {
      console.error('Error fetching admin dashboard data:', error);
      setError(error.response?.data?.detail || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-BJ', {
      style: 'currency',
      currency: 'XOF', // Franc CFA
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Chargement du tableau de bord administrateur..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-6 rounded-lg shadow max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-6 rounded-lg shadow max-w-md w-full text-center">
          <p className="text-gray-700 mb-4">Aucune donnée disponible</p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition"
          >
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  const { user_stats, event_stats, revenue_stats, monthly_stats, top_events, top_organizers, recent_activity } = dashboardData;

  // Calcul des tendances
  const lastTwoMonths = monthly_stats.slice(-2);
  const currentMonth = lastTwoMonths[1] || { events: 0, revenue: 0, tickets_sold: 0 };
  const previousMonth = lastTwoMonths[0] || { events: 0, revenue: 0, tickets_sold: 0 };

  const eventGrowth = getGrowthPercentage(currentMonth.events, previousMonth.events);
  const revenueGrowth = getGrowthPercentage(currentMonth.revenue, previousMonth.revenue);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tableau de bord administrateur
              </h1>
              <p className="text-gray-600 mt-2">
                Vue d'ensemble de la plateforme EventGo BJ
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="success">
                <Activity className="h-4 w-4 mr-1" />
                Système opérationnel
              </Badge>
              <button
                onClick={fetchDashboardData}
                className="px-3 py-2 text-sm rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Utilisateurs totaux */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {user_stats.total_users.toLocaleString()}
                </p>
                <p className="text-sm text-green-600">
                  +{user_stats.new_users_this_month} ce mois
                </p>
              </div>
            </div>
          </div>

          {/* Événements */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-full p-3 mr-4">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Événements</p>
                <p className="text-2xl font-bold text-gray-900">
                  {event_stats.total_events.toLocaleString()}
                </p>
                <p className="text-sm text-green-600">
                  {event_stats.active_events} actifs
                </p>
              </div>
            </div>
          </div>

          {/* Revenus */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Revenus totaux</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(revenue_stats.total_revenue)}
                </p>
                <p className="text-sm text-green-600">
                  {revenue_stats.total_tickets_sold} billets vendus
                </p>
              </div>
            </div>
          </div>

          {/* Taux de succès paiements */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-full p-3 mr-4">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de succès</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(revenue_stats.payment_success_rate)}
                </p>
                <p className="text-sm text-blue-600">
                  {revenue_stats.total_payments} paiements
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Répartition utilisateurs et performance mensuelle */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Répartition des utilisateurs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Répartition des utilisateurs</h2>
              <UserCheck className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Participants</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {user_stats.users_by_role.participant}
                  </div>
                  <div className="text-sm text-gray-600">
                    {((user_stats.users_by_role.participant / user_stats.total_users) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Organisateurs</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">
                    {user_stats.users_by_role.organizer}
                  </div>
                  <div className="text-sm text-gray-600">
                    {((user_stats.users_by_role.organizer / user_stats.total_users) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Administrateurs</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-600">
                    {user_stats.users_by_role.admin}
                  </div>
                  <div className="text-sm text-gray-600">
                    {((user_stats.users_by_role.admin / user_stats.total_users) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Méthodes de paiement */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Paiements par méthode</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {revenue_stats.payments_by_method.mobile_money}
                  </div>
                  <div className="text-sm text-gray-600">Mobile Money</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {revenue_stats.payments_by_method.card}
                  </div>
                  <div className="text-sm text-gray-600">Carte bancaire</div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance mensuelle */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Performance mensuelle</h2>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {monthly_stats.slice(-6).map((stat) => (
                <div key={stat.month} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">{stat.month}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {stat.events} événements
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(stat.revenue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {stat.tickets_sold} billets
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tendances */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className={`text-lg font-bold ${eventGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {eventGrowth >= 0 ? '+' : ''}{eventGrowth.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Événements</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className={`text-lg font-bold ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Revenus</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top événements et organisateurs */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Top événements */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Top événements</h2>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-3">
              {top_events.slice(0, 5).map((event, index) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-600">{event.tickets_sold} billets</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(event.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top organisateurs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Top organisateurs</h2>
              <Users className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-3">
              {top_organizers.slice(0, 5).map((organizer, index) => (
                <div key={organizer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{organizer.name}</div>
                      <div className="text-sm text-gray-600">{organizer.events_count} événements</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-purple-600">
                      {formatCurrency(organizer.total_revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activité récente et actions rapides */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Activité récente */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Activité récente</h2>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="text-md font-semibold text-blue-800 mb-2">Inscriptions récentes</h3>
                <ul className="space-y-1 text-sm text-blue-700">
                  {recent_activity.recent_users.map(user => (
                    <li key={user.id}>{user.first_name} {user.last_name}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="text-md font-semibold text-purple-800 mb-2">Nouveaux événements</h3>
                <ul className="space-y-1 text-sm text-purple-700">
                  {recent_activity.recent_events.map(event => (
                    <li key={event.id}>{event.title}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="text-md font-semibold text-green-800 mb-2">Achats récents</h3>
                <ul className="space-y-1 text-sm text-green-700">
                  {recent_activity.recent_purchases.map(purchase => (
                    <li key={purchase.id}>{formatCurrency(purchase.total_amount)}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Actions rapides</h2>

            <div className="space-y-3">
              <Link
                to="/admin/users"
                className="block w-full text-left px-4 py-3 rounded-md border border-gray-200 hover:bg-gray-50 transition duration-200"
              >
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-gray-600" />
                  Gérer les utilisateurs
                </div>
              </Link>

              <Link
                to="/admin/events"
                className="block w-full text-left px-4 py-3 rounded-md border border-gray-200 hover:bg-gray-50 transition duration-200"
              >
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                  Gérer les événements
                </div>
              </Link>

              <Link
                to="/admin/payments"
                className="block w-full text-left px-4 py-3 rounded-md border border-gray-200 hover:bg-gray-50 transition duration-200"
              >
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-gray-600" />
                  Paiements & remboursements
                </div>
              </Link>

              <button
                onClick={fetchDashboardData}
                className="w-full px-4 py-3 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition duration-200 flex items-center justify-center"
              >
                <Activity className="h-4 w-4 mr-2" />
                Actualiser les données
              </button>
            </div>

            <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span>Dernière mise à jour :</span>
                <span>{new Date().toLocaleTimeString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;