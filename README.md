# OJT Portal

OJT Portal is a Node.js and MongoDB academic operations platform for Pangasinan State University. It manages the complete On-the-Job Training workflow, including student registration, company applications, MOA processing, document repositories, coordinator review, announcements, and director approval.

## Requirements

- Node.js 18 or newer
- npm
- MongoDB local or hosted
- Docker Desktop is optional

The application source is located in `SIAupd (1)/SIAupd/SIA`.

## Architecture

OJT Portal uses a server-rendered MVC architecture:

```text
Browser
  -> Express routes and middleware
	  -> Mongoose models
		  -> MongoDB
	  -> EJS views and Bootstrap UI
	  -> Multer document uploads
```

### Main Components

- **Express.js:** HTTP server, routing, middleware, and error handling
- **EJS:** Server-rendered user interfaces
- **MongoDB/Mongoose:** Domain data and persistence
- **JWT and sessions:** Authentication and user sessions
- **Multer:** MOA, profile photo, requirement, and repository uploads
- **Bootstrap:** Responsive interface components
- **Docker Compose:** Application and MongoDB development environment

### User Roles

- **Students:** Manage profiles, companies, MOA requests, requirements, repositories, and announcements.
- **Coordinators:** Verify students, review applications, manage MOA workflows, oversee companies, and publish announcements.
- **Directors:** Review verified students and complete final MOA approvals.

## Quick Start on Windows

From the cloned repository directory:

```powershell
cd "SIAupd (1)\SIAupd\SIA"
npm install
```

Create a `.env` file in the application directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ojt_portal
JWT_SECRET=replace_with_a_long_random_value
SESSION_SECRET=replace_with_a_long_random_value
NODE_ENV=development
```

Start MongoDB, then run the application:

```powershell
npm start
```

For development with automatic restart:

```powershell
npm run dev
```

Open [http://localhost:3000/home](http://localhost:3000/home) in a browser.

## Docker Setup

From the application directory:

```powershell
docker compose up --build
```

Docker Compose starts the application at `http://localhost:3000` and MongoDB at port `27017`. Uploaded files are persisted through the `uploads` volume, and MongoDB data is stored in the `mongo_data` volume.

## Database

The application uses MongoDB with Mongoose models for:

- Users and student profiles
- Companies and company applications
- MOAs and MOA requests
- Repository and requirement files
- Announcements and activity logs

For a clean local dataset, use:

```powershell
npm run seed
```

The repository also includes data-import tooling:

```powershell
npm run import-data
```

Do not commit production database dumps, personal information, uploaded documents, or `.env` files.

## Project Design

The application is organized around clear responsibility boundaries:

```text
server.js
├── routes/                # Auth, student, coordinator, director, and API endpoints
├── models/                # Mongoose schemas and domain persistence
├── middleware/            # Authentication and upload concerns
├── views/                 # EJS pages grouped by role
├── public/                # CSS, JavaScript, and static assets
├── uploads/               # Runtime document storage
└── requirement_templates/ # Downloadable OJT templates
```

The main workflow is status-driven:

1. A student registers and completes a profile.
2. A coordinator verifies the account.
3. The student submits company and MOA information.
4. Coordinators review documents and update the MOA status.
5. The MOA is forwarded to the director for signature.
6. The director completes the approval process.
7. Activity logs and announcements provide operational visibility.

## Useful URLs

- Public landing page: [http://localhost:3000/home](http://localhost:3000/home)
- Login: [http://localhost:3000/auth/login](http://localhost:3000/auth/login)
- Student registration: [http://localhost:3000/auth/register](http://localhost:3000/auth/register)
- Student dashboard: `/student/dashboard`
- Coordinator dashboard: `/coordinator/dashboard`
- Director dashboard: `/director/dashboard`

Use the credentials supplied privately by the project owner. Do not publish default or real passwords in this repository.

## Useful Commands

```powershell
npm start
npm run dev
npm run seed
npm run import-data
npm run set-company-courses
npm run kill-port
```

## Validation

Run basic JavaScript syntax checks with:

```powershell
node --check server.js
node --check public/js/main.js
```

## Portfolio Description

OJT Portal demonstrates practical full-stack engineering through role-based authentication, workflow design, MongoDB data modeling, document management, responsive server-rendered interfaces, activity logging, and Docker-based deployment.

The project converts a real university OJT process into a centralized digital platform for students, coordinators, and directors.

## Repository Hygiene

Before publishing changes, confirm that `.env` files, API keys, database dumps containing personal data, logs, uploaded files, and dependency directories are not committed.

## License

This project is currently distributed without a declared open-source license.
