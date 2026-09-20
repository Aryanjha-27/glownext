from django.urls import path

from .views import (
    AdminAnalyticsAPI,
    AdminDashboardAPI,
    AdminDisputeDetailAPI,
    AdminDisputeListAPI,
    BookingsAPI,
    CashPaymentConfirmationAPI,
    CategoriesAPI,
    CustomerAddressAPI,
    CustomerDisputeDetailAPI,
    CustomerDisputeListCreateAPI,
    CustomerDisputeMessageAPI,
    CustomerNotificationsAPI,
    KhaltiCallbackAPI,
    KhaltiInitiateAPI,
    LoginAPI,
    LogoutAPI,
    NotificationsAPI,
    CurrentUserAPI,
    ProfileAPI,
    RegisterAPI,
    ReviewsAPI,
    MyReviewsAPI,
    ServiceDetailAPI,
    ServicesAPI,
    TestAPI,
    VendorDetailAPI,
    VendorBookingsAPI,
    VendorDashboardAPI,
    VendorAnalyticsAPI,
    VendorDisputeDetailAPI,
    VendorDisputeListAPI,
    VendorDisputeResponseAPI,
    VendorEarningsAPI,
    VendorPayoutsAPI,
    VendorProfileAPI,
    VendorServicesAPI,
    VendorTransactionsAPI,
    VendorVerificationAPI,
    VendorsAPI,
    PendingVendorsAPI,
)
from rest_framework_simplejwt.views import TokenRefreshView

# Maps API paths to their Django REST view classes.
urlpatterns = [
    path("test/", TestAPI.as_view()),

    # Auth
    path("auth/login/", LoginAPI.as_view()),
    path("auth/register/", RegisterAPI.as_view()),
    path("auth/user/", CurrentUserAPI.as_view()),
    path("auth/profile/", ProfileAPI.as_view()),
    path("auth/logout/", LogoutAPI.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view()),

    # Admin
    path("admin/dashboard/", AdminDashboardAPI.as_view()),
    path("admin/analytics/", AdminAnalyticsAPI.as_view()),
    path("admin/disputes/", AdminDisputeListAPI.as_view()),
    path("admin/disputes/<int:pk>/", AdminDisputeDetailAPI.as_view()),

    # Public catalog
    path("categories/", CategoriesAPI.as_view()),
    path("services/", ServicesAPI.as_view()),
    path("services/<slug:slug>/", ServiceDetailAPI.as_view()),
    path("services/<slug:slug>/reviews/", ReviewsAPI.as_view()),
    path("reviews/", MyReviewsAPI.as_view()),
    path("vendors/", VendorsAPI.as_view()),
    path("vendors/pending/", PendingVendorsAPI.as_view()),
    path("vendors/<int:pk>/verify/", VendorVerificationAPI.as_view()),
    path("vendors/<slug:slug>/", VendorDetailAPI.as_view()),

    # Booking
    path("bookings/", BookingsAPI.as_view()),
    path("bookings/<str:bid>/cancel/", BookingsAPI.as_view()),
    path("bookings/<str:bid>/confirm-cash/", CashPaymentConfirmationAPI.as_view()),

    # Vendor panel
    path("vendor/dashboard/", VendorDashboardAPI.as_view()),
    path("vendor/analytics/", VendorAnalyticsAPI.as_view()),
    path("vendor/earnings/", VendorEarningsAPI.as_view()),
    path("vendor/payouts/", VendorPayoutsAPI.as_view()),
    path("vendor/payouts/<str:pk>/", VendorPayoutsAPI.as_view()),
    path("vendor/transactions/", VendorTransactionsAPI.as_view()),
    path("vendor/services/", VendorServicesAPI.as_view()),
    path("vendor/services/<str:sid>/", VendorServicesAPI.as_view()),
    path("vendor/bookings/", VendorBookingsAPI.as_view()),
    path("vendor/bookings/<str:bid>/<str:action>/", VendorBookingsAPI.as_view()),
    path("vendor/profile/", VendorProfileAPI.as_view()),
    path("vendor/disputes/", VendorDisputeListAPI.as_view()),
    path("vendor/disputes/<str:pk>/", VendorDisputeDetailAPI.as_view()),
    path("vendor/disputes/<str:pk>/respond/", VendorDisputeResponseAPI.as_view()),
    path("vendor/disputes/<str:pk>/response/", VendorDisputeResponseAPI.as_view()),

    # Customer panel & Disputes
    path("disputes/", CustomerDisputeListCreateAPI.as_view()),
    path("disputes/<str:pk>/", CustomerDisputeDetailAPI.as_view()),
    path("disputes/<str:pk>/messages/", CustomerDisputeMessageAPI.as_view()),
    path("notifications/", NotificationsAPI.as_view()),
    path("notifications/<int:pk>/", NotificationsAPI.as_view()),
    path("customer/notifications/", CustomerNotificationsAPI.as_view()),
    path("customer/notifications/<int:pk>/read/", CustomerNotificationsAPI.as_view()),
    path("customer/notifications/read-all/", CustomerNotificationsAPI.as_view()),
    path("customer/address/", CustomerAddressAPI.as_view()),
    path("customer/address/<int:pk>/", CustomerAddressAPI.as_view()),
    path("customer/disputes/", CustomerDisputeListCreateAPI.as_view()),
    path("customer/disputes/<str:pk>/", CustomerDisputeDetailAPI.as_view()),
    path("customer/disputes/<str:pk>/messages/", CustomerDisputeMessageAPI.as_view()),

    # Payments
    path("payments/khalti/initiate/", KhaltiInitiateAPI.as_view()),
    path("payments/khalti/callback/", KhaltiCallbackAPI.as_view()),
]