# OJT Management and Monitoring Portal

A comprehensive web-based system for managing and monitoring On-the-Job Training (OJT) programs for Pangasinan State University.

## Features

### Student Module
- ✅ User registration and account creation
- ✅ Student profiling form
- ✅ MOA (Memorandum of Agreement) upload and status monitoring
- ✅ Document repository for evaluations and documentation
- ✅ View announcements from coordinators
- ✅ Profile management

### OJT Coordinator Module
- ✅ View and manage student list
- ✅ Verify student accounts
- ✅ View student profiles and repositories
- ✅ MOA status management (processing, revise, for signature)
- ✅ Post announcements (memos, updates)
- ✅ Add additional coordinator accounts
- ✅ Dashboard with statistics

### Director Module
- ✅ View verified student accounts
- ✅ View student repositories
- ✅ Sign MOA documents (final approval)
- ✅ Dashboard with pending signatures

### System Features
- ✅ JWT-based authentication
- ✅ Role-based authorization (Student, Coordinator, Director)
- ✅ File upload with Multer (local storage)
- ✅ Search and filter functionality
- ✅ Pagination for lists
- ✅ FAQ Chatbot (rule-based)
- ✅ Activity logging
- ✅ Clean, modern UI with Bootstrap 5

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Frontend**: EJS templates
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **UI Framework**: Bootstrap 5
- **Icons**: Bootstrap Icons

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Steps

1. **Clone or download the project**
   ```bash
   cd SIA
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/ojt_portal
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   SESSION_SECRET=your_session_secret_key_change_this
   NODE_ENV=development
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system. If using a local instance:
   ```bash
   mongod
   ```

5. **Run the application**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Create initial admin accounts (Optional)**
   Run the seed script to create default coordinator and director accounts:
   ```bash
   npm run seed
   ```
   This will create:
   - Coordinator: coordinator@psu.edu / coordinator123
   - Director: director@psu.edu / director123
   
   **Important**: Change these passwords immediately after first login!

7. **Access the application**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Project Structure

```
SIA/
├── models/              # Mongoose models
│   ├── User.js
│   ├── StudentProfile.js
│   ├── MOA.js
│   ├── RepositoryFile.js
│   ├── Announcement.js
│   └── ActivityLog.js
├── routes/             # Express routes
│   ├── index.js
│   ├── auth.js
│   ├── student.js
│   ├── coordinator.js
│   ├── director.js
│   └── api.js
├── middleware/          # Custom middleware
│   ├── auth.js
│   └── upload.js
├── views/              # EJS templates
│   ├── partials/
│   ├── auth/
│   ├── student/
│   ├── coordinator/
│   └── director/
├── public/             # Static files
│   ├── css/
│   └── js/
├── uploads/            # Uploaded files (created automatically)
│   ├── moa/
│   └── repository/
├── server.js           # Main application file
ackage.json
└── README.md
```

## Database Models

### User
- Email, password (hashed), role, verification status

### StudentProfile
- Student information, course details, company information, supervisor details, OJT schedule

### MOA
- File path, status, coordinator comments, director approval

### RepositoryFile
- File metadata, type (evaluation/documentation/other), student association

### Announcement
- Title, content, type (memo/update/general), posted by, active status

### ActivityLog
- User actions, descriptions, timestamps

## API Endpoints

### Authentication
- `GET /auth/login` - Login page
- `POST /auth/login` - Login handler
- `GET /auth/register` - Registration page
- `POST /auth/register` - Registration handler
- `GET /auth/logout` - Logout

### Student Routes
- `GET /student/dashboard` - Student dashboard
- `GET /student/profile` - View profile
- `POST /student/profile` - Update profile
- `GET /student/moa` - MOA upload page
- `POST /student/moa` - Upload MOA
- `GET /student/repository` - View repository
- `POST /student/repository` - Upload file
- `POST /student/repository/delete/:id` - Delete file
- `GET /student/announcements` - View announcements

### Coordinator Routes
- `GET /coordinator/dashboard` - Coordinator dashboard
- `GET /coordinator/students` - Student list
- `GET /coordinator/students/:id` - Student details
- `POST /coordinator/students/:id/verify` - Verify student
- `GET /coordinator/students/:id/repository` - View student repository
- `GET /coordinator/moa` - MOA management
- `POST /coordinator/moa/:id/status` - Update MOA status
- `GET /coordinator/announcements` - Announcements list
- `GET /coordinator/announcements/create` - Create announcement
- `POST /coordinator/announcements` - Post announcement
- `GET /coordinator/coordinators/create` - Add coordinator
- `POST /coordinator/coordinators` - Create coordinator

### Director Routes
- `GET /director/dashboard` - Director dashboard
- `GET /director/students` - Verified students list
- `GET /director/students/:id` - Student details
- `GET /director/students/:id/repository` - View repository
- `GET /director/moa` - MOA for signature
- `POST /director/moa/:id/sign` - Sign MOA

### API Routes
- `POST /api/chatbot` - Chatbot endpoint
- `GET /api/announcements` - Get announcements (public)

## Usage

### Creating Initial Accounts

Use the seed script to create initial coordinator and director accounts:
```bash
npm run seed
```

This creates:
- **Coordinator**: coordinator@psu.edu / coordinator123
- **Director**: director@psu.edu / director123

**⚠️ Security Note**: Change these default passwords immediately after first login!

Alternatively, you can create accounts manually through MongoDB:
```javascript
// Create a coordinator
db.users.insertOne({
  email: "coordinator@psu.edu",
  password: "$2a$10$...", // Use bcrypt to hash password
  role: "coordinator",
  isVerified: true
});

