"""
URL configuration for the accounts app.

Mounted at /api/v1/accounts/ from config/urls.py.
"""

from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    # --- Authentication ---------------------------------------------------
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("token/refresh/", views.TokenRefreshView.as_view(), name="token-refresh"),
    # --- Email verification -------------------------------------------------
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    # --- Password management -------------------------------------------------
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="reset-password"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    # --- Profile ---------------------------------------------------------
    path("profile/", views.ProfileView.as_view(), name="profile"),
    # --- Addresses ---------------------------------------------------------
    path("addresses/", views.AddressListCreateView.as_view(), name="address-list-create"),
    path("addresses/<uuid:pk>/", views.AddressDetailView.as_view(), name="address-detail"),
    path("addresses/<uuid:pk>/set-default/", views.AddressSetDefaultView.as_view(), name="address-set-default"),
    # --- Admin: manage customers ---------------------------------------------
    path("admin/customers/", views.AdminUserListView.as_view(), name="admin-customer-list"),
    path("admin/customers/<uuid:pk>/", views.AdminUserDetailView.as_view(), name="admin-customer-detail"),
    path("admin/customers/<uuid:pk>/active/", views.AdminSetUserActiveView.as_view(), name="admin-customer-set-active"),
    path("debug/media/", views.media_debug, name="media-debug"),
]
