# Nexus Institute Coaching Management System - PRD

## Problem Statement
Full-stack Institute Coaching Management System with modern UI/UX, 4 user roles (Super Admin, Admin, Faculty, Student), course management, attendance, assignments, fees with PDF receipts, file storage, notifications, analytics, and CSV export.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Phosphor Icons
- **Backend**: FastAPI (Python) + MongoDB (Motor async driver)
- **Auth**: Email/Password (JWT + bcrypt) + Emergent Google OAuth + Microsoft OAuth (placeholder)
- **Storage**: Emergent Object Storage for file uploads
- **PDF**: ReportLab for fee receipt generation
- **Email**: SendGrid (MOCKED - structure ready, needs API key)
- **Design**: Swiss/High-Contrast Brutalist (Outfit + IBM Plex Sans fonts)

## User Personas
1. **Super Admin**: Full system access, institute settings, branding
2. **Admin**: Manage students/faculty, courses, batches, fees
3. **Faculty**: Upload materials, mark attendance, create/grade assignments
4. **Student**: View courses, submit assignments, track attendance/fees

## Core Requirements
- Role-based access control (RBAC) with 4 tiers
- Course & batch management with enrollment
- Attendance marking & reporting
- Assignment creation, submission, grading
- Fee tracking with installment support & PDF receipts
- File upload/download (course materials, assignments)
- Dark/light theme toggle
- Analytics dashboard (revenue, enrollment, attendance charts)
- CSV export (students, fees)
- Notification system

## What's Been Implemented (April 2026)
- [x] Email/Password authentication with JWT
- [x] Google OAuth via Emergent Auth
- [x] Microsoft OAuth placeholder (501)
- [x] Role-based dashboards (4 roles)
- [x] Course CRUD
- [x] Batch management with faculty assignment
- [x] Student enrollment
- [x] Attendance marking (present/absent)
- [x] Assignment creation, submission, grading
- [x] Fee management with payment recording
- [x] PDF receipt generation
- [x] File upload/download via Emergent Object Storage
- [x] Notification system
- [x] Institute settings (branding, colors)
- [x] Analytics (revenue, enrollment, attendance charts)
- [x] CSV export (students, fees)
- [x] Dark/light theme toggle
- [x] Responsive design
- [x] 36/36 backend tests passing

## Prioritized Backlog

### P0 (Critical - Done)
- All core features implemented and tested

### P1 (High)
- Configure SendGrid API key for live email notifications
- Microsoft Azure AD OAuth integration
- Password reset flow
- Brute force protection for login
- File preview (PDF, images) in browser

### P2 (Medium)
- Student progress tracking with completion percentage
- Batch-wise performance reports
- Email templates for fee reminders, assignment alerts
- SMS integration via Twilio
- Installment scheduling with auto-reminders
- Mobile-optimized touch interactions

### P3 (Low)
- API documentation (Swagger)
- Bulk student import from CSV
- Custom PDF receipt templates
- Report scheduling (weekly/monthly emails)
- Student communication channel (chat)

## Next Tasks
1. Configure SendGrid for live email notifications
2. Add Microsoft Azure AD OAuth
3. Add password reset flow
4. Add file preview capability
5. Add student progress tracking
