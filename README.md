# Visitor & Consignment Management System

A full-stack web application for managing visitor registrations and consignment tracking. Built with Node.js/Express backend, PostgreSQL database, and React frontend.

## 🎯 Features

- ✅ **Visitor Management**: Register visitors with company, contact details, and meeting information
- ✅ **Consignment Tracking**: Track inward and outward consignments with vehicle and security details
- ✅ **Real-time Updates**: Add records and see them instantly in the list
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile devices
- ✅ **Error Handling**: Comprehensive error messages and validation
- ✅ **RESTful API**: Clean API endpoints for integration
- ✅ **Database Indexing**: Optimized queries with proper indexing

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js v14+
- **Framework**: Express.js
- **Database**: PostgreSQL v12+
- **Library**: pg (node-postgres)
- **Middleware**: CORS, JSON parser
- **Environment**: dotenv for configuration

### Frontend
- **Framework**: React v17+
- **Build Tool**: Create React App
- **Styling**: CSS3 with responsive design
- **HTTP Client**: Fetch API
- **State Management**: React Hooks

## 📁 Project Structure

```
visitor-consignment-app/
│
├── server/                          # Backend Express application
│   ├── package.json                 # Backend dependencies
│   ├── .env                         # Environment variables (not in repo)
│   ├── db.js                        # Database connection pool
│   └── server.js                    # Express server & API routes
│
├── client/                          # React frontend application
│   ├── package.json                 # Frontend dependencies
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── App.js                   # Main component
│       ├── App.css                  # Global styles
│       └── components/
│           ├── VisitorForm.js       # Add visitor form
│           ├── VisitorList.js       # Display visitors table
│           ├── ConsignmentForm.js   # Add consignment form
│           └── ConsignmentList.js   # Display consignments table
│
├── db-schema.sql                    # Database schema & sample data
└── README.md                        # This file
```

## 🗄️ Database Schema

