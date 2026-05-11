  -- Database Schema for Visitor and Consignment Management App
  -- Run this entire file in Neon (or any PostgreSQL) SQL editor to set up the database

  -- ============================================================
  -- USERS
  -- ============================================================
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone_number TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================================
  -- LOGIN LOGS
  -- ============================================================
  CREATE TABLE IF NOT EXISTS login_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================================
  -- PASSWORD RESETS
  -- ============================================================
  CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================================
  -- LOCATIONS (managed by admin)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================================
  -- USER-LOCATION ACCESS CONTROL
  -- ============================================================
  CREATE TABLE IF NOT EXISTS user_locations (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, location_id)
  );

  -- ============================================================
  -- DROPDOWN OPTIONS (purpose, person_to_meet, security_name)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS dropdown_options (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================================
  -- VISITORS
  -- ============================================================
  CREATE TABLE IF NOT EXISTS visitors (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    visitor_id VARCHAR,
    name VARCHAR NOT NULL,
    coming_from VARCHAR NOT NULL,
    company VARCHAR NOT NULL,
    phone_number VARCHAR NOT NULL,
    purpose VARCHAR NOT NULL,
    person_to_meet VARCHAR NOT NULL,
    scheduled VARCHAR NOT NULL,
    in_time TEXT,
    out_time TIME,
    location VARCHAR NOT NULL,
    photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================================
  -- CONSIGNMENTS
  -- ============================================================
  CREATE TABLE IF NOT EXISTS consignments (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    gp_number VARCHAR,
    type VARCHAR NOT NULL CHECK (type IN ('INWARD', 'OUTWARD')),
    document_number VARCHAR NOT NULL,
    document_type VARCHAR NOT NULL,
    in_time TIME NOT NULL,
    vehicle_number VARCHAR NOT NULL,
    driver_contact VARCHAR NOT NULL,
    qty INTEGER NOT NULL,
    package_type VARCHAR NOT NULL,
    comment TEXT NOT NULL,
    photo TEXT NOT NULL,
    security_name VARCHAR NOT NULL,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================================
  -- INDEXES
  -- ============================================================
  CREATE INDEX IF NOT EXISTS idx_visitors_date ON visitors(date DESC);
  CREATE INDEX IF NOT EXISTS idx_visitors_name ON visitors(name);
  CREATE INDEX IF NOT EXISTS idx_consignments_date ON consignments(date DESC);
  CREATE INDEX IF NOT EXISTS idx_consignments_type ON consignments(type);
  CREATE INDEX IF NOT EXISTS idx_consignments_vehicle ON consignments(vehicle_number);
  CREATE INDEX IF NOT EXISTS idx_dropdown_options_category ON dropdown_options(category);
