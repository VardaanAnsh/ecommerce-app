# E-Commerce Web Application

A full-stack e-commerce application built with **Node.js, Express.js, MongoDB, and EJS**, with a focus on backend architecture, authentication, validation, containerization, load balancing, and shared infrastructure.

The application supports the complete shopping flow — from user authentication and product management to cart management, address management, checkout, and order tracking.

It is also deployed as a **multi-container backend architecture using Docker Compose**, with **Nginx acting as a reverse proxy/load balancer** and **Redis providing shared session storage and caching**.

## Architecture

```text
                         Client
                           │
                           ▼
                    ┌─────────────┐
                    │    Nginx    │
                    │ Reverse     │
                    │ Proxy / LB  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           ┌──────┐     ┌──────┐     ┌──────┐
           │ App1 │     │ App2 │     │ App3 │
           │ :5000│     │ :5000│     │ :5000│
           └───┬──┘     └───┬──┘     └───┬──┘
               │            │            │
               └────────────┼────────────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
          ┌─────────────┐       ┌─────────────┐
          │   MongoDB   │       │    Redis    │
          │ Persistent  │       │   Sessions  │
          │   Data      │       │   + Cache   │
          └─────────────┘       └─────────────┘
```

### Request Flow

```text
Browser / Postman
       │
       ▼
localhost:80
       │
       ▼
Nginx
       │
       ├──► app1:5000
       ├──► app2:5000
       └──► app3:5000
                │
                ├──► MongoDB
                └──► Redis
```

The three Express instances run from the same application image. Nginx distributes incoming requests across the available application instances.

Redis is shared between all instances, which is important when requests are distributed across different containers.

## Features

### Authentication & Authorization

* User registration and login
* Password hashing using bcrypt
* JWT-based authentication
* HTTP-only authentication cookies
* JWT expiration
* Express sessions
* Redis-backed session storage
* Flash messages shared across application instances
* Role-based authorization for owner/admin operations

### Product Management

* Product creation for authorized owners
* Product image uploads using Multer
* Product images stored as MongoDB buffers
* Product pricing and discounts
* Joi-based product validation
* Product listing and shop page

### Shopping Cart

* Add products to cart
* Increase/decrease quantity
* Remove products from cart
* Server-side quantity validation
* Per-unit discount calculation
* Platform fee calculation
* Detection and removal of unavailable products

### Address Management

* Multiple saved delivery addresses
* Home, Office and Other address types
* Default address selection
* Edit addresses
* Delete addresses
* Default-address handling
* Joi validation

### Checkout

* Select delivery address
* Server-side cart validation
* Server-side quantity validation
* Server-side order total calculation
* Product availability validation
* Discount calculation
* Platform fee calculation
* Duplicate-click protection
* Cart clearing after successful order creation

### Orders

* Create orders from cart
* Order history
* Individual order details
* Order status
* Delivery address snapshot
* Product information snapshot
* Price breakdown
* Order status timeline

---

## Backend Architecture

The application follows a modular Express structure rather than keeping all application logic inside a single server file.

```text
ecommerce-app/
│
├── config/
│   ├── mongoose-connection.js
│   ├── multer-config.js
│   └── redis.js
│
├── controllers/
│
├── middlewares/
│   ├── isLoggedIn.js
│   └── isOwner.js
│
├── models/
│   ├── user-model.js
│   ├── product-model.js
│   └── order-model.js
│
├── routes/
│   ├── index.js
│   ├── usersRouter.js
│   ├── ownersRouter.js
│   ├── productsRouter.js
│   └── addressesRouter.js
│
├── utils/
├── validations/
├── views/
├── public/
│
├── app.js
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

Responsibilities are separated between:

* Routes
* Models
* Middleware
* Validation
* Configuration
* Views
* Utility functions

---

## Dockerized Deployment

The application is containerized using Docker.

Docker Compose runs:

```text
3 × Express application containers
1 × Nginx container
1 × MongoDB container
1 × Redis container
```

Each application instance runs the same Node.js application image:

```text
app1
app2
app3
```

Nginx exposes port `80` and forwards requests to the application instances running internally on port `5000`.

MongoDB uses a Docker volume for persistent database storage.

Redis provides shared infrastructure between the application instances.

---

## Nginx Load Balancing

Nginx acts as the entry point for incoming traffic.

```nginx
upstream backend {
    server app1:5000;
    server app2:5000;
    server app3:5000;
}
```

Instead of exposing every Express container directly to the client:

```text
Client
  │
  ▼
