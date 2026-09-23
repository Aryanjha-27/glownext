# GlowNext

GlowNext is a beauty-service marketplace. Django provides the database, admin panel, REST API, vendor verification, bookings, notifications, and payments. React provides the public user interface and reads data from the Django API.

## Project structure

```text
Glow_next_Project/
|-- api/                  REST API serializers, views, and routes
|-- customer/             Customer addresses, wishlists, and notifications
|-- frontend/             React + Vite public interface
|-- glownext/             Django project settings and root URLs
|-- media/                Uploaded images and service media
|-- store/                Categories, services, bookings, reviews, and store data
|-- userauth/             Custom user and profile models
|-- vendor/               Vendor profiles, verification, payouts, and vendor notifications
|-- manage.py              Django command-line entry point
|-- requirements.txt      Python dependencies
|-- .env                  Local secrets and database configuration
```

## Requirements

- Python 3.14 or a compatible Python version
- MySQL Server running locally
- Node.js and npm
- A virtual environment in `project/` or another Python virtual environment

The project uses MySQL exclusively. The database schema and data export are stored in `glownext.sql`; no SQLite database file is used.

## Environment setup

The project already uses `.env`. Keep real secrets out of Git.

```env
DB_ENGINE=django.db.backends.mysql
DB_NAME=glownext
DB_USER=root
DB_PASSWORD=your_database_password
DB_HOST=127.0.0.1
DB_PORT=3306

KHALTI_SECRET_KEY=your_khalti_secret_key
KHALTI_PUBLIC_KEY=your_khalti_public_key
KHALTI_BASE_URL=https://dev.khalti.com/api/v2/
WEBSITE_URL=http://localhost:8000
KHALTI_RETURN_URL=http://localhost:8000/api/payments/khalti/callback/
```

Create the MySQL database before migrating:

```sql
CREATE DATABASE glownext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Run the backend

From the project root on Windows PowerShell:

```powershell
.\project\Scripts\Activate.ps1
python manage.py migrate
python manage.py runserver
```

The Django server runs at `http://127.0.0.1:8000/`.

Useful pages:

- Admin: `http://127.0.0.1:8000/admin/`
- API test: `http://127.0.0.1:8000/api/test/`
- Services API: `http://127.0.0.1:8000/api/services/`
- Vendors API: `http://127.0.0.1:8000/api/vendors/`

Create an administrator if needed:

```powershell
python manage.py createsuperuser
```

## Run the frontend

Open a second terminal:

```powershell
Set-Location .\frontend
npm install
npm run dev
```

The React development server normally runs at `http://localhost:5173/`.

The frontend does not define the API. It makes browser requests to Django at `http://127.0.0.1:8000`.

## Vendor verification flow

1. A vendor record is created with `Pending` verification status.
2. The uploaded vendor document is visible in Django admin.
3. A staff user opens **Vendor** in the admin panel.
4. Select the vendor and run **Verify selected vendors**.
5. Django sets `is_verified`, `verification_status`, and `verified_at`.
6. Only verified vendors are returned by the public vendor API.
7. Only services belonging to verified vendors are returned publicly.
8. The service admin form only allows verified vendors.

If a vendor is not verified, `/api/vendors/` and `/api/services/` can correctly return an empty list.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/test/` | Check that Django is connected |
| GET | `/api/categories/` | List service categories |
| GET | `/api/services/` | List published services from verified vendors |
| GET | `/api/services/<slug>/` | Get one published service |
| GET | `/api/services/<slug>/reviews/` | List active reviews |
| GET | `/api/vendors/` | List verified vendors |
| GET | `/api/vendors/<slug>/` | Get one verified vendor |
| GET | `/api/vendors/pending/` | Staff-only pending vendor list with documents |
| POST | `/api/vendors/<id>/verify/` | Staff-only verify or reject a vendor |
| GET, POST | `/api/bookings/` | List or create bookings |
| GET, POST | `/api/wishlists/` | List or create store wishlists |
| GET | `/api/notifications/` | List store notifications |
| GET | `/api/customer/notifications/` | List customer notifications |
| GET | `/api/customer/address/` | List customer addresses |
| GET | `/api/customer/wishlist/` | List customer wishlists |
| GET | `/api/admin/dashboard/` | Return admin dashboard statistics |
| POST | `/api/payments/khalti/initiate/` | Start a Khalti payment |
| GET | `/api/payments/khalti/callback/` | Receive the Khalti callback |

## Validation commands

Backend:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python -m compileall api customer glownext store userauth vendor
```

Frontend:

```powershell
Set-Location .\frontend
npm run lint
npm run build
```

## Important notes

- Do not commit `.env` or real payment/database credentials.
- Uploaded files are served from `/media/` during local development.
- The Django development server must be running before the React page can load services or vendors.
- Public vendor and service results intentionally exclude unverified vendors.
- Read [CODE_GUIDE.md](CODE_GUIDE.md) for a file-by-file explanation.
