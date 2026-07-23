"""
Tests for the accounts app.

Organised into three layers, mirroring the app's own architecture:
    - Model tests: field constraints / model-level behaviour.
    - Service tests: business logic in isolation from HTTP.
    - API tests: full request/response cycle through DRF views.
"""

from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from django.test import TestCase

from core.exceptions import ApplicationError
from .models import Address, EmailVerificationToken, PasswordResetToken, User
from .services import AddressService, AdminUserService, AuthService


class UserModelTests(TestCase):
    """Tests for the custom User model and its manager."""

    def test_create_user_normalizes_email_and_hashes_password(self):
        user = User.objects.create_user(
            email="Jane.Doe@Example.com",
            password="StrongPass1!",
            first_name="Jane",
            last_name="Doe",
        )
        self.assertEqual(user.email, "Jane.Doe@example.com")
        self.assertTrue(user.check_password("StrongPass1!"))
        self.assertNotEqual(user.password, "StrongPass1!")
        self.assertEqual(user.role, User.Role.CUSTOMER)

    def test_create_superuser_sets_admin_flags(self):
        admin = User.objects.create_superuser(
            email="admin@example.com", password="StrongPass1!", first_name="Admin", last_name="User"
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertEqual(admin.role, User.Role.ADMIN)

    def test_get_full_name(self):
        user = User(first_name="Jane", last_name="Doe")
        self.assertEqual(user.get_full_name(), "Jane Doe")


class AddressModelTests(TestCase):
    """Tests for the Address model and its default-address invariant."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="user@example.com", password="StrongPass1!", first_name="A", last_name="B"
        )

    def test_only_one_default_address_per_type(self):
        addr1 = Address.objects.create(
            user=self.user, address_type=Address.AddressType.SHIPPING, full_name="A B",
            phone_number="+911234567890", line1="123 St", city="City", state="State",
            postal_code="12345", country="India", is_default=True,
        )
        addr2 = Address.objects.create(
            user=self.user, address_type=Address.AddressType.SHIPPING, full_name="A B",
            phone_number="+911234567890", line1="456 St", city="City", state="State",
            postal_code="12345", country="India", is_default=True,
        )
        addr1.refresh_from_db()
        addr2.refresh_from_db()
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)


class AuthServiceTests(TestCase):
    """Tests for AuthService business logic, independent of HTTP."""

    def test_register_creates_user_and_verification_token(self):
        user = AuthService.register(
            email="new@example.com", password="StrongPass1!", first_name="New", last_name="User"
        )
        self.assertFalse(user.is_email_verified)
        self.assertTrue(EmailVerificationToken.objects.filter(user=user).exists())

    def test_verify_email_with_valid_token(self):
        user = AuthService.register(
            email="verify@example.com", password="StrongPass1!", first_name="V", last_name="U"
        )
        token = EmailVerificationToken.objects.get(user=user)
        verified_user = AuthService.verify_email(token=str(token.token))
        self.assertTrue(verified_user.is_email_verified)

    def test_verify_email_with_expired_token_raises(self):
        user = AuthService.register(
            email="expired@example.com", password="StrongPass1!", first_name="E", last_name="U"
        )
        token = EmailVerificationToken.objects.get(user=user)
        token.expires_at = timezone.now() - timedelta(hours=1)
        token.save()

        with self.assertRaises(ApplicationError):
            AuthService.verify_email(token=str(token.token))

    def test_reset_password_with_valid_token(self):
        user = User.objects.create_user(
            email="reset@example.com", password="OldPass1!", first_name="R", last_name="U"
        )
        AuthService.request_password_reset(email=user.email)
        token = PasswordResetToken.objects.get(user=user)

        AuthService.reset_password(token=str(token.token), new_password="NewPass1!")

        user.refresh_from_db()
        self.assertTrue(user.check_password("NewPass1!"))

    def test_request_password_reset_for_unknown_email_does_not_raise(self):
        # Should silently no-op (prevents user enumeration), not raise.
        AuthService.request_password_reset(email="doesnotexist@example.com")

    def test_change_password_with_wrong_old_password_raises(self):
        user = User.objects.create_user(
            email="change@example.com", password="OldPass1!", first_name="C", last_name="U"
        )
        with self.assertRaises(ApplicationError):
            AuthService.change_password(user=user, old_password="WrongPass1!", new_password="NewPass1!")


class AddressServiceTests(TestCase):
    """Tests for AddressService business logic."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="addr@example.com", password="StrongPass1!", first_name="A", last_name="B"
        )

    def test_delete_default_address_promotes_fallback(self):
        addr1 = Address.objects.create(
            user=self.user, address_type=Address.AddressType.SHIPPING, full_name="A B",
            phone_number="+911234567890", line1="1 St", city="City", state="State",
            postal_code="12345", country="India", is_default=True,
        )
        addr2 = Address.objects.create(
            user=self.user, address_type=Address.AddressType.SHIPPING, full_name="A B",
            phone_number="+911234567890", line1="2 St", city="City", state="State",
            postal_code="12345", country="India", is_default=False,
        )

        AddressService.delete_address(address=addr1)

        addr2.refresh_from_db()
        self.assertTrue(addr2.is_default)


