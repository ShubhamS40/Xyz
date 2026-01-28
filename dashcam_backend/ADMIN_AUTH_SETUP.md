# Admin Authentication Setup Guide

This document explains how to set up and use the admin authentication system with OTP verification.

## Features

- Admin Registration with email verification via OTP
- Admin Login with OTP verification
- JWT-based authentication for protected routes
- Secure password hashing using bcrypt
- Email OTP sending using nodemailer

## Database Migration

After updating the Prisma schema, run the migration:

```bash
cd dashcam_backend
npx prisma migrate dev --name add_admin_registration_otp
```

Or if you prefer to generate the migration without applying:

```bash
npx prisma migrate dev --create-only --name add_admin_registration_otp
```

Then apply the migration:

```bash
npx prisma migrate deploy
```

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/dashcam_db

# Server
PORT=5000
TCP_PORT=21100

# JWT Secret (change this to a strong random string in production)
JWT_SECRET=your-secret-key-change-in-production

# Email Configuration (for OTP sending)
# Gmail example:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# For other SMTP providers, adjust accordingly:
# SMTP_HOST=smtp.your-provider.com
# SMTP_PORT=587 or 465
# SMTP_SECURE=true (for port 465) or false (for port 587)
```

### Gmail Setup

If using Gmail:
1. Enable 2-factor authentication on your Google account
2. Generate an "App Password" from Google Account settings
3. Use the app password as `SMTP_PASS`

### Other Email Providers

For other providers (SendGrid, Mailgun, etc.), adjust the SMTP configuration accordingly.

## Installation

Install the required npm packages:

```bash
cd dashcam_backend
npm install bcrypt nodemailer jsonwebtoken
# or
pnpm install bcrypt nodemailer jsonwebtoken
```

## API Endpoints

### Registration

**POST** `/api/admin/register`
- Body: `{ "email": "admin@example.com", "password": "password123" }`
- Response: Sends OTP to email

### Verify Registration OTP

**POST** `/api/admin/verify-registration-otp`
- Body: `{ "email": "admin@example.com", "otp": "123456" }`
- Response: Returns JWT token and admin data

### Resend Registration OTP

**POST** `/api/admin/resend-registration-otp`
- Body: `{ "email": "admin@example.com" }`

### Login

**POST** `/api/admin/login`
- Body: `{ "email": "admin@example.com", "password": "password123" }`
- Response: Sends OTP to email

### Verify Login OTP

**POST** `/api/admin/verify-login-otp`
- Body: `{ "email": "admin@example.com", "otp": "123456" }`
- Response: Returns JWT token and admin data

### Resend Login OTP

**POST** `/api/admin/resend-login-otp`
- Body: `{ "email": "admin@example.com" }`

### Get Profile (Protected)

**GET** `/api/admin/profile`
- Headers: `Authorization: Bearer <token>`
- Response: Admin profile data

## Frontend Routes

### Registration Flow
1. `/admin/register` - Registration form
2. `/admin/register/verify-otp?email=...` - OTP verification page
3. After verification, redirects to `/admin/dashboard`

### Login Flow
1. `/admin/login` - Login form
2. `/admin/login/verify-otp?email=...` - OTP verification page
3. After verification, redirects to `/admin/dashboard`

## Token Storage

The frontend stores the JWT token in `localStorage`:
- Key: `adminToken`
- Also stores: `adminEmail`

To use the token in API calls:
```javascript
const token = localStorage.getItem('adminToken');
fetch('/api/admin/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Security Notes

1. **Change JWT_SECRET**: Use a strong, random secret key in production
2. **HTTPS**: Always use HTTPS in production
3. **Password Requirements**: Consider adding stronger password requirements
4. **Rate Limiting**: Consider adding rate limiting to prevent brute force attacks
5. **Email Verification**: Email verification is required before account activation
6. **OTP Expiry**: OTPs expire after 10 minutes

## Troubleshooting

### Email Not Sending

1. Check SMTP configuration in `.env`
2. Verify email credentials are correct
3. For Gmail, ensure app password is used (not regular password)
4. Check server logs for email service errors

### OTP Expired

- OTPs expire after 10 minutes
- Use the resend OTP endpoint to get a new OTP

### Database Errors

- Ensure Prisma migration has been run
- Check database connection string
- Verify database user has proper permissions