### Visitors Table
```sql
visitors (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  company            TEXT,
  phone_number       VARCHAR(20),
  coming_from        TEXT,
  to_meet            TEXT,
  scheduled          BOOLEAN DEFAULT FALSE,
  purpose            TEXT,
  checkin            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checkout           TIMESTAMP,
  location           TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Consignments Table
```sql
consignments (
  id                 SERIAL PRIMARY KEY,
  type               TEXT NOT NULL (INWARD/OUTWARD),
  document_number    TEXT,
  document_type      TEXT,
  in_time            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  vehicle_number     TEXT,
  driver_contact     VARCHAR(20),
  qty                INTEGER,
  package_type       TEXT,
  comment            TEXT,
  security_name      TEXT,
  location           TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## 🚀 Quick Start

### Prerequisites
- Node.js v14+ ([Download](https://nodejs.org/))
- PostgreSQL v12+ ([Download](https://www.postgresql.org/download/))
- npm or yarn package manager

### Step 1: Clone or Create Project Structure
```bash
mkdir visitor-consignment-app
cd visitor-consignment-app

# Create backend and frontend directories
mkdir server client
```

### Step 2: Setup PostgreSQL Database

#### Using PostgreSQL CLI:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE visitor_consignment_app;

# Connect to the new database
\c visitor_consignment_app

# Run the schema file (copy content from db-schema.sql)
# Paste the SQL commands here
```

#### Or using GUI (pgAdmin):
1. Right-click on "Databases"
2. Create → Database
3. Enter name: `visitor_consignment_app`
4. Run the SQL from `db-schema.sql`

### Step 3: Setup Backend

```bash
cd server

# Copy the following files to server/ directory:
# - package.json
# - .env
# - db.js
# - server.js

# Install dependencies
npm install

# Update .env with your PostgreSQL credentials:
cat > .env << EOF
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_consignment_app
PORT=5000
NODE_ENV=development
EOF

# Start the backend server
npm start
```

The server will run on **http://localhost:5000**

Test it:
```bash
curl http://localhost:5000/health
# Response: {"status":"ok","time":"2024-01-01T12:00:00.000Z","message":"Server is running"}
```

### Step 4: Setup Frontend

In a **new terminal**:

```bash
cd client

# Create React app
npx create-react-app .

# Wait for installation to complete (5-10 minutes)

# Copy the following files to client/src/:
# - App.js
# - App.css
# Create components/ directory and copy:
# - VisitorForm.js
# - VisitorList.js
# - ConsignmentForm.js
# - ConsignmentList.js

# Start the frontend dev server
npm start
```

The application will open on **http://localhost:3000**

## 📡 API Endpoints

### Base URL
```
http://localhost:5000
```

### Health Check
```http
GET /health
```
Response:
```json
{
  "status": "ok",
  "time": "2024-01-01T12:00:00.000Z",
  "message": "Server is running"
}
```

### Visitor Endpoints

**Add Visitor**
```http
POST /visitor
Content-Type: application/json

{
  "name": "John Doe",
  "company": "ABC Corporation",
  "phone_number": "9876543210",
  "coming_from": "New York",
  "to_meet": "Manager",
  "scheduled": true,
  "purpose": "Business Meeting",
  "location": "Office A"
}
```

Response (201 Created):
```json
{
  "message": "Visitor added successfully",
  "visitor": {
    "id": 1,
    "name": "John Doe",
    "company": "ABC Corporation",
    ...
  }
}
```

**Get All Visitors**
```http
GET /visitors
```

Response:
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "company": "ABC Corporation",
    "phone_number": "9876543210",
    "coming_from": "New York",
    "to_meet": "Manager",
    "scheduled": true,
    "purpose": "Business Meeting",
    "checkin": "2024-01-01T12:00:00.000Z",
    "checkout": null,
    "location": "Office A"
  }
]
```

**Get Specific Visitor**
```http
GET /visitors/:id
```

### Consignment Endpoints

**Add Consignment**
```http
POST /consignment
Content-Type: application/json

{
  "type": "INWARD",
  "document_number": "DOC001",
  "document_type": "Invoice",
  "vehicle_number": "MH01AB1234",
  "driver_contact": "9876543210",
  "qty": 50,
  "package_type": "Box",
  "comment": "Fragile items",
  "security_name": "Security Guard 1",
  "location": "Warehouse"
}
```

Response (201 Created):
```json
{
  "message": "Consignment added successfully",
  "consignment": {
    "id": 1,
    "type": "INWARD",
    "document_number": "DOC001",
    ...
  }
}
```

**Get All Consignments**
```http
GET /consignments
```

Response:
```json
[
  {
    "id": 1,
    "type": "INWARD",
    "document_number": "DOC001",
    "document_type": "Invoice",
    "in_time": "2024-01-01T12:00:00.000Z",
    "vehicle_number": "MH01AB1234",
    "driver_contact": "9876543210",
    "qty": 50,
    "package_type": "Box",
    "comment": "Fragile items",
    "security_name": "Security Guard 1",
    "location": "Warehouse"
  }
]
```

**Get Specific Consignment**
```http
GET /consignments/:id
```

## 🎨 Frontend Components

### Navigation
- **Add Visitor**: Open the visitor entry form
- **View Visitors**: Display all registered visitors in a table
- **Add Consignment**: Open the consignment entry form
- **View Consignments**: Display all consignments with filtering

### Forms
Both forms include:
- Input validation
- Required field indicators
- Auto-clear after submission
- Success/error messages
- Loading states
- Accessible form elements (labels, placeholders)

### Lists
Both lists include:
- Table display with sorting by date
- Formatted timestamps
- Record count
- Refresh button
- Filter options (consignments only)
- Responsive table layout

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
1. Verify PostgreSQL is running
2. Check .env credentials
3. Ensure database exists: `CREATE DATABASE visitor_consignment_app;`
4. Verify user permissions

```bash
# Test connection
psql -U postgres -h localhost -d visitor_consignment_app
```

### Issue: "Port 5000 already in use"

**Solution:**
```bash
# Change PORT in .env to 5001 or another free port
PORT=5001

# Or kill the process using port 5000 (Mac/Linux):
lsof -ti:5000 | xargs kill -9

# Or Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: "Frontend can't reach backend"

**Solution:**
1. Verify backend is running on http://localhost:5000
2. Check CORS is enabled in server.js
3. Verify API_URL in App.js is correct
4. Check browser console for errors (F12)

```bash
# Test backend is running
curl http://localhost:5000/health
```

### Issue: "Tables not found"

**Solution:**
1. Run db-schema.sql in PostgreSQL
2. Verify database name matches .env
3. Check tables exist:

```sql
-- In psql
\c visitor_consignment_app
\dt
```

## 📊 Sample Data

The database schema includes sample data for testing:

```sql
-- Sample visitor
INSERT INTO visitors VALUES (...);

-- Sample consignment
INSERT INTO consignments VALUES (...);
```

To reset database:
```bash
# Drop and recreate
DROP DATABASE IF EXISTS visitor_consignment_app;
CREATE DATABASE visitor_consignment_app;
# Re-run schema
```

## 🔐 Security Notes

### For Production:

1. **Update .env**
   - Change DB_PASSWORD to a strong password
   - Use environment-specific configurations
   - Never commit .env to version control

2. **Add Input Validation**
   - Validate on both frontend and backend
   - Use parameterized queries (already done)

3. **Enable HTTPS**
   - Add SSL certificate
   - Use secure cookies

4. **Add Authentication**
   - Implement user login
   - Add JWT tokens
   - Role-based access control

5. **Database Security**
   - Use separate user for app (not postgres)
   - Restrict database access by IP
   - Enable query logging

6. **API Security**
   - Add rate limiting
   - Implement request validation
   - Add request logging

## 📈 Future Enhancements

- [ ] Edit/Update endpoints
- [ ] Delete endpoints with soft deletes
- [ ] Search and advanced filtering
- [ ] Pagination and sorting
- [ ] User authentication & authorization
- [ ] Export to CSV/PDF
- [ ] Dashboard with statistics
- [ ] Mobile app (React Native)
- [ ] Email notifications
- [ ] Audit logging
- [ ] Two-factor authentication
- [ ] WebSocket for real-time updates

## 📚 Useful Commands

### Backend
```bash
cd server

# Install dependencies
npm install

# Start development server
npm start

# Test endpoint
curl http://localhost:5000/health

# View logs
npm start  # Logs will show in console
```

### Frontend
```bash
cd client

# Create React app
npx create-react-app .

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Database (PostgreSQL)
```bash
# Connect to database
psql -U postgres -d visitor_consignment_app

# Useful commands in psql
\dt              # List tables
\d visitors      # Describe table
SELECT * FROM visitors;
DROP TABLE IF EXISTS visitors CASCADE;
\q              # Quit
```

## 📝 Environment Variables

Create `.env` file in server/ directory:

```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_consignment_app

# Server Configuration
PORT=5000
NODE_ENV=development

# Optional: CORS configuration
# CORS_ORIGIN=http://localhost:3000
```

## 📄 File Checklist

Backend files to create:
- [ ] server/package.json
- [ ] server/.env
- [ ] server/db.js
- [ ] server/server.js

Frontend files to create (in src/):
- [ ] App.js
- [ ] App.css
- [ ] components/VisitorForm.js
- [ ] components/VisitorList.js
- [ ] components/ConsignmentForm.js
- [ ] components/ConsignmentList.js

Database:
- [ ] db-schema.sql (run the SQL commands)

## 🤝 Contributing

To extend this application:

1. Add new tables to db-schema.sql
2. Create new API endpoints in server.js
3. Create React components in client/src/components/
4. Update navigation in App.js

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review the API documentation
3. Check browser console (F12) for errors
4. Check server logs for backend errors

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

---

**Happy coding! 🚀**

For complete code files, see the accompanying implementation files in the session directory.