class AuthAPITests(APITestCase):
    """End-to-end tests for the authentication API endpoints."""

    def setUp(self):
        self.register_url = reverse("accounts:register")
        self.login_url = reverse("accounts:login")
        self.profile_url = reverse("accounts:profile")

    def test_register_success(self):
        payload = {
            "email": "apitest@example.com",
            "first_name": "Api",
            "last_name": "Test",
            "password": "StrongPass1!",
            "password_confirm": "StrongPass1!",
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="apitest@example.com").exists())

    def test_register_with_mismatched_passwords_fails(self):
        payload = {
            "email": "mismatch@example.com",
            "first_name": "A",
            "last_name": "B",
            "password": "StrongPass1!",
            "password_confirm": "Different1!",
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_with_duplicate_email_fails(self):
        User.objects.create_user(email="dupe@example.com", password="StrongPass1!", first_name="A", last_name="B")
        payload = {
            "email": "dupe@example.com",
            "first_name": "A",
            "last_name": "B",
            "password": "StrongPass1!",
            "password_confirm": "StrongPass1!",
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success_returns_tokens(self):
        User.objects.create_user(email="login@example.com", password="StrongPass1!", first_name="A", last_name="B")
        response = self.client.post(self.login_url, {"email": "login@example.com", "password": "StrongPass1!"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

    def test_login_with_wrong_password_fails(self):
        User.objects.create_user(email="login2@example.com", password="StrongPass1!", first_name="A", last_name="B")
        response = self.client.post(self.login_url, {"email": "login2@example.com", "password": "WrongPass1!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_disabled_account_shows_specific_message(self):
        user = User.objects.create_user(
            email="disabled@example.com", password="StrongPass1!", first_name="A", last_name="B"
        )
        user.is_active = False
        user.save()

        response = self.client.post(self.login_url, {"email": "disabled@example.com", "password": "StrongPass1!"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("disabled", str(response.data).lower())

    def test_login_with_wrong_password_on_disabled_account_stays_generic(self):
        # A disabled account with the WRONG password should not confirm
        # "this account is disabled" — that would leak account-disabled
        # status to someone who doesn't actually know the password.
        user = User.objects.create_user(
            email="disabled2@example.com", password="StrongPass1!", first_name="A", last_name="B"
        )
        user.is_active = False
        user.save()

        response = self.client.post(self.login_url, {"email": "disabled2@example.com", "password": "WrongPassword1!"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("disabled", str(response.data).lower())

    def test_profile_requires_authentication(self):
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_returns_authenticated_user(self):
        user = User.objects.create_user(
            email="profile@example.com", password="StrongPass1!", first_name="A", last_name="B"
        )
        self.client.force_authenticate(user=user)
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "profile@example.com")


class AddressAPITests(APITestCase):
    """End-to-end tests for the address management API endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="addrapi@example.com", password="StrongPass1!", first_name="A", last_name="B"
        )
        self.other_user = User.objects.create_user(
            email="other@example.com", password="StrongPass1!", first_name="C", last_name="D"
        )
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("accounts:address-list-create")

    def _create_address(self, user, is_default=False):
        return Address.objects.create(
            user=user, address_type=Address.AddressType.SHIPPING, full_name="A B",
            phone_number="+911234567890", line1="1 St", city="City", state="State",
            postal_code="12345", country="India", is_default=is_default,
        )

    def test_create_address(self):
        payload = {
            "address_type": "SHIPPING", "full_name": "A B", "phone_number": "+911234567890",
            "line1": "1 St", "city": "City", "state": "State", "postal_code": "12345", "country": "India",
        }
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_only_returns_own_addresses(self):
        self._create_address(self.user)
        self._create_address(self.other_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data["count"], 1)

    def test_cannot_access_another_users_address(self):
        other_address = self._create_address(self.other_user)
        url = reverse("accounts:address-detail", args=[other_address.id])
        response = self.client.get(url)
        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))


class AdminCustomerManagementAPITests(APITestCase):
    """Tests for the Admin Dashboard's 'Manage Customers' endpoints."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password="StrongPass1!", first_name="Ad", last_name="Min"
        )
        self.customer = User.objects.create_user(
            email="customer@example.com", password="StrongPass1!", first_name="Cus", last_name="Tomer"
        )

    def test_non_admin_cannot_list_customers(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(reverse("accounts:admin-customer-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_customers(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("accounts:admin-customer-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)  # admin itself is role=ADMIN, excluded from the customer list

    def test_admin_can_view_customer_detail_with_order_count(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("accounts:admin-customer-detail", args=[self.customer.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["order_count"], 0)

    def test_admin_can_deactivate_customer(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            reverse("accounts:admin-customer-set-active", args=[self.customer.id]), {"is_active": False}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_active)

    def test_deactivated_customer_cannot_authenticate(self):
        AdminUserService.set_active(user=self.customer, is_active=False)
        response = self.client.post(
            reverse("accounts:login"), {"email": "customer@example.com", "password": "StrongPass1!"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
