@echo off
REM Full-Stack App Setup Script for Windows

echo ===================================
echo Visitor Consignment Management App
echo Setup Script for Windows
echo ===================================
echo.

REM Create directories
mkdir server 2>nul
mkdir client 2>nul

echo [OK] Created server and client directories
echo.

REM Change to server directory
cd server

REM Create package.json
(
echo {
echo   "name": "visitor-consignment-server",
echo   "version": "1.0.0",
echo   "description": "Backend for Visitor and Consignment Management App",
echo   "main": "server.js",
echo   "scripts": {
echo     "start": "node server.js",
echo     "dev": "node server.js"
echo   },
echo   "keywords": ["visitor", "consignment"],
echo   "author": "",
echo   "license": "ISC",
echo   "dependencies": {
echo     "express": "^4.18.2",
echo     "pg": "^8.10.0",
echo     "cors": "^2.8.5",
echo     "dotenv": "^16.0.3"
echo   }
echo }
) > package.json

echo [OK] Created package.json

REM Create .env
(
echo DB_USER=postgres
echo DB_PASSWORD=your_password
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=visitor_consignment_app
echo PORT=5000
echo NODE_ENV=development
) > .env

echo [OK] Created .env file

echo.
echo =================================
echo NEXT STEPS:
echo =================================
echo.
echo 1. Edit server\.env with your PostgreSQL credentials
echo.
echo 2. In PostgreSQL terminal, run:
echo    CREATE DATABASE visitor_consignment_app;
echo.
echo 3. Run the database schema (see db-schema.sql below)
echo.
echo 4. Backend setup:
echo    cd server
echo    npm install
echo    npm start
echo    (Server will run on http://localhost:5000)
echo.
echo 5. Frontend setup (in new terminal):
echo    cd client
echo    npx create-react-app .
echo    npm install
echo    (Copy all component files from IMPLEMENTATION.md)
echo    npm start
echo    (Frontend will run on http://localhost:3000)
echo.
echo =================================
echo DATABASE SCHEMA (PostgreSQL):
echo =================================
echo.
echo CREATE TABLE IF NOT EXISTS visitors (
echo   id SERIAL PRIMARY KEY,
echo   name TEXT NOT NULL,
echo   company TEXT,
echo   phone_number VARCHAR(20),
echo   coming_from TEXT,
echo   to_meet TEXT,
echo   scheduled BOOLEAN DEFAULT FALSE,
echo   purpose TEXT,
echo   checkin TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
echo   checkout TIMESTAMP,
echo   location TEXT
echo );
echo.
echo CREATE TABLE IF NOT EXISTS consignments (
echo   id SERIAL PRIMARY KEY,
echo   type TEXT NOT NULL CHECK (type IN ('INWARD', 'OUTWARD')),
echo   document_number TEXT,
echo   document_type TEXT,
echo   in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
echo   vehicle_number TEXT,
echo   driver_contact VARCHAR(20),
echo   qty INTEGER,
echo   package_type TEXT,
echo   comment TEXT,
echo   security_name TEXT,
echo   location TEXT
echo );
echo.
echo CREATE INDEX idx_visitors_checkin ON visitors(checkin DESC);
echo CREATE INDEX idx_consignments_in_time ON consignments(in_time DESC);
echo CREATE INDEX idx_consignments_type ON consignments(type);
echo.

pause
