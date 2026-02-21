# Bollywood Day Registration System

A web application for managing performer registrations for Bollywood Day events.

## Features

- 🎭 Performer registration (Dance, Singing, Acting)
- 🔐 Admin panel with authentication
- 📊 Data persistence with MongoDB
- 📥 Excel export functionality
- 🎨 Responsive web interface

## Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Omkar-R-Mundhe/Bollywood_day.git
   cd bollywood_day
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   JWT_SECRET=your-secure-jwt-secret
   ADMIN_PASSWORD=your-admin-password
   MONGODB_URI=mongodb://localhost:27017/bollywood-day
   PORT=3000
   ```

4. Start MongoDB (if running locally):
   ```bash
   mongod
   ```

5. Start the server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## Usage

### Public Registration
- Visit the homepage to register as a performer
- Fill in your details and select your act type

### Admin Panel
- Visit `/admin.html` or `/admin`
- Login with the admin password
- View all registrations
- Download data as Excel file

## Deployment

For production deployment, use a cloud MongoDB service like:
- MongoDB Atlas
- AWS DocumentDB
- Azure Cosmos DB

Update your `MONGODB_URI` environment variable with the connection string.

## API Endpoints

- `POST /api/register` - Register a performer
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/registrations` - Get all registrations (admin only)
- `GET /api/admin/download` - Download Excel file (admin only)

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcrypt
- **Data Export**: Excel (xlsx library)
- **Frontend**: HTML, CSS, JavaScript