from rest_framework import serializers

class EventStatsSerializer(serializers.Serializer):
    """
    Serializer for detailed event statistics
    """
    event = serializers.DictField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_tickets_sold = serializers.IntegerField()
    total_tickets_available = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    sales_by_ticket = serializers.ListField()
    daily_sales = serializers.ListField()
    payment_methods = serializers.DictField()

class OrganizerDashboardSerializer(serializers.Serializer):
    """
    Serializer for organizer dashboard data
    """
    total_events = serializers.IntegerField()
    active_events = serializers.IntegerField()
    upcoming_events = serializers.IntegerField()
    past_events = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_tickets_sold = serializers.IntegerField()
    total_attendees = serializers.IntegerField()
    recent_events = serializers.ListField()
    monthly_revenue = serializers.ListField()
    top_events = serializers.ListField()

class UserStatsSerializer(serializers.Serializer):
    """
    Serializer for user statistics
    """
    total_users = serializers.IntegerField()
    new_users_this_month = serializers.IntegerField()
    users_by_role = serializers.DictField()

class RevenueStatsSerializer(serializers.Serializer):
    """
    Serializer for revenue statistics
    """
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_tickets_sold = serializers.IntegerField()
    total_payments = serializers.IntegerField()
    payment_success_rate = serializers.FloatField()
    payments_by_method = serializers.DictField()

class AdminDashboardSerializer(serializers.Serializer):
    """
    Serializer for admin dashboard data
    """
    user_stats = UserStatsSerializer()
    event_stats = serializers.DictField()
    revenue_stats = RevenueStatsSerializer()
    monthly_stats = serializers.ListField()
    top_events = serializers.ListField()
    top_organizers = serializers.ListField()
    recent_activity = serializers.DictField()

class MonthlyStatsSerializer(serializers.Serializer):
    """
    Serializer for monthly statistics
    """
    month = serializers.CharField()
    users = serializers.IntegerField()
    events = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    tickets_sold = serializers.IntegerField()
