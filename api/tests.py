from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from store.models import Booking, Category, Notification, Service, ServiceReview
from userauth.models import profile, user
from vendor.models import vendor


class VendorPublicApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vendor_user = user.objects.create_user(
            email="vendor@example.com",
            username="vendor",
            password="pass1234",
        )
        profile.objects.create(user=self.vendor_user, full_name="Glow Studio", user_type="Vendor")

        self.vendor = vendor.objects.create(
            user=self.vendor_user,
            store_name="Glow Studio",
            email="vendor@example.com",
            description="Full service beauty studio.",
            is_verified=True,
            verification_status="Verified",
        )
        self.category = Category.objects.create(title="Hair Styling", slug="hair-styling")
        self.service = Service.objects.create(
            vendor=self.vendor,
            category=self.category,
            title="Signature Cut",
            description="Modern cut with a polished finish.",
            price=1200,
            status="Published",
        )
        self.review = ServiceReview.objects.create(
            service=self.service,
            user=self.vendor_user,
            rating=5,
            review="Excellent service.",
            is_verified=True,
            active=True,
        )

    def test_vendor_detail_returns_services_and_reviews(self):
        response = self.client.get(f"/api/vendors/{self.vendor.slug}/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("services", response.json())
        self.assertIn("reviews", response.json())
        self.assertEqual(response.json()["services"][0]["title"], "Signature Cut")
        self.assertEqual(response.json()["reviews"][0]["rating"], 5)

    @override_settings(KHALTI_SECRET_KEY="")
    def test_khalti_initiate_requires_backend_configuration(self):
        customer = user.objects.create_user(
            email="customer@example.com",
            username="customer",
            password="pass1234",
        )
        profile.objects.create(user=customer, full_name="Customer Person", user_type="Customer")
        booking = Booking.objects.create(
            customer=customer,
            service=self.service,
            service_type="Home",
            scheduled_date="2030-01-01",
            scheduled_time="10:00:00",
            total=1200,
        )

        token = RefreshToken.for_user(customer)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        response = self.client.post(
            "/api/payments/khalti/initiate/",
            {"booking_id": booking.id, "amount": "1200"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Khalti is not configured", response.json()["error"])

    def test_booking_creation_notifies_vendor(self):
        customer = user.objects.create_user(
            email="customer2@example.com",
            username="customer2",
            password="pass1234",
        )
        profile.objects.create(user=customer, full_name="Customer Two", user_type="Customer")

        token = RefreshToken.for_user(customer)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        response = self.client.post(
            "/api/bookings/",
            {
                "service_id": self.service.id,
                "scheduled_date": "2030-02-10",
                "scheduled_time": "09:00",
                "service_type": "Home",
                "notes": "Please arrive on time",
                "address": "Kathmandu",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        booking = Booking.objects.get(pk=response.json()["id"])
        self.assertTrue(
            Notification.objects.filter(user=self.vendor_user, booking=booking, message__icontains="new booking").exists()
        )

    def test_vendor_confirmation_notifies_customer(self):
        customer = user.objects.create_user(
            email="customer3@example.com",
            username="customer3",
            password="pass1234",
        )
        profile.objects.create(user=customer, full_name="Customer Three", user_type="Customer")
        booking = Booking.objects.create(
            customer=customer,
            service=self.service,
            service_type="Home",
            scheduled_date="2030-03-15",
            scheduled_time="11:30:00",
            total=1200,
            booking_status="Pending",
        )

        token = RefreshToken.for_user(self.vendor_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        response = self.client.post(f"/api/vendor/bookings/{booking.bid}/confirm/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            Notification.objects.filter(user=customer, booking=booking, message__icontains="assigned").exists()
        )