Nginx :80
  │
  ├──► app1
  ├──► app2
  └──► app3
```

This allows multiple application instances to serve requests behind a single public entry point.

The architecture was also tested under concurrent load using **Autocannon**.

---

## Redis

Redis is used for two important purposes.

### 1. Shared Express Sessions

Express sessions are stored using a Redis-backed session store:

```text
Express Instance 1 ──┐
Express Instance 2 ──┼──► Redis
Express Instance 3 ──┘
```

This prevents session state from being tied to a particular application container.

For example, a request that creates a flash message on `app1` can be followed by a redirected request handled by `app2` while still accessing the same session data.

### 2. Product Caching

The shop route uses Redis to cache product data.

```text
GET /shop
     │
     ▼
Redis
     │
     ├── Cache HIT ──► Render products
     │
     └── Cache MISS
             │
             ▼
          MongoDB
             │
             ▼
          Redis
             │
             ▼
          Render
```

The current product cache uses a short TTL and stores the product representation required by the shop page.

Caching was benchmarked against the database-backed implementation to understand the actual performance characteristics rather than assuming that adding Redis automatically improves latency.

---

## Authentication Flow

The application uses JWT authentication independently from the Express session system.

```text
Login
  │
  ▼
Validate credentials
  │
  ▼
Generate JWT
  │
  ▼
HTTP-only cookie
  │
  ▼
isLoggedIn middleware
  │
  ▼
Protected routes
```

JWTs are configured with an expiration time, while Redis-backed Express sessions are used for server-side session state such as flash messages.

This separates:

* **Authentication:** JWT
* **Server-side session state:** Express Session + Redis

---

## Validation & Security

The application performs validation on the server side instead of relying only on browser-side validation.

Implemented protections include:

* bcrypt password hashing
* JWT authentication
* HTTP-only cookies
* Role-based authorization
* Joi request validation
* MongoDB ObjectId validation
* Server-side cart quantity validation
* Server-side order total calculation
* Product availability checks
* Protected user-specific order access
* Duplicate checkout protection
* Environment variables for secrets and configuration

---

## Performance Testing

The application was tested using **Autocannon** with concurrent connections.

Testing was performed on the `/shop` endpoint under different configurations, including:

* Database-backed product retrieval
* Redis cache HIT scenarios
* Concurrent requests through the Nginx load balancer

The testing highlighted an important backend engineering principle:

> A cache is not automatically faster. Its effectiveness depends on the cost of the operation being replaced and the overhead introduced by serialization, network communication, and response size.

The `/shop` page currently includes product image data in the rendered response, making response size significant. This is an area identified for further architectural optimization.

---

## Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* EJS

### Authentication & Security

* JWT
* bcrypt
* HTTP-only cookies
* express-session
* connect-flash
* Redis

### Validation & Uploads

* Joi
* Multer

### Infrastructure

* Docker
* Docker Compose
* Nginx
* Redis
* MongoDB

### Testing / Performance

* Postman
* Autocannon

### Frontend

* EJS
* HTML
* JavaScript
* Tailwind CSS utility classes

---

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/VardaanAnsh/ecommerce-app.git
cd ecommerce-app
```

### 2. Configure environment variables

Create a `.env` file containing the required application secrets and MongoDB configuration.

Example:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_KEY=your_jwt_secret
EXPRESS_SESSION_SECRET=your_session_secret
```

Do not commit `.env` to the repository.

### 3. Start the Docker environment

```bash
docker compose up --build
```

The application can then be accessed through:

```text
http://localhost
```

Nginx receives traffic on port `80` and forwards it to the Express application instances.

---

## Future Improvements

Planned architectural improvements include:

* Dedicated image-serving architecture instead of embedding image data directly into HTML
* More granular Redis cache invalidation
* Product cache invalidation on product mutations
* More advanced Nginx configuration
* Health checks for application containers
* Production-grade object storage for product images
* Improved observability and structured logging
* CI/CD pipeline
* Further performance testing under higher concurrency

---

## Author

**Vardaan Gupta**

B.Tech — Electronics & Communication Engineering
Dr. B. R. Ambedkar National Institute of Technology, Jalandhar

GitHub: [VardaanAnsh](https://github.com/VardaanAnsh)
