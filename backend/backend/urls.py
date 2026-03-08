"""
HMIS – Main URL Configuration
All API endpoints versioned under /api/v1/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)
from core.views import CustomTokenObtainPairView   # enriched login

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # ── Auth ──────────────────────────────────────────────────────────────────
    path("api/v1/auth/login/",   CustomTokenObtainPairView.as_view(), name="token_obtain"),
    path("api/v1/auth/refresh/", TokenRefreshView.as_view(),          name="token_refresh"),
    path("api/v1/auth/verify/",  TokenVerifyView.as_view(),           name="token_verify"),

    # ── Core app router (all resources) ──────────────────────────────────────
    path("api/v1/", include("core.urls")),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)