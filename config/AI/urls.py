
from django.urls import path
from . import views

urlpatterns = [
    # Main query endpoint
    path('api/ask/', views.ask_ai, name='ask_ai'),
    
    # System health check
    path('api/health/', views.health_check, name='health_check'),
    
    # Memory management endpoints
    path('api/memory/clear/', views.clear_conversation, name='clear_memory'),
    path('api/memory/get/', views.get_conversation_memory, name='get_memory'),
]