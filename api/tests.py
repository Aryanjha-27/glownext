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


class CommissionCalculationTests(TestCase):
    def setUp(self):
        self.vendor_user = user.objects.create_user(username="v1", email="v1@test.com", password="pwd")
        profile.objects.create(user=self.vendor_user, full_name="Salon 1", user_type="Vendor")
        self.vendor = vendor.objects.create(
            user=self.vendor_user,
            store_name="Salon 1",
            email="v1@test.com",
            is_verified=True,
            verification_status="Verified",
        )
        self.category = Category.objects.create(title="Spa", slug="spa")
        self.service = Service.objects.create(
            vendor=self.vendor, category=self.category, title="Massage", price=2000, status="Published"
        )
        self.customer = user.objects.create_user(username="c1", email="c1@test.com", password="pwd")
        profile.objects.create(user=self.customer, full_name="Customer One", user_type="Customer")

    def test_commission_calculation_on_booking_save(self):
        booking = Booking.objects.create(
            customer=self.customer,
            service=self.service,
            service_type="Store",
            scheduled_date="2030-05-01",
            scheduled_time="10:00",
            total=2000,
        )
        # 10% platform commission on 2000 is 200, vendor net is 1800
        self.assertEqual(booking.commission_amount, 200.00)
        self.assertEqual(booking.vendor_amount, 1800.00)

    def test_zero_total_booking(self):
        booking = Booking.objects.create(
            customer=self.customer,
            service=self.service,
            service_type="Store",
            scheduled_date="2030-05-01",
            scheduled_time="10:00",
            total=0,
        )
        self.assertEqual(booking.commission_amount, 0.00)
        self.assertEqual(booking.vendor_amount, 0.00)


class CashPaymentWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vendor_user = user.objects.create_user(username="cash_vendor", email="cash_vendor@test.com", password="pwd")
        profile.objects.create(user=self.vendor_user, full_name="Cash Vendor", user_type="Vendor")
        self.vendor = vendor.objects.create(
            user=self.vendor_user,
            store_name="Cash Studio",
            email="cash_vendor@test.com",
            is_verified=True,
            verification_status="Verified",
        )
        category = Category.objects.create(title="Cash Services", slug="cash-services")
        service = Service.objects.create(vendor=self.vendor, category=category, title="Cash Service", price=1000, status="Published")
        self.customer = user.objects.create_user(username="cash_customer", email="cash_customer@test.com", password="pwd")
        profile.objects.create(user=self.customer, full_name="Cash Customer", user_type="Customer")
        self.booking = Booking.objects.create(
            customer=self.customer,
            service=service,
            service_type="Store",
            scheduled_date="2030-07-01",
            scheduled_time="14:00",
            total=1000,
            payment_method="COD",
            payment_status="Processing",
            booking_status="Confirmed",
        )

    def test_vendor_completion_then_customer_cash_confirmation(self):
        vendor_token = RefreshToken.for_user(self.vendor_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {vendor_token.access_token}")
        complete_response = self.client.post(f"/api/vendor/bookings/{self.booking.bid}/complete/")
        self.assertEqual(complete_response.status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.booking_status, "Completed")
        self.assertEqual(self.booking.payment_status, "Processing")

        customer_token = RefreshToken.for_user(self.customer)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {customer_token.access_token}")
        confirm_response = self.client.post(f"/api/bookings/{self.booking.bid}/confirm-cash/")
        self.assertEqual(confirm_response.status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, "Paid")
        self.assertEqual(self.booking.payment_method, "COD")
        self.assertEqual(self.booking.commission_amount, 100)
        self.assertEqual(self.booking.vendor_amount, 900)

        retry_response = self.client.post(f"/api/bookings/{self.booking.bid}/confirm-cash/")
        self.assertEqual(retry_response.status_code, 200)
        self.assertEqual(Notification.objects.filter(user=self.vendor_user, booking=self.booking, type="Payment").count(), 1)

        from glownext.admin_analytics import get_jazzmin_dashboard_context
        analytics = get_jazzmin_dashboard_context()["analytics"]
        self.assertEqual(analytics["total_customer_payments"], 1000)
        self.assertEqual(analytics["platform_commission"], 100)
        self.assertEqual(analytics["vendor_earnings"], 900)

    def test_notification_seen_state_is_shared_with_admin(self):
        notification = Notification.objects.create(
            user=self.customer,
            type="General",
            message="Please review your completed service.",
        )
        token = RefreshToken.for_user(self.customer)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        response = self.client.post(f"/api/notifications/{notification.pk}/")
        self.assertEqual(response.status_code, 200)
        notification.refresh_from_db()
        self.assertTrue(notification.seen)


class DisputeSecurityAndWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vendor_user = user.objects.create_user(username="v_sec", email="v_sec@test.com", password="pwd")
        profile.objects.create(user=self.vendor_user, full_name="Sec Vendor", user_type="Vendor")
        self.vendor = vendor.objects.create(
            user=self.vendor_user,
            store_name="Sec Vendor",
            email="v_sec@test.com",
            is_verified=True,
            verification_status="Verified",
        )

        self.other_vendor_user = user.objects.create_user(username="v_other", email="v_other@test.com", password="pwd")
        profile.objects.create(user=self.other_vendor_user, full_name="Other Vendor", user_type="Vendor")
        self.other_vendor = vendor.objects.create(
            user=self.other_vendor_user,
            store_name="Other Vendor",
            email="v_other@test.com",
            is_verified=True,
            verification_status="Verified",
        )

        self.category = Category.objects.create(title="Nails", slug="nails")
        self.service = Service.objects.create(
            vendor=self.vendor, category=self.category, title="Manicure", price=1500, status="Published"
        )

        self.customer = user.objects.create_user(username="c_sec", email="c_sec@test.com", password="pwd")
        profile.objects.create(user=self.customer, full_name="Customer Sec", user_type="Customer")

        self.other_customer = user.objects.create_user(username="c_other", email="c_other@test.com", password="pwd")
        profile.objects.create(user=self.other_customer, full_name="Other Customer", user_type="Customer")

        self.booking = Booking.objects.create(
            customer=self.customer,
            service=self.service,
            service_type="Store",
            scheduled_date="2030-06-01",
            scheduled_time="14:00",
            total=1500,
            payment_status="Paid",
        )

    def test_customer_can_create_dispute(self):
        token = RefreshToken.for_user(self.customer)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        response = self.client.post(
            "/api/disputes/",
            {
                "booking": self.booking.bid,
                "reason": "Service Quality",
                "subject": "Poor acrylic finish",
                "description": "The nails started peeling after 2 hours.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        dispute_data = response.json()
        self.assertEqual(dispute_data["reason"], "Service quality issue")
        self.assertEqual(dispute_data["status"], "Open")
        self.assertEqual(float(dispute_data["amount"]), 1500.00)

    def test_dispute_access_security(self):
        # Customer 1 raises dispute
        from vendor.models import Dispute
        dispute = Dispute.objects.create(
            vendor=self.vendor,
            customer=self.customer,
            booking=self.booking,
            reason="Service Quality",
            description="Bad service",
            amount=1500,
        )

        # Other customer cannot view it
        token_other = RefreshToken.for_user(self.other_customer)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_other.access_token}")
        response = self.client.get(f"/api/disputes/{dispute.did}/")
        self.assertEqual(response.status_code, 404)

        # Other vendor cannot view it
        token_v_other = RefreshToken.for_user(self.other_vendor_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_v_other.access_token}")
        response = self.client.get(f"/api/vendor/disputes/{dispute.did}/")
        self.assertEqual(response.status_code, 404)

        # Assigned vendor CAN view it
        token_v = RefreshToken.for_user(self.vendor_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_v.access_token}")
        response = self.client.get(f"/api/vendor/disputes/{dispute.did}/")
        self.assertEqual(response.status_code, 200)

    def test_vendor_can_respond_to_dispute(self):
        from vendor.models import Dispute
        dispute = Dispute.objects.create(
            vendor=self.vendor,
            customer=self.customer,
            booking=self.booking,
            reason="Service Quality",
            description="Bad service",
            amount=1500,
            status="Waiting for Vendor",
        )

        token_v = RefreshToken.for_user(self.vendor_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_v.access_token}")
        response = self.client.post(
            f"/api/vendor/disputes/{dispute.did}/respond/",
            {"vendor_response": "We offered a free redo session on the same day."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        dispute.refresh_from_db()
        self.assertEqual(dispute.vendor_response, "We offered a free redo session on the same day.")
        self.assertEqual(dispute.status, "Under Review")

