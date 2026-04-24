from django.db import models


class Community(models.Model):
    """Model for storing community information."""
    name = models.CharField(max_length=100, unique=True)
    population = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=200, blank=True)
    language = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return self.name