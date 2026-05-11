const express = require('express');
const cors = require('cors');
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'visitor_app_jwt_secret_change_in_production';

/* ================= AUTH MIDDLEWARE ================= */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const normalizePhone = (value) => value ? value.replace(/\D/g, '') : '';
const isPhone = (value) => /^\+?[0-9][0-9\-\s().]{5,}$/.test(value);

const smtpEnabled = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.OTP_FROM_EMAIL);
const twilioEnabled = Boolean(process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM);

const emailTransporter = smtpEnabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const twilioClient = twilioEnabled
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
  : null;

const sendOtpEmail = async (to, otp) => {
  if (!emailTransporter) {
    throw new Error('SMTP is not configured');
  }
  await emailTransporter.sendMail({
    from: process.env.OTP_FROM_EMAIL,
    to,
    subject: 'Your OTP code',
    text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your OTP code is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
  });
};

const sendOtpSms = async (to, otp) => {
  if (!twilioClient) {
    throw new Error('Twilio is not configured');
  }
  const destination = to.startsWith('+') ? to : `+${to}`;
  await twilioClient.messages.create({
    body: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    from: process.env.TWILIO_FROM,
    to: destination,
  });
};

console.log("SERVER FILE LOADED");

/* ================= HEALTH CHECK ================= */
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB connection failed' });
  }
});


/* ================= VISITORS ================= */

// ➕ Add Visitor (SIMPLIFIED + MATCHES FRONTEND)
app.post('/visitor', async (req, res) => {
  console.log("POST /visitor HIT");

  try {
    const { name, company, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO visitors (name, company, location)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        name,
        company || null,
        location || null
      ]
    );

    res.json({
      message: 'Visitor added successfully',
      data: result.rows[0]
    });

  } catch (err) {
    console.error("POST ERROR:", err);
    res.status(500).json({ error: 'Failed to add visitor' });
  }
});


// 📋 Get Visitors (filtered by user's assigned locations)
app.get('/visitors', authenticate, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM visitors ORDER BY id DESC');
    } else {
      const locResult = await pool.query(
        `SELECT l.name FROM locations l JOIN user_locations ul ON ul.location_id = l.id WHERE ul.user_id = $1`,
        [req.user.id]
      );
      const locs = locResult.rows.map((r) => r.name);
      if (locs.length === 0) return res.json([]);
      result = await pool.query(
        'SELECT * FROM visitors WHERE location = ANY($1) ORDER BY id DESC',
        [locs]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visitors' });
  }
});


