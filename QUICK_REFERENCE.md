# QUICK REFERENCE GUIDE

## Project Overview
Full-Stack Web Application for Visitor & Consignment Management

**Tech Stack:**
- Backend: Node.js + Express
- Database: PostgreSQL
- Frontend: React (Create-React-App)

---

## FILE STRUCTURE
```
visitor-consignment-app/
├── server/
│   ├── package.json          # Backend dependencies
│   ├── .env                  # Database credentials
│   ├── db.js                 # Database connection pool
│   └── server.js             # Express server & routes
│
├── client/
│   ├── package.json          # Frontend dependencies
│   ├── public/               # Static files
│   └── src/
│       ├── index.js          # React entry point
│       ├── App.js            # Main component
│       ├── App.css           # Styles
│       └── components/
│           ├── VisitorForm.js
│           ├── VisitorList.js
│           ├── ConsignmentForm.js
│           └── ConsignmentList.js
│
└── README.md                 # Full documentation
```

---

## DATABASE TABLES

### visitors
- id (SERIAL PRIMARY KEY)
- name (TEXT, NOT NULL)
- company (TEXT)
- phone_number (VARCHAR)
- coming_from (TEXT)
- to_meet (TEXT)
- scheduled (BOOLEAN, default FALSE)
- purpose (TEXT)
- checkin (TIMESTAMP, default CURRENT_TIMESTAMP)
- checkout (TIMESTAMP)
- location (TEXT)

### consignments
- id (SERIAL PRIMARY KEY)
- type (TEXT, CHECK: 'INWARD' or 'OUTWARD')
- document_number (TEXT)
- document_type (TEXT)
- in_time (TIMESTAMP, default CURRENT_TIMESTAMP)
- vehicle_number (TEXT)
- driver_contact (VARCHAR)
- qty (INTEGER)
- package_type (TEXT)
- comment (TEXT)
- security_name (TEXT)
- location (TEXT)

---

## API ENDPOINTS

### Visitor Endpoints
```
POST /visitor
- Body: { name, company?, phone_number?, coming_from?, to_meet?, scheduled?, purpose?, location? }
- Response: { message, visitor }

GET /visitors
- Response: [{ id, name, company, ... }]
```

### Consignment Endpoints
```
POST /consignment
- Body: { type, document_number?, document_type?, vehicle_number?, driver_contact?, qty?, package_type?, comment?, security_name?, location? }
- Response: { message, consignment }

GET /consignments
- Response: [{ id, type, document_number, ... }]
```

### Health Check
```
GET /health
- Response: { status, time }
```

---

## FRONTEND COMPONENTS

### Navigation
- Add Visitor
- View Visitors
- Add Consignment
- View Consignments

### Forms
- VisitorForm: Collects visitor details and submits to POST /visitor
- ConsignmentForm: Collects consignment details and submits to POST /consignment

### Lists
- VisitorList: Displays all visitors in a table
- ConsignmentList: Displays all consignments in a table

---

## SETUP CHECKLIST

### Prerequisites
- [ ] Node.js v14+ installed
- [ ] PostgreSQL v12+ installed
- [ ] npm installed

### Database Setup
- [ ] PostgreSQL running
- [ ] Database created: `CREATE DATABASE visitor_consignment_app;`
- [ ] Tables created (see schema above)
- [ ] Indexes created

### Backend Setup
- [ ] Navigate to server/
- [ ] npm install
- [ ] Update .env with PostgreSQL credentials
- [ ] npm start (runs on http://localhost:5000)
- [ ] Test: curl http://localhost:5000/health

### Frontend Setup
- [ ] Navigate to client/
- [ ] npx create-react-app .
- [ ] Create components/ directory
- [ ] Copy all component files
- [ ] Copy App.js and App.css
- [ ] npm start (runs on http://localhost:3000)

---

## QUICK START COMMANDS

### Terminal 1 - Backend
```bash
cd server
npm install
npm start
```

### Terminal 2 - Frontend
```bash
cd client
npx create-react-app .
# (copy files from IMPLEMENTATION.md)
npm start
```

### Terminal 3 - PostgreSQL
```sql
CREATE DATABASE visitor_consignment_app;
-- Then run the schema commands
```

---

## ENVIRONMENT VARIABLES (.env)

```
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_consignment_app
PORT=5000
NODE_ENV=development
```

---

## ERROR TROUBLESHOOTING

### "Cannot connect to database"
- [ ] PostgreSQL is running
- [ ] .env has correct credentials
- [ ] Database exists
- [ ] Tables are created

### "Port 5000 already in use"
- [ ] Change PORT in .env
- [ ] Or: lsof -ti:5000 | xargs kill -9 (Mac/Linux)

### "Frontend can't reach backend"
- [ ] Backend running on http://localhost:5000
- [ ] CORS enabled in server.js
- [ ] Check browser console for errors

### "Tables not found"
- [ ] Run db-schema.sql commands
- [ ] Check database name matches .env
- [ ] Verify tables with: \dt (in psql)

---

## TESTING ENDPOINTS WITH CURL

```bash
# Test backend health
curl http://localhost:5000/health

# Add visitor
curl -X POST http://localhost:5000/visitor \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","company":"Acme"}'

# Get all visitors
curl http://localhost:5000/visitors

# Add consignment
curl -X POST http://localhost:5000/consignment \
  -H "Content-Type: application/json" \
  -d '{"type":"INWARD","vehicle_number":"ABC123"}'

# Get all consignments
curl http://localhost:5000/consignments
```

---

## USEFUL PSQL COMMANDS

```sql
-- List all databases
\l

-- Connect to database
\c visitor_consignment_app

-- List all tables
\dt

-- Describe table
\d visitors

-- View all data
SELECT * FROM visitors;
SELECT * FROM consignments;

-- Drop tables (if needed)
DROP TABLE IF EXISTS visitors CASCADE;
DROP TABLE IF EXISTS consignments CASCADE;
```

---

## FEATURES INCLUDED

✓ Visitor management (add, view)
✓ Consignment tracking (add, view)
✓ Async/await error handling
✓ Database connection pooling
✓ CORS enabled
✓ Responsive UI
✓ Form validation
✓ Success/error messages
✓ Real-time list updates
✓ Pagination ready (can add LIMIT/OFFSET)

---

## NEXT FEATURES TO ADD

- [ ] Edit/Update endpoints
- [ ] Delete endpoints
- [ ] Search/Filter functionality
- [ ] Pagination
- [ ] User authentication
- [ ] Export to CSV
- [ ] Date range filtering
- [ ] Dashboard/Statistics
- [ ] Mobile app

---

## SUPPORT DOCS

For complete file contents, see IMPLEMENTATION.md in the session folder.

All code includes:
- Proper error handling
- Input validation
- Async/await patterns
- CSS styling
- Comments where needed
