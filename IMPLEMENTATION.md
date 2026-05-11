# Full-Stack Visitor & Consignment Management App - Complete Implementation

## Project Structure
```
visitor-consignment-app/
├── server/
│   ├── package.json
│   ├── .env
│   ├── db.js
│   └── server.js
├── client/
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── index.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── components/
│   │       ├── VisitorForm.js
│   │       ├── VisitorList.js
│   │       ├── ConsignmentForm.js
│   │       └── ConsignmentList.js
├── db-schema.sql
└── README.md
```

## BACKEND - server/package.json
```json
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
```

## BACKEND - server/.env
```
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=visitor_consignment_app
PORT=5000
NODE_ENV=development
```

## BACKEND - server/db.js
```javascript
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
```

## BACKEND - server/server.js
```javascript
const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// VISITOR ROUTES

// Add new visitor
app.post('/visitor', async (req, res) => {
  try {
    const { name, company, phone_number, coming_from, to_meet, scheduled, purpose, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const query = `
      INSERT INTO visitors (name, company, phone_number, coming_from, to_meet, scheduled, purpose, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [name, company || null, phone_number || null, coming_from || null, to_meet || null, scheduled || false, purpose || null, location || null];
    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Visitor added successfully',
      visitor: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding visitor:', error);
    res.status(500).json({ error: 'Failed to add visitor' });
  }
});

// Get all visitors
app.get('/visitors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM visitors ORDER BY checkin DESC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ error: 'Failed to fetch visitors' });
  }
});

// CONSIGNMENT ROUTES

