# 📋 STEP-BY-STEP INSTALLATION GUIDE

This guide will walk you through setting up the entire application from scratch.

## Prerequisites Check ✅

Before starting, make sure you have:
- **Node.js v14+** - [Download](https://nodejs.org/)
- **PostgreSQL v12+** - [Download](https://www.postgresql.org/download/)
- **npm** - Comes with Node.js
- **A code editor** - VS Code recommended

### Verify Installations:
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PostgreSQL version
psql --version
```

---

## 1️⃣ Setup Database

### Step 1.1: Start PostgreSQL Service

**Windows:**
- PostgreSQL should auto-start, or go to Services and start "PostgreSQL"

**Mac:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo service postgresql start
```

### Step 1.2: Create Database

Open PostgreSQL terminal:
```bash
# Open PostgreSQL command line
psql -U postgres

# You'll see: postgres=#
```

Run these commands:
```sql
-- Create the database
CREATE DATABASE visitor_consignment_app;

-- Connect to it
\c visitor_consignment_app

-- Create tables (run db-schema.sql content)
-- Copy and paste all commands from db-schema.sql here
```

**Alternative - Copy paste everything at once:**
1. Open db-schema.sql file
2. Copy entire content
3. Paste into psql terminal
4. Press Enter

### Step 1.3: Verify Database Creation

```sql
-- Still in psql terminal
-- List databases
\l

-- Connect to our database
\c visitor_consignment_app

-- List tables
\dt

-- You should see: visitors and consignments tables
```

---

## 2️⃣ Setup Backend (Express Server)

### Step 2.1: Create Backend Directory

```bash
# Navigate to your project folder
cd /path/to/project

# Create server directory
mkdir server
cd server
```

### Step 2.2: Create package.json

Create file: `server/package.json`

Copy contents from provided file.

### Step 2.3: Create .env File

Create file: `server/.env`

```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_consignment_app
PORT=5000
NODE_ENV=development
```

**⚠️ Important:** Change `DB_PASSWORD` to your PostgreSQL password!

### Step 2.4: Create db.js

Create file: `server/db.js`

Copy contents from provided db.js file.

### Step 2.5: Create server.js

Create file: `server/server.js`

Copy contents from provided server.js file.

### Step 2.6: Install Dependencies

```bash
# Still in server/ directory
npm install

# This installs:
# - express (web framework)
# - pg (PostgreSQL driver)
# - cors (cross-origin requests)
# - dotenv (environment variables)

# Wait for completion (2-5 minutes)
```

### Step 2.7: Start Backend Server

```bash
npm start

# You should see:
# ========================================
# Server is running on http://localhost:5000
# Database: visitor_consignment_app
# Environment: development
# ========================================
```

✅ **Backend is ready!** Keep this terminal open.

### Step 2.8: Test Backend

Open a **new terminal** (keep backend running):

```bash
# Test the server
curl http://localhost:5000/health

# Response should be:
# {"status":"ok","time":"2024-...","message":"Server is running"}
```

If it works, you're good! ✅

---

## 3️⃣ Setup Frontend (React App)

### Step 3.1: Create Frontend Directory

Open a **new terminal** (keep backend running):

```bash
# Navigate to project root
cd /path/to/project

# Create client directory
mkdir client
cd client
```

### Step 3.2: Create React App

This may take 5-10 minutes:

```bash
npx create-react-app .

# Wait for installation...
# This creates a full React application structure
```

### Step 3.3: Create App.js

Replace: `client/src/App.js`

Copy contents from provided App.js file.

### Step 3.4: Create App.css

Replace: `client/src/App.css`

Copy contents from provided App.css file.

### Step 3.5: Create Components Directory

```bash
# In client/src/ create:
mkdir components
```

### Step 3.6: Create Components

Create these files in `client/src/components/`:

1. **VisitorForm.js** - Copy from provided VisitorForm.js
2. **VisitorList.js** - Copy from provided VisitorList.js
3. **ConsignmentForm.js** - Copy from provided ConsignmentForm.js
4. **ConsignmentList.js** - Copy from provided ConsignmentList.js

### Step 3.7: Start Frontend Server

```bash
# Still in client/ directory
npm start

# React dev server will start
# Browser will automatically open http://localhost:3000
# If not, open it manually
```

✅ **Frontend is ready!**

---

## 4️⃣ Verify Everything Works

### Check 1: All Services Running

You should have **3 terminals** open:

Terminal 1 (Backend):
```
Server is running on http://localhost:5000
```

Terminal 2 (Frontend):
```
Compiled successfully!
You can now view visitor-consignment-app in the browser...
```

Terminal 3 (Available for testing):
```
Ready for commands
```

### Check 2: Test in Browser

1. Open http://localhost:3000
2. You should see the application with 4 navigation buttons:
   - ➕ Add Visitor
   - 📋 View Visitors
   - ➕ Add Consignment
   - 📋 View Consignments

### Check 3: Test Adding Data

**Add a Visitor:**
1. Click "➕ Add Visitor"
2. Fill in the form:
   - Name: `John Doe` (required)
   - Company: `ABC Corp`
   - Phone: `9876543210`
   - Coming From: `New York`
   - To Meet: `Manager`
   - Purpose: `Business Meeting`
   - Location: `Office A`
   - Scheduled: Check the box
3. Click "Add Visitor"
4. See success message: ✓ Visitor added successfully
5. Click "📋 View Visitors"
6. Your visitor appears in the table!

**Add a Consignment:**
1. Click "➕ Add Consignment"
2. Fill in the form:
   - Type: Select `INWARD`
   - Document Number: `DOC001`
   - Document Type: `Invoice`
   - Vehicle Number: `MH01AB1234`
   - Driver Contact: `9876543210`
   - Quantity: `50`
   - Package Type: `Box`
   - Security Name: `Security Guard 1`
   - Location: `Warehouse`
3. Click "Add Consignment"
4. See success message
5. Click "📋 View Consignments"
6. Your consignment appears in the table!

### Check 4: Test API Directly

In Terminal 3:

```bash
# Add a visitor via API
curl -X POST http://localhost:5000/visitor \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Jane Smith",
    "company":"XYZ Inc",
    "phone_number":"9876543211"
  }'

# Get all visitors
curl http://localhost:5000/visitors

# Add consignment via API
curl -X POST http://localhost:5000/consignment \
  -H "Content-Type: application/json" \
  -d '{
    "type":"OUTWARD",
    "vehicle_number":"MH01CD5678",
    "qty":100
  }'

# Get all consignments
curl http://localhost:5000/consignments
```

---

## 5️⃣ Common Issues & Solutions

### ❌ "Cannot connect to database"

**Problem:** Backend can't connect to PostgreSQL

**Solution:**
1. Check PostgreSQL is running
2. Verify .env file has correct password
3. Check database exists:
```bash
psql -U postgres -l | grep visitor_consignment_app
```

### ❌ "Port 5000 already in use"

**Problem:** Another app is using port 5000

**Solution:** Change PORT in server/.env to 5001:
```env
PORT=5001
```

Then update API_URL in client/src/App.js:
```javascript
const API_URL = 'http://localhost:5001';
```

### ❌ "Frontend shows blank page"

**Problem:** React isn't loading

**Solution:**
1. Check browser console (F12)
2. Wait for compilation to complete
3. Check npm start output for errors
4. Hard refresh: Ctrl+Shift+R or Cmd+Shift+R

### ❌ "API calls failing"

**Problem:** Frontend can't reach backend

**Solution:**
1. Verify backend is running: `curl http://localhost:5000/health`
2. Check API_URL in App.js is correct
3. Check CORS error in browser console
4. Verify backend is on 5000, frontend on 3000

### ❌ "npm install fails"

**Problem:** Dependencies won't install

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

---

## 6️⃣ Project File Structure

After completion, your project should look like:

```
visitor-consignment-app/
│
├── server/
│   ├── node_modules/              (auto-created)
│   ├── package.json
│   ├── package-lock.json          (auto-created)
│   ├── .env
│   ├── db.js
│   └── server.js
│
├── client/
│   ├── node_modules/              (auto-created)
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── index.js
│   │   ├── index.css
│   │   ├── App.js                 ✏️ (modified)
│   │   ├── App.css                ✏️ (modified)
│   │   ├── components/
│   │   │   ├── VisitorForm.js     ✏️ (new)
│   │   │   ├── VisitorList.js     ✏️ (new)
│   │   │   ├── ConsignmentForm.js ✏️ (new)
│   │   │   └── ConsignmentList.js ✏️ (new)
│   │   └── ... (other auto-generated files)
│   ├── package.json
│   └── package-lock.json          (auto-created)
│
└── README.md                       (optional)
```

---

## 7️⃣ Stopping & Restarting

### To Stop the Application:

1. **Backend Terminal:** Press `Ctrl+C`
2. **Frontend Terminal:** Press `Ctrl+C`
3. Services will shut down gracefully

### To Restart:

**Terminal 1 (Backend):**
```bash
cd /path/to/project/server
npm start
```

**Terminal 2 (Frontend):**
```bash
cd /path/to/project/client
npm start
```

---

## 8️⃣ Production Deployment (Optional)

### Build Frontend for Production:

```bash
cd client
npm run build

# Creates optimized production build in client/build/
```

### Deploy Backend:

1. Use a service like Heroku, AWS, or DigitalOcean
2. Update .env with production database credentials
3. Set NODE_ENV=production
4. Follow service-specific deployment steps

### Deploy Frontend:

1. Upload `client/build/` folder to hosting service
2. Or deploy to Netlify, Vercel, GitHub Pages
3. Update API_URL to production backend URL

---

## 9️⃣ Next Steps

After everything is working:

1. **Add More Features:**
   - Edit/Delete endpoints
   - User authentication
   - Search and filtering
   - Export to CSV

2. **Improve UI:**
   - Add icons/emojis
   - Better error messages
   - Loading spinners
   - Animations

3. **Database:**
   - Add more tables
   - Create relationships
   - Add more validation

4. **Security:**
   - Add user login
   - Implement JWT tokens
   - Add role-based access
   - Validate all inputs

5. **Testing:**
   - Write unit tests
   - Write API tests
   - Test edge cases

---

## 🆘 Need Help?

1. Check browser console (F12) for error messages
2. Check terminal output for backend errors
3. Verify all services are running
4. Re-read the troubleshooting section
5. Check that all files were created correctly

---

## ✅ Success Checklist

Before you finish, verify:

- [ ] PostgreSQL database created
- [ ] Database tables created successfully
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000
- [ ] Can add visitor and see in list
- [ ] Can add consignment and see in list
- [ ] No error messages in browser console
- [ ] No error messages in backend terminal
- [ ] API endpoints respond to curl commands

---

**Congratulations! 🎉 Your application is ready to use!**

Go to http://localhost:3000 and start managing visitors and consignments!