// ❌ DELETE Visitor
app.delete('/visitors/:id', authenticate, async (req, res) => {
  console.log("DELETE HIT");

  try {
    const id = Number(req.params.id);

    const result = await pool.query(
      'DELETE FROM visitors WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    res.json({ message: 'Deleted successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});


/* ================= CONSIGNMENTS ================= */

// ➕ Add Consignment (SIMPLIFIED)
app.post('/consignment', async (req, res) => {
  try {
    const {
      type,
      document_number,
      vehicle_number,
      qty,
      location
    } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type required' });
    }

    const result = await pool.query(
      `INSERT INTO consignments
      (type, document_number, vehicle_number, qty, location)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *`,
      [
        type,
        document_number || null,
        vehicle_number || null,
        qty || null,
        location || null
      ]
    );

    res.json({
      message: 'Consignment added',
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add consignment' });
  }
});


// 📋 Get Consignments (filtered by user's assigned locations)
app.get('/consignments', authenticate, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM consignments ORDER BY id DESC');
    } else {
      const locResult = await pool.query(
        `SELECT l.name FROM locations l JOIN user_locations ul ON ul.location_id = l.id WHERE ul.user_id = $1`,
        [req.user.id]
      );
      const locs = locResult.rows.map((r) => r.name);
      if (locs.length === 0) return res.json([]);
      result = await pool.query(
        'SELECT * FROM consignments WHERE location = ANY($1) ORDER BY id DESC',
        [locs]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch consignments' });
  }
});

// ❌ DELETE Consignment
app.delete('/consignments/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query('DELETE FROM consignments WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Consignment not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});


/* ================= AUTHENTICATION ================= */

// ➕ Signup
app.post('/signup', async (req, res) => {
  console.log("Signup route hit");
  try {
    const { name, email, password, phone_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const normalizedPhone = phone_number ? normalizePhone(phone_number) : null;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password, phone_number) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
      [name, email.toLowerCase(), hashedPassword, normalizedPhone]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// 🔐 Login
app.post('/login', async (req, res) => {
  console.log("Login route hit");
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    let success = false;
    let userId = null;
    let userRole = null;

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        success = true;
        userId = user.id;
        userRole = user.role;
      }
    }

    if (!success) {
      await pool.query(
        'INSERT INTO login_logs (user_id, email, success, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
        [userId, email.toLowerCase(), false, ip, userAgent]
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await pool.query(
      'INSERT INTO login_logs (user_id, email, success, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [userId, email.toLowerCase(), true, ip, userAgent]
    );

    // Fetch user's assigned locations (for regular users)
    const locResult = await pool.query(
      `SELECT l.name FROM locations l
       JOIN user_locations ul ON ul.location_id = l.id
       WHERE ul.user_id = $1`,
      [userId]
    );
    const assignedLocations = locResult.rows.map((r) => r.name);

    const token = jwt.sign(
      { id: userId, name: userResult.rows[0].name, email: userResult.rows[0].email, role: userRole },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: { id: userId, name: userResult.rows[0].name, email: userResult.rows[0].email, role: userRole, assignedLocations }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 🔐 Forgot Password
app.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    const lookupValue = isPhone(identifier) ? normalizePhone(identifier) : identifier.toLowerCase();
    const lookupField = isPhone(identifier) ? 'phone_number' : 'email';

    const userResult = await pool.query(
      `SELECT id, email, phone_number FROM users WHERE ${lookupField} = $1`,
      [lookupValue]
    );

    if (userResult.rows.length === 0) {
      return res.status(200).json({ message: 'If the account exists, an OTP has been sent' });
    }

    const userId = userResult.rows[0].id;
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO password_resets (user_id, otp, expires_at, used) VALUES ($1, $2, $3, false)',
      [userId, otp, expiresAt]
    );

    const response = { message: 'OTP generated' };
    if (lookupField === 'email' && smtpEnabled) {
      await sendOtpEmail(userResult.rows[0].email, otp);
      response.message = 'OTP sent by email';
    } else if (lookupField === 'phone_number' && twilioEnabled) {
      await sendOtpSms(userResult.rows[0].phone_number, otp);
      response.message = 'OTP sent by SMS';
    } else {
      response.message = 'OTP generated but delivery provider is not configured';
      response.otp = otp;
    }

    return res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to send OTP' });
  }
});

// 🔐 Reset Password
app.post('/reset-password', async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ error: 'Identifier, OTP, and new password are required' });
    }

    const lookupValue = isPhone(identifier) ? normalizePhone(identifier) : identifier.toLowerCase();
    const lookupField = isPhone(identifier) ? 'phone_number' : 'email';

    const userResult = await pool.query(
      `SELECT id FROM users WHERE ${lookupField} = $1`,
      [lookupValue]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid identifier or OTP' });
    }

    const userId = userResult.rows[0].id;
    const resetResult = await pool.query(
      `SELECT id FROM password_resets
       WHERE user_id = $1 AND otp = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, otp]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    await pool.query('UPDATE password_resets SET used = true WHERE id = $1', [resetResult.rows[0].id]);

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to reset password' });
  }
});


/* ================= LOCATIONS (Admin) ================= */

// Get all locations
app.get('/admin/locations', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Create a location
app.post('/admin/locations', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Location name is required' });
    const result = await pool.query(
      'INSERT INTO locations (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json({ message: 'Location created', location: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Location already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Delete a location
app.delete('/admin/locations/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Location not found' });
    res.json({ message: 'Location deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});


/* ================= USERS (Admin) ================= */

// Get all users (admin view)
app.get('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
        COALESCE(json_agg(json_build_object('id', l.id, 'name', l.name)) FILTER (WHERE l.id IS NOT NULL), '[]') AS locations
       FROM users u
       LEFT JOIN user_locations ul ON ul.user_id = u.id
       LEFT JOIN locations l ON l.id = ul.location_id
       GROUP BY u.id ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a user (admin only)
app.post('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone_number, role, locationIds } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

    const validRoles = ['admin', 'user'];
    const userRole = validRoles.includes(role) ? role : 'user';

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedPhone = phone_number ? normalizePhone(phone_number) : null;

    const userResult = await pool.query(
      'INSERT INTO users (name, email, password, phone_number, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      [name, email.toLowerCase(), hashedPassword, normalizedPhone, userRole]
    );
    const newUserId = userResult.rows[0].id;

    if (Array.isArray(locationIds) && locationIds.length > 0 && userRole === 'user') {
      for (const locId of locationIds) {
        await pool.query(
          'INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newUserId, locId]
        );
      }
    }

    res.status(201).json({ message: 'User created', user: userResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete a user (admin only)
app.delete('/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own admin account' });
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Assign locations to a user (admin only)
app.put('/admin/users/:id/locations', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { locationIds } = req.body;
    if (!Array.isArray(locationIds)) return res.status(400).json({ error: 'locationIds must be an array' });

    await pool.query('DELETE FROM user_locations WHERE user_id = $1', [userId]);
    for (const locId of locationIds) {
      await pool.query(
        'INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, locId]
      );
    }
    res.json({ message: 'Locations updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update locations' });
  }
});


/* ================= 404 ================= */

console.log("Routes added");

app.use((req, res) => {
  console.log("404 hit for", req.method, req.path);
  res.status(404).json({ error: 'Route not found' });
});


/* ================= START SERVER ================= */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});