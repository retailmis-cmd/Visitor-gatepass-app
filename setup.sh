#!/bin/bash
# Full-Stack App Setup Script

echo "=== Visitor & Consignment Management App Setup ==="

# Create directories
mkdir -p server client

echo "✓ Created server and client directories"

# Backend Setup
cd server

# Create package.json
cat > package.json << 'EOF'
{
  "name": "visitor-consignment-server",
  "version": "1.0.0",
  "description": "Backend for Visitor and Consignment Management App",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "keywords": ["visitor", "consignment"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.10.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  }
}
EOF

# Create .env
cat > .env << 'EOF'
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_consignment_app
PORT=5000
NODE_ENV=development
EOF

# Create db.js
cat > db.js << 'EOF'
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
EOF

# Create server.js (truncated for brevity - see IMPLEMENTATION.md)

echo "✓ Created backend files (package.json, .env, db.js)"
echo ""
echo "Next steps:"
echo "1. cd server && npm install"
echo "2. Update .env with your PostgreSQL credentials"
echo "3. Create database: CREATE DATABASE visitor_consignment_app;"
echo "4. Run database schema from db-schema.sql"
echo "5. npm start"
echo ""
echo "6. In new terminal: cd client && npx create-react-app ."
echo "7. Copy frontend files from IMPLEMENTATION.md"
echo "8. npm start"
