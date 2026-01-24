# EduDesk Support Platform: System Workflow & Documentation

## 1. Project Overview
**EduDesk** is a professional, enterprise-grade ticketing and support platform designed to streamline communication between users (employees/clients) and specialized internal departments (HR, Finance, Technical Support, etc.). The system ensures that every request is tracked, prioritized, and resolved efficiently through a structured digital workflow.

---

## 2. User Roles & Access Control

### A. Public User (The Requester)
*   **Role**: Submits queries or issues to specific departments.
*   **Access**: Public portal (no login required for submission).
*   **Key Action**: Fills out the "Submit Ticket" form with their name, email, department, subject, and description.

### B. Department Staff (The Resolver)
*   **Role**: Subject matter experts who resolve assigned tickets.
*   **Access**: Authenticated Department Portal.
*   **Key Actions**:
    *   Manage assigned tickets.
    *   Update ticket status (In Progress, Resolved, etc.).
    *   Communicate with users via comments.
    *   Create **Internal Tickets** to request help from other departments.

### C. Department Head (The Administrator)
*   **Role**: Manages the department's overall workload and team performance.
*   **Access**: Authenticated Department Portal with administrative privileges.
*   **Key Actions**:
    *   Oversee all department tickets (unassigned and assigned).
    *   Assign/Re-assign tickets to staff members.
    *   Monitor real-time **Department Analytics** (SLA compliance, resolution trends).
    *   Review team performance metrics and staff efficiency.

---

## 3. Core Workflows

### Workflow 1: Ticket Submission (User Journey)
1.  **Access**: The user visits the public `/submit-ticket` landing page.
2.  **Entry**: User enters their contact information and selects a target department (e.g., HR, Technical Support).
3.  **Urgency**: User sets a priority level based on the issue's impact.
4.  **Submission**: Upon submission, the system generates a unique **Ticket ID** and sends a confirmation email to the user.
5.  **Tracking**: Users receive email updates whenever a staff member comments or changes the status of their ticket.

### Workflow 2: Ticket Management (Staff Journey)
1.  **Notification**: Staff members see new tickets in their dashboard if assigned, or in the "Unassigned" queue.
2.  **Engagement**: Staff changes the status to **IN_PROGRESS** to signal they are working on it.
3.  **Communication**: Staff can post comments/replies. They can also mark a ticket as **WAITING_FOR_USER** if more information is needed.
4.  **Resolution**: Once the issue is fixed, the staff member marks the ticket as **RESOLVED**.

### Workflow 3: Management & Oversight (Department Head Journey)
1.  **Dashboard Overview**: The Head sees a high-level view of all tickets, breakdown by priority, and status.
2.  **SLA Monitoring**: Real-time tracking of Service Level Agreement (SLA) compliance (e.g., target 24h resolution).
3.  **Team Assignment**: The Head ensures no ticket remains unassigned by manually delegating tasks to specific staff members.
4.  **Reporting**: Exporting comprehensive PDF reports of department performance for executive review.

### Workflow 4: Internal/Cross-Department Support
1.  **Scenario**: A staff member in Finance needs help from Technical Support (e.g., "Need VPN access").
2.  **Action**: Instead of leaving the platform, the staff member uses the **"Create Internal Ticket"** feature.
3.  **Logic**: This creates a new ticket targeting the Tech Support department, linked to the staff member's internal profile.

---

## 4. Specialized Department Dashboards

The platform features "Live" dashboards that provide department-specific metrics:

### HR Department Dashboard
*   **Onboarding Tracker**: Tracks active employee onboarding tickets and background check statuses.
*   **Policy Compliance**: Real-time percentage of staff compliance with corporate policies.
*   **Wellness Index**: Displays internal engagement and wellness scores based on staff feedback trends.

### Technical Support Dashboard
*   **System Uptime**: Real-time monitor of server/cluster health and 24-hour uptime history.
*   **Infrastructure Load**: Live monitoring of CPU, Memory, and Storage utilization across the IT infrastructure.
*   **Security Posture**: Tracks security grades, SSL status, and upcoming audit dates.

---

## 5. Technology Stack
*   **Backend**: Node.js, Express.js (REST API).
*   **Frontend**: React, Vite, Tailwind CSS, Shadcn UI (Modern, responsive design).
*   **Database**: MongoDB (Scalable NoSQL storage).
*   **Authentication**: JWT-based secure session management with OTP (One-Time Password) verification.
*   **Visuals**: Lucid Icons, Recharts (Dynamic data visualization), Framer Motion (Smooth UI transitions).
