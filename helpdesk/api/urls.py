from django.urls import path
from .views import (RegisterView, LoginView, SetRoleView, TicketListView, 
                    TicketDetailView, TicketBulkUpdateView, TicketWebhookView, SLAReportView, UsersView, TransferTicketView, SubmitFeedbackView, 
                    UserRoleUpdateView, UserStatusUpdateView, UserSkillsUpdateView, AgentVerificationView, AdminTransferView,
                    TodoListView, TodoDetailView)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('set-role/', SetRoleView.as_view(), name='set-role'),
    path('login/', LoginView.as_view(), name='login'),
    path('tickets/', TicketListView.as_view(), name='ticket-list'),
    path('tickets/bulk/', TicketBulkUpdateView.as_view(), name='ticket-bulk'),
    path('tickets/<str:ticket_id>/', TicketDetailView.as_view(), name='ticket-detail'),
    path('tickets/<str:ticket_id>/transfer/', TransferTicketView.as_view(), name='transfer-ticket'),
    path('tickets/<str:ticket_id>/admin-transfer/', AdminTransferView.as_view(), name='admin-transfer-ticket'),
    path('tickets/<str:ticket_id>/feedback/', SubmitFeedbackView.as_view(), name='submit-feedback'),
    path('reports/sla/', SLAReportView.as_view(), name='sla-report'),
    path('users/', UsersView.as_view(), name='users'),
    path('users/<str:user_uid>/role/', UserRoleUpdateView.as_view(), name='user-role-update'),
    path('users/<str:user_uid>/status/', UserStatusUpdateView.as_view(), name='user-status-update'),
    path('users/<str:user_uid>/verify/', AgentVerificationView.as_view(), name='agent-verification'),
    path('users/<str:user_uid>/skills/', UserSkillsUpdateView.as_view(), name='user-skills-update'),
    path('todos/', TodoListView.as_view(), name='todo-list'),
    path('todos/<str:todo_id>/', TodoDetailView.as_view(), name='todo-detail'),
    path('webhooks/tickets/', TicketWebhookView.as_view(), name='ticket-webhook'),
]