// Add new consignment
app.post('/consignment', async (req, res) => {
  try {
    const { type, document_number, document_type, vehicle_number, driver_contact, qty, package_type, comment, security_name, location } = req.body;

    if (!type || !['INWARD', 'OUTWARD'].includes(type)) {
      return res.status(400).json({ error: 'Valid type (INWARD/OUTWARD) is required' });
    }

    const query = `
      INSERT INTO consignments (type, document_number, document_type, vehicle_number, driver_contact, qty, package_type, comment, security_name, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [type, document_number || null, document_type || null, vehicle_number || null, driver_contact || null, qty || null, package_type || null, comment || null, security_name || null, location || null];
    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Consignment added successfully',
      consignment: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding consignment:', error);
    res.status(500).json({ error: 'Failed to add consignment' });
  }
});

// Get all consignments
app.get('/consignments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM consignments ORDER BY in_time DESC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching consignments:', error);
    res.status(500).json({ error: 'Failed to fetch consignments' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Database: visitor_consignment_app');
});
```

## DATABASE SCHEMA - db-schema.sql
```sql
-- Create Visitors table
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  phone_number VARCHAR(20),
  coming_from TEXT,
  to_meet TEXT,
  scheduled BOOLEAN DEFAULT FALSE,
  purpose TEXT,
  checkin TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checkout TIMESTAMP,
  location TEXT
);

-- Create Consignments table
CREATE TABLE IF NOT EXISTS consignments (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('INWARD', 'OUTWARD')),
  document_number TEXT,
  document_type TEXT,
  in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  vehicle_number TEXT,
  driver_contact VARCHAR(20),
  qty INTEGER,
  package_type TEXT,
  comment TEXT,
  security_name TEXT,
  location TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_visitors_checkin ON visitors(checkin DESC);
CREATE INDEX idx_consignments_in_time ON consignments(in_time DESC);
CREATE INDEX idx_consignments_type ON consignments(type);
```

## FRONTEND SETUP

### Step 1: Create React App
```bash
cd client
npx create-react-app .
npm install axios (optional, for easier API calls)
```

### Step 2: Create client/src/App.js
```javascript
import React, { useState } from 'react';
import './App.css';
import VisitorForm from './components/VisitorForm';
import VisitorList from './components/VisitorList';
import ConsignmentForm from './components/ConsignmentForm';
import ConsignmentList from './components/ConsignmentList';

const API_URL = 'http://localhost:5000';

function App() {
  const [currentPage, setCurrentPage] = useState('visitor-form');
  const [refreshVisitors, setRefreshVisitors] = useState(0);
  const [refreshConsignments, setRefreshConsignments] = useState(0);

  const handleVisitorAdded = () => {
    setRefreshVisitors(prev => prev + 1);
  };

  const handleConsignmentAdded = () => {
    setRefreshConsignments(prev => prev + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Visitor & Consignment Management</h1>
        <nav className="nav-menu">
          <button
            className={currentPage === 'visitor-form' ? 'active' : ''}
            onClick={() => setCurrentPage('visitor-form')}
          >
            Add Visitor
          </button>
          <button
            className={currentPage === 'visitor-list' ? 'active' : ''}
            onClick={() => setCurrentPage('visitor-list')}
          >
            View Visitors
          </button>
          <button
            className={currentPage === 'consignment-form' ? 'active' : ''}
            onClick={() => setCurrentPage('consignment-form')}
          >
            Add Consignment
          </button>
          <button
            className={currentPage === 'consignment-list' ? 'active' : ''}
            onClick={() => setCurrentPage('consignment-list')}
          >
            View Consignments
          </button>
        </nav>
      </header>

      <main className="App-main">
        {currentPage === 'visitor-form' && (
          <VisitorForm apiUrl={API_URL} onVisitorAdded={handleVisitorAdded} />
        )}
        {currentPage === 'visitor-list' && (
          <VisitorList apiUrl={API_URL} refresh={refreshVisitors} />
        )}
        {currentPage === 'consignment-form' && (
          <ConsignmentForm apiUrl={API_URL} onConsignmentAdded={handleConsignmentAdded} />
        )}
        {currentPage === 'consignment-list' && (
          <ConsignmentList apiUrl={API_URL} refresh={refreshConsignments} />
        )}
      </main>
    </div>
  );
}

export default App;
```

### Step 3: Create client/src/App.css
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.App {
  min-height: 100vh;
  padding: 20px;
}

.App-header {
  background: white;
  border-radius: 10px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.App-header h1 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.nav-menu {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.nav-menu button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background: #f0f0f0;
  color: #333;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.nav-menu button:hover {
  background: #e0e0e0;
}

.nav-menu button.active {
  background: #667eea;
  color: white;
}

.App-main {
  max-width: 1200px;
  margin: 0 auto;
}

.form-container, .list-container {
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

input, select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  font-family: inherit;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin-right: 10px;
}

button.submit-btn {
  background: #667eea;
  color: white;
  padding: 12px 30px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

button.submit-btn:hover {
  background: #764ba2;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  border: 1px solid #c3e6cb;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  border: 1px solid #f5c6cb;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th {
  background: #f5f5f5;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #ddd;
}

td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

tr:hover {
  background: #f9f9f9;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #667eea;
}
```

### Step 4: Create client/src/components/VisitorForm.js
```javascript
import React, { useState } from 'react';

export default function VisitorForm({ apiUrl, onVisitorAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone_number: '',
    coming_from: '',
    to_meet: '',
    scheduled: false,
    purpose: '',
    location: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/visitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to add visitor');
      }

      const data = await response.json();
      setMessage(data.message);

      setFormData({
        name: '',
        company: '',
        phone_number: '',
        coming_from: '',
        to_meet: '',
        scheduled: false,
        purpose: '',
        location: ''
      });

      if (onVisitorAdded) {
        onVisitorAdded();
      }

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Add Visitor</h2>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Company</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Coming From</label>
            <input
              type="text"
              name="coming_from"
              value={formData.coming_from}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>To Meet</label>
            <input
              type="text"
              name="to_meet"
              value={formData.to_meet}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Purpose</label>
          <textarea
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </div>

        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            name="scheduled"
            checked={formData.scheduled}
            onChange={handleChange}
          />
          <label style={{ margin: 0 }}>Scheduled Visit</label>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Adding...' : 'Add Visitor'}
        </button>
      </form>
    </div>
  );
}
```

### Step 5: Create client/src/components/VisitorList.js
```javascript
import React, { useState, useEffect } from 'react';

export default function VisitorList({ apiUrl, refresh }) {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVisitors();
  }, [refresh]);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${apiUrl}/visitors`);

      if (!response.ok) {
        throw new Error('Failed to fetch visitors');
      }

      const data = await response.json();
      setVisitors(data);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading visitors...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="list-container">
      <h2>Visitors List</h2>
      {visitors.length === 0 ? (
        <div className="no-data">No visitors found</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Phone</th>
                <th>Coming From</th>
                <th>To Meet</th>
                <th>Purpose</th>
                <th>Location</th>
                <th>Check-in</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map(visitor => (
                <tr key={visitor.id}>
                  <td>{visitor.name}</td>
                  <td>{visitor.company || '-'}</td>
                  <td>{visitor.phone_number || '-'}</td>
                  <td>{visitor.coming_from || '-'}</td>
                  <td>{visitor.to_meet || '-'}</td>
                  <td>{visitor.purpose || '-'}</td>
                  <td>{visitor.location || '-'}</td>
                  <td>{new Date(visitor.checkin).toLocaleString()}</td>
                  <td>{visitor.scheduled ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### Step 6: Create client/src/components/ConsignmentForm.js
```javascript
import React, { useState } from 'react';

export default function ConsignmentForm({ apiUrl, onConsignmentAdded }) {
  const [formData, setFormData] = useState({
    type: 'INWARD',
    document_number: '',
    document_type: '',
    vehicle_number: '',
    driver_contact: '',
    qty: '',
    package_type: '',
    comment: '',
    security_name: '',
    location: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/consignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          qty: formData.qty ? parseInt(formData.qty) : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add consignment');
      }

      const data = await response.json();
      setMessage(data.message);

      setFormData({
        type: 'INWARD',
        document_number: '',
        document_type: '',
        vehicle_number: '',
        driver_contact: '',
        qty: '',
        package_type: '',
        comment: '',
        security_name: '',
        location: ''
      });

      if (onConsignmentAdded) {
        onConsignmentAdded();
      }

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Add Consignment</h2>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="INWARD">INWARD</option>
              <option value="OUTWARD">OUTWARD</option>
            </select>
          </div>
          <div className="form-group">
            <label>Document Number</label>
            <input
              type="text"
              name="document_number"
              value={formData.document_number}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Document Type</label>
            <input
              type="text"
              name="document_type"
              value={formData.document_type}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Vehicle Number</label>
            <input
              type="text"
              name="vehicle_number"
              value={formData.vehicle_number}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Driver Contact</label>
            <input
              type="tel"
              name="driver_contact"
              value={formData.driver_contact}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              name="qty"
              value={formData.qty}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Package Type</label>
            <input
              type="text"
              name="package_type"
              value={formData.package_type}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Security Name</label>
            <input
              type="text"
              name="security_name"
              value={formData.security_name}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Comment</label>
          <textarea
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Adding...' : 'Add Consignment'}
        </button>
      </form>
    </div>
  );
}
```

### Step 7: Create client/src/components/ConsignmentList.js
```javascript
import React, { useState, useEffect } from 'react';

export default function ConsignmentList({ apiUrl, refresh }) {
  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConsignments();
  }, [refresh]);

  const fetchConsignments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${apiUrl}/consignments`);

      if (!response.ok) {
        throw new Error('Failed to fetch consignments');
      }

      const data = await response.json();
      setConsignments(data);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading consignments...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="list-container">
      <h2>Consignments List</h2>
      {consignments.length === 0 ? (
        <div className="no-data">No consignments found</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Document #</th>
                <th>Document Type</th>
                <th>Vehicle #</th>
                <th>Driver Contact</th>
                <th>Qty</th>
                <th>Package Type</th>
                <th>Security</th>
                <th>Location</th>
                <th>In Time</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {consignments.map(consignment => (
                <tr key={consignment.id}>
                  <td>{consignment.type}</td>
                  <td>{consignment.document_number || '-'}</td>
                  <td>{consignment.document_type || '-'}</td>
                  <td>{consignment.vehicle_number || '-'}</td>
                  <td>{consignment.driver_contact || '-'}</td>
                  <td>{consignment.qty || '-'}</td>
                  <td>{consignment.package_type || '-'}</td>
                  <td>{consignment.security_name || '-'}</td>
                  <td>{consignment.location || '-'}</td>
                  <td>{new Date(consignment.in_time).toLocaleString()}</td>
                  <td>{consignment.comment || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

## COMPLETE SETUP & RUN INSTRUCTIONS

### Prerequisites
- Node.js v14+ installed
- PostgreSQL v12+ installed and running
- npm installed

### Step 1: Create Project Directories
```bash
mkdir server
mkdir client
```

### Step 2: Setup Database
1. Open PostgreSQL terminal/pgAdmin
2. Run the db-schema.sql commands above to create tables

### Step 3: Backend Setup
```bash
cd server

# Copy package.json contents above

npm install

# Create .env file with your PostgreSQL credentials

npm start
# Server runs on http://localhost:5000
```

### Step 4: Frontend Setup (in new terminal)
```bash
cd client

npx create-react-app .

# Copy App.js, App.css and create components/ folder with all component files

npm start
# Frontend runs on http://localhost:3000
```

### API Endpoints Ready:
- POST http://localhost:5000/visitor - Add visitor
- GET http://localhost:5000/visitors - List visitors
- POST http://localhost:5000/consignment - Add consignment
- GET http://localhost:5000/consignments - List consignments
- GET http://localhost:5000/health - Check server health
