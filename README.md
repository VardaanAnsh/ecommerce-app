# E-Commerce Web Application

A full-stack-style e-commerce web application built using Node.js, Express.js, MongoDB, Mongoose and EJS. The application uses server-side rendered EJS pages and provides authentication, product management, cart management, delivery address management, checkout and order management.

## Features

### Authentication & Authorization
- User signup and login
- Password hashing using bcrypt
- JWT-based authentication using HTTP-only cookies
- Session-based flash messages
- Role-based authorization for owner/admin operations

### Products
- Product listing and shop page
- Owner-only product creation
- Product image upload using Multer
- Product images stored in MongoDB
- Product pricing with per-unit discounts
- Joi validation for product data

### Shopping Cart
- Add products to cart
- Increase/decrease product quantity
- Remove products from cart
- Per-unit discount calculation
- Platform fee calculation
- Server-side quantity validation
- Automatic removal of deleted/unavailable products from cart

### Address Management
- Add multiple delivery addresses
- Home, Office and Other address types
- Set a default address
- Edit saved addresses
- Delete saved addresses
- Automatic default-address handling
- Joi validation for address data

### Checkout
- Select saved delivery address
- Server-side order total calculation
- Server-side validation of address ID
- Server-side validation of cart quantities
- Detection of unavailable/deleted products
- Per-unit discount calculation
- Platform fee calculation
- Duplicate-click protection while placing an order

### Orders
- Create orders from cart
- Order history
- Individual order details
- Order success page
- Order status
- Delivery address snapshot
- Product information snapshot
- Price breakdown
- Order status timeline

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **ODM:** Mongoose
- **Templating:** EJS
- **Authentication:** JWT, bcrypt
- **Validation:** Joi
- **File Uploads:** Multer
- **Sessions:** express-session
- **Flash Messages:** connect-flash
- **Frontend:** HTML, JavaScript, Tailwind CSS utility classes

## Project Structure

```text
config/          Database configuration
controllers/     Controller logic
middlewares/     Authentication and authorization
models/          Mongoose models
routes/          Application routes
utils/           Utility functions
validations/     Joi validation schemas
views/           EJS templates
public/          Static assets