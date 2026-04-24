# from django.urls import path, include

# urlpatterns = [
#     path('', include('config.AI.urls')),
# ]

"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from pathlib import Path

def test_page(request):
    """Serve test HTML page"""
    test_file = Path(__file__).resolve().parent.parent.parent / 'test-chatbot.html'
    if test_file.exists():
        with open(test_file, 'r') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse('<h1>Test page not found</h1>', status=404)

urlpatterns = [
    path('', test_page, name='test'),
    path('admin/', admin.site.urls),
    path('AI/', include('AI.urls')),
    path('ai/', include('AI.urls')),  # Lowercase alias
]