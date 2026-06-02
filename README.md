# Web Application Development Project

A full-stack forum web application with role-based access control for three user roles: **Admin**, **Moderator**, and **User**. The backend is built with Node.js + Express and MySQL, while the frontend is served as static HTML/CSS/JS through a Spring Boot wrapper.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js, Express 5 |
| Database | MySQL (via `mysql2`) |
| Password Hashing | bcrypt |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Static File Server | Spring Boot (Spring MVC) |
| Build Tool (Java) | Maven |

---

## Project Structure

```
WEB_PROJECT_1/
│
├── .github/
├── node_modules/
│
├── web/
│   │
│   ├── .mvn/
│   ├── .vscode/
│   │
│   ├── src/
│   │   │
│   │   ├── main/
│   │   │   │
│   │   │   ├── java/
│   │   │   │
│   │   │   ├── resources/
│   │   │   │   │
│   │   │   │   ├── static/
│   │   │   │   │   │
│   │   │   │   │   ├── backend/
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── config/
│   │   │   │   │   │   │   └── database.js
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── middleware/
│   │   │   │   │   │   │   ├── authentication.js
│   │   │   │   │   │   │   ├── errorHandler.js
│   │   │   │   │   │   │   └── validation.js
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── routes/
│   │   │   │   │   │   │   ├── adminRoutes.js
│   │   │   │   │   │   │   ├── modRoutes.js
│   │   │   │   │   │   │   ├── reportRoutes.js
│   │   │   │   │   │   │   └── userRoutes.js
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── utils/
│   │   │   │   │   │   │   ├── dbHelper.js
│   │   │   │   │   │   │   └── helpers.js
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── .env
│   │   │   │   │   │   ├── db.js
│   │   │   │   │   │   └── server.js
│   │   │   │   │   │
│   │   │   │   │   ├── frontend/
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── admin/
│   │   │   │   │   │   │   │
│   │   │   │   │   │   │   ├── css/
│   │   │   │   │   │   │   │
│   │   │   │   │   │   │   ├── js/
│   │   │   │   │   │   │   │   ├── ad_system_settings.js
│   │   │   │   │   │   │   │   ├── admin_profile.js
│   │   │   │   │   │   │   │   └── manage_mods.js
│   │   │   │   │   │   │   │
│   │   │   │   │   │   │   ├── admin_profile.html
│   │   │   │   │   │   │   ├── manage_mods.html
│   │   │   │   │   │   │   └── system_settings.html
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── mod/
│   │   │   │   │   │   │   │
│   │   │   │   │   │   │   ├── css/
│   │   │   │   │   │   │   │
│   │   │   │   │   │   │   ├── js/
│   │   │   │   │   │   │   │   ├── ban_history.js
│   │   │   │   │   │   │   │   ├── mod_manage_users.js
│   │   │   │   │   │   │   │   ├── mod_messages.js
│   │   │   │   │   │   │   │   ├── mod_profile.js
│   │   │   │   │   │   │   │   ├── mod_reports.js
│   │   │   │   │   │   │   │   └── mod_threads.js
│   │   │   │   │   │   │   │
│   │   │   │   │   │   │   ├── ban_history.html
│   │   │   │   │   │   │   ├── manage_users.html
│   │   │   │   │   │   │   ├── mod_messages.html
│   │   │   │   │   │   │   ├── mod_profile.html
│   │   │   │   │   │   │   ├── mod_reports.html
│   │   │   │   │   │   │   └── mod_threads.html
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── user/
│   │   │   │   │   │   │   │
│   │   │   │   │   │   │   ├── css/
│   │   │   │   │   │   │   │
│   │   │   │   │   │   │   ├── js/
│   │   │   │   │   │   │   │   ├── user_messages.js
│   │   │   │   │   │   │   │   ├── user_notifications.js
│   │   │   │   │   │   │   │   ├── user_profile.js
│   │   │   │   │   │   │   │   ├── user_subscribes.js
│   │   │   │   │   │   │   │   └── user_threads.js
│   │   │   │   │   │   │   │
│   │   │   │   │   │   │   ├── user_messages.html
│   │   │   │   │   │   │   ├── user_notifications.html
│   │   │   │   │   │   │   ├── user_profile.html
│   │   │   │   │   │   │   ├── user_subscribes.html
│   │   │   │   │   │   │   └── user_threads.html
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── js/
│   │   │   │   │   │   │   ├── common.js
│   │   │   │   │   │   │   ├── login.js
│   │   │   │   │   │   │   ├── page_router.js
│   │   │   │   │   │   │   ├── report.js
│   │   │   │   │   │   │   └── sign_up.js
│   │   │   │   │   │   │
│   │   │   │   │   │   ├── index.html
│   │   │   │   │   │   ├── login.html
│   │   │   │   │   │   └── sign_up.html
│   │   │   │   │   │
│   │   │   │   │   ├── templates/
│   │   │   │   │   │
│   │   │   │   │   └── application.properties
│   │   │   │
│   │   │   └── test/
│   │   │       └── java/com/example/web/
│   │   │           └── WebApplicationTests.java
│   │
│   ├── target/
│   │
│   ├── .env
│   ├── .env.example
│   ├── .gitattributes
│   ├── .gitignore
│   ├── HELP.md
│   ├── mvnw
│   ├── mvnw.cmd
│   ├── pom.xml
│   ├── test-config.js
│   ├── package-lock.json
│   ├── package.json
│   └── README.md
```