// Create a director
db.users.insertOne({
  email: "director@psu.edu",
  password: "$2a$10$...", // Use bcrypt to hash password
  role: "director",
  isVerified: true
});
```

### Student Registration Flow

1. Student registers with email and password
2. Fills out student profiling form
3. Account is created but not verified
4. Coordinator verifies the account
5. Student can now upload MOA and documents
6. Coordinator reviews and updates MOA status
7. When status is "for signature", Director can sign
8. MOA is marked as "completed"

## File Upload

- Maximum file size: 10MB
- Allowed formats: PDF, JPG, JPEG, PNG
- Files are stored in `uploads/` directory
- MOA files: `uploads/moa/`
- Repository files: `uploads/repository/` (organized by type)

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Role-based access control
- File type validation
- File size limits
- Input validation and sanitization

## Chatbot

The system includes a rule-based FAQ chatbot that can answer questions about:
- MOA uploads and status
- Registration process
- Account verification
- Repository and file uploads
- Profile management
- Announcements

## Development

### Running in Development Mode
```bash
npm run dev
```
Uses nodemon for auto-reload on file changes.

### Environment Variables
- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `SESSION_SECRET` - Secret key for sessions
- `NODE_ENV` - Environment (development/production)

## Docker Deployment (Optional)

### Using Docker Compose

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Run seed script inside container**
   ```bash
   docker-compose exec app npm run seed
   ```

3. **Access the application**
   ```
   http://localhost:3000
   ```

### Using Dockerfile

1. **Build the image**
   ```bash
   docker build -t ojt-portal .
   ```

2. **Run the container**
   ```bash
   docker run -p 3000:3000 \
     -e MONGODB_URI=mongodb://your-mongo-host:27017/ojt_portal \
     -e JWT_SECRET=your_secret \
     -e SESSION_SECRET=your_secret \
     ojt-portal
   ```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify MongoDB port (default: 27017)

### File Upload Issues
- Check `uploads/` directory permissions
- Verify file size limits
- Ensure file types are allowed

### Authentication Issues
- Clear browser cookies
- Check JWT_SECRET in `.env`
- Verify token expiration settings

## Future Enhancements

- Email notifications
- File preview functionality
- Advanced reporting and analytics
- Mobile app support
- Integration with university systems
- Cloud storage integration (AWS S3, Google Drive)

## License

This project is developed for Pangasinan State University.

## Support

For issues or questions, please contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: 2024

