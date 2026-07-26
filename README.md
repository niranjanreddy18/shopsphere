# ShopSphere

## Project Description

ShopSphere is a full-stack e-commerce application built with Django REST Framework on the backend and React + Vite on the frontend. It provides a complete shopping experience with user authentication, product browsing, cart management, checkout, payments, order tracking, and an administrative dashboard for managing store data.

The project is structured as a portfolio-ready web application that demonstrates modern frontend architecture, REST API development, secure authentication, and payment integration in a realistic e-commerce workflow.

## Features

- User registration, login, password reset, and email verification
- Product catalog with search, filtering, categories, and product detail pages
- Guest cart and authenticated cart experience
- Wishlist management
- Checkout flow with order creation and summary review
- Stripe-based payment initiation and order payment handling
- Order history, order detail, and order success flow
- Admin dashboard for analytics, products, categories, brands, orders, coupons, reviews, and customers
- API documentation with Swagger and Redoc

## Tech Stack

### Frontend
- React
- Vite
- Redux Toolkit
- React Router
- Tailwind CSS
- Axios

### Backend
- Django
- Django REST Framework
- Django REST Auth-style JWT flow
- drf-spectacular

### Database
- PostgreSQL

### Authentication
- JWT-based authentication
- Role-based access control

### Payments
- Stripe integration

### Deployment
- Docker and Docker Compose support
- Nginx for frontend serving

## Project Architecture

The frontend is a React single-page application that communicates with a Django REST API over HTTP. The backend exposes REST endpoints for authentication, products, cart, orders, payments, and admin operations. Redux manages shared state on the frontend, while the backend handles business logic, validation, permissions, and persistence.

## Folder Structure

```text
backend/      # Django REST API
frontend/     # React/Vite client
config/       # Project-level configuration files
```

## Installation

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

## Environment Variables

Create local environment files using the example files provided in the repository.

### Backend
- DJANGO_SETTINGS_MODULE
- DJANGO_SECRET_KEY
- DEBUG
- ALLOWED_HOSTS
- DB_NAME
- DB_USER
- DB_PASSWORD
- DB_HOST
- DB_PORT
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET

### Frontend
- VITE_API_BASE_URL
- VITE_FRONTEND_BASE_URL
- VITE_STRIPE_PUBLISHABLE_KEY

## Running the Project

### Backend

```bash
cd backend
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm run dev
```

## API Overview

The backend exposes grouped API endpoints for:
- Authentication and user accounts
- Products and categories
- Cart and wishlist
- Orders and checkout
- Payments and webhooks
- Reviews and notifications
- Admin analytics and management

API documentation is available through Swagger and Redoc when the backend is running.

## Screenshots

- Homepage
- Product listing
- Cart and checkout
- Admin dashboard
- Order payment flow

## Future Improvements

- Add a more complete checkout experience with shipping calculations and tax rules
- Expand admin reporting and inventory workflows
- Improve test coverage across payment and order flows
- Add CI/CD deployment automation for production environments
- Improve performance with more advanced caching and optimization strategies

## License

This project is licensed under the MIT License.