---

## Features

### Authentication
- User registration with email, username, first/last name, gender, date of birth, and avatar
- Login with email and password (bcrypt-hashed)
- Role detection on login: **Admin**, **Moderator**, or **User**
- Ban check — banned accounts are rejected at login

### User Role
- View and update profile (username, name, gender, date of birth, avatar)
- Browse forum categories and threads
- Post and view messages
- Manage notifications
- Subscribe to threads
- Direct messaging with other users

### Moderator Role
- All user features
- Create and manage threads
- Moderate messages (soft-delete)
- Manage users (ban/unban)
- View ban history

### Admin Role
- All moderator features
- Manage moderators (add/remove)
- View and update system settings
- Full profile management

---

## Prerequisites

- **Node.js** v18+
- **Java** 17
- **MySQL** 8+
- **Maven** 3.8+

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Web-Application-Development-Project.git
cd Web-Application-Development-Project
```

### 2. Set up the database

Create a MySQL database named `forumdb` and import your schema. Then update the connection settings in `web/src/main/resources/static/backend/db.js`:

```js
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "your_password",
  database: "forumdb",
});
```

### 3. Install Node.js dependencies

```bash
npm install
```

### 4. Start the backend server

```bash
node web/src/main/resources/static/backend/server.js
```

The API will be available at `http://localhost:3000`.

### 5. Start the Spring Boot frontend server (optional)

```bash
cd web
./mvnw spring-boot:run
```

This serves the static frontend through Spring Boot on its default port (`8080`).

---

## API Overview

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/login` | Authenticate and get role-based user info |
| POST | `/signup` | Register a new user account |

### Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | List all users |
| GET | `/users/:id` | Get user by ID |
| PUT | `/users/:id` | Update user profile |

### Moderators

| Method | Endpoint | Description |
|---|---|---|
| GET | `/moderators/:id` | Get moderator profile |
| PUT | `/moderators/:id` | Update moderator profile |
| POST | `/threads` | Create a thread |
| PUT | `/threads/:id` | Edit a thread |
| DELETE | `/threads/:id` | Soft-delete a thread |
| POST | `/bans` | Ban a user |
| DELETE | `/bans/:id` | Unban a user |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admins/:id` | Get admin profile |
| PUT | `/admins/:id` | Update admin profile |
| GET | `/manages` | List all moderators |
| DELETE | `/manages/:mod_id` | Remove a moderator |
| GET | `/system-settings` | Get system settings |
| PUT | `/system-settings` | Update a system setting |

### Forum

| Method | Endpoint | Description |
|---|---|---|
| GET | `/categories` | List all categories |
| GET | `/threads` | List all active threads |
| GET | `/messages` | List all messages with author info |

---

## Notes

- Passwords are hashed with **bcrypt** (salt rounds: 10).
- Soft-delete is used for threads and messages (`is_deleted` flag).
- Avatar data is stored as a base64 string.
- The Express server accepts JSON payloads up to **10 MB** to support avatar uploads.
- There is no JWT/session middleware; role-based access is managed client-side using data returned from `/login`.
