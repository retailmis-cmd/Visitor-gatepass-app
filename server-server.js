require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { BigQuery } = require('@google-cloud/bigquery');

// ================= BIGQUERY =================
let bigquery = null;
const BQ_PROJECT = 'bcivpl-store-level';
const BQ_DATASET = 'visitor_app';

try {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const credentials = JSON.parse(serviceAccountJson);
    bigquery = new BigQuery({ projectId: BQ_PROJECT, credentials });
    console.log('BigQuery client initialized');
  } else {
    console.log('GOOGLE_SERVICE_ACCOUNT_JSON not set — BigQuery disabled');
  }
} catch (err) {
  console.error('BigQuery init failed:', err.message);
}

const bqInsertVisitor = async (row) => {
  if (!bigquery) return;
  try {
    await bigquery.dataset(BQ_DATASET).table('visitors').insert([{
      id: row.id,
      date: row.date ? String(row.date).slice(0, 10) : null,
      visitor_id: row.visitor_id || null,
      name: row.name || null,
      coming_from: row.coming_from || null,
      company: row.company || null,
      location: row.location || null,
      phone_number: row.phone_number || null,
      purpose: row.purpose || null,
      person_to_meet: row.person_to_meet || null,
      scheduled: row.scheduled || null,
      in_time: row.in_time || null,
      out_time: row.out_time ? String(row.out_time).slice(0, 5) : null,
    }]);
    console.log(`BQ: visitor ${row.visitor_id} inserted`);
  } catch (err) {
    console.error('BQ visitor insert failed:', err.message);
  }
};

const bqInsertConsignment = async (row) => {
  if (!bigquery) return;
  try {
    await bigquery.dataset(BQ_DATASET).table('consignments').insert([{
      id: row.id,
      date: row.date ? String(row.date).slice(0, 10) : null,
      gp_number: row.gp_number || null,
      type: row.type || null,
      document_number: row.document_number || null,
      document_type: row.document_type || null,
      in_time: row.in_time || null,
      vehicle_number: row.vehicle_number || null,
      driver_contact: row.driver_contact || null,
      qty: row.qty ? String(row.qty) : null,
      package_type: row.package_type || null,
      comment: row.comment || null,
      security_name: row.security_name || null,
      location: row.location || null,
    }]);
    console.log(`BQ: consignment ${row.gp_number} inserted`);
  } catch (err) {
    console.error('BQ consignment insert failed:', err.message);
  }
};

const JWT_SECRET = process.env.JWT_SECRET || 'visitor_app_jwt_secret_change_in_production';

// ================= AUTH MIDDLEWARE =================
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
const PORT = process.env.PORT || 5000;

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================= HELPERS =================
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const normalizePhone = (v) => (v ? v.replace(/\D/g, '') : '');
const isPhone = (v) => /^\+?[0-9][0-9\-\s().]{5,}$/.test(v);

// ================= OTP STORE =================
const otpStore = {};

// ================= DB MIGRATION =================
// Auto-add columns to dropdown_options if missing
(async () => {
  try {
    await pool.query(`ALTER TABLE dropdown_options ADD COLUMN IF NOT EXISTS phone_number VARCHAR;`);
    await pool.query(`ALTER TABLE dropdown_options ADD COLUMN IF NOT EXISTS whatsapp_apikey VARCHAR;`);
    await pool.query(`ALTER TABLE dropdown_options ADD COLUMN IF NOT EXISTS email VARCHAR;`);
    // Allow email to be NULL for user accounts (admins always have email)
    await pool.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`);
  } catch (err) {
    console.error('Migration warning:', err.message);
  }
})();

// ================= WHATSAPP (Green API) =================
// Free Developer plan: 500 messages/month, no expiry.
// Sign up at https://green-api.com, create an instance, scan QR with your WhatsApp.
// Set env vars: GREENAPI_INSTANCE_ID and GREENAPI_TOKEN

const GREENAPI_INSTANCE = process.env.GREENAPI_INSTANCE_ID;
const GREENAPI_TOKEN = process.env.GREENAPI_TOKEN;

const sendWhatsAppNotification = async ({
  toPhone,
  visitorName,
  company,
  personToMeet,
  purpose,
  location,
  inTime,
}) => {
  if (!GREENAPI_INSTANCE || !GREENAPI_TOKEN) {
    console.log('WhatsApp not configured — skipping notification');
    return;
  }

  if (!toPhone) {
    console.log(`WhatsApp skipped — no phone number for ${personToMeet}`);
    return;
  }

  // Normalize phone
  let phone = String(toPhone).replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;

  const message =
    `Hello ${personToMeet},\n\n` +
    `📋 *Visitor Arrival Notification*\n\n` +
    `👤 *Name:* ${visitorName}\n` +
    `🏢 *Company:* ${company}\n` +
    `🎯 *Purpose:* ${purpose}\n` +
    `📍 *Location:* ${location}\n` +
    `🕐 *Time:* ${inTime}\n\n` +
    `Please proceed to the reception to meet your visitor.`;

  try {
    const url = `https://api.green-api.com/waInstance${GREENAPI_INSTANCE}/sendMessage/${GREENAPI_TOKEN}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${phone}@c.us`,
        message,
      }),
    });

    // ✅ Handle HTTP errors
    if (!resp.ok) {
      console.error(`Green API HTTP error: ${resp.status}`);
      return;
    }

    const data = await resp.json();

    if (data.idMessage) {
      console.log(`WhatsApp sent successfully`);
    } else {
      console.error('Green API error:', data);
    }
  } catch (err) {
    console.error('WhatsApp send failed:', err.message);
  }
};

// ================= WHATSAPP KEEP-ALIVE =================
app.get('/whatsapp-keepalive', async (req, res) => {
  if (!GREENAPI_INSTANCE || !GREENAPI_TOKEN) {
    return res.json({ status: 'skipped', reason: 'credentials not set' });
  }
  try {
    const url = `https://api.green-api.com/waInstance${GREENAPI_INSTANCE}/getStateInstance/${GREENAPI_TOKEN}`;
    const resp = await fetch(url);
    const data = await resp.json();
    res.json({ status: 'ok', instanceState: data.stateInstance });
  } catch (err) {
    res.json({ status: 'error', error: err.message });
  }
});

// ================= WHATSAPP TEST ENDPOINT =================
// Call: GET /test-whatsapp?phone=91XXXXXXXXXX
app.get('/test-whatsapp', async (req, res) => {
  const phone = req.query.phone;
  if (!phone) return res.json({ error: 'Pass ?phone=91XXXXXXXXXX' });

  const instanceSet = !!GREENAPI_INSTANCE;
  const tokenSet = !!GREENAPI_TOKEN;

  if (!instanceSet || !tokenSet) {
    return res.json({
      error: 'Green API credentials not configured',
      GREENAPI_INSTANCE_ID: instanceSet ? 'SET' : 'NOT SET',
      GREENAPI_TOKEN: tokenSet ? 'SET' : 'NOT SET',
    });
  }

  try {
    const url = `https://api.green-api.com/waInstance${GREENAPI_INSTANCE}/sendMessage/${GREENAPI_TOKEN}`;
    let normalizedPhone = String(phone).replace(/\D/g, '');
    if (normalizedPhone.length === 10) normalizedPhone = '91' + normalizedPhone;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${normalizedPhone}@c.us`, message: 'Test message from Visitor App' }),
    });
    const data = await resp.json();
    return res.json({
      GREENAPI_INSTANCE_ID: 'SET',
      GREENAPI_TOKEN: 'SET',
      phone: normalizedPhone,
      greenApiResponse: data,
      success: !!data.idMessage,
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ================= SMTP =================
const smtpEnabled =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.OTP_FROM_EMAIL;

const transporter = smtpEnabled
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

const sendOtpEmail = async (to, otp) => {
  if (!transporter) throw new Error("SMTP not configured");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Roboto Condensed', Arial, sans-serif; background: #f4f4f4; }
          .container { max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; color: #ff8a00; margin-bottom: 20px; }
          .otp-box { background: #0c1530; color: #ff8a00; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #ff8a00; }
          .otp-text { font-size: 32px; font-weight: bold; letter-spacing: 2px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔐 Visitor Manager - Password Reset</h2>
          </div>
          
          <p>Hello,</p>
          <p>You requested a password reset for your Visitor Manager account.</p>
          
          <p><strong>Your OTP (One-Time Password) is:</strong></p>
          <div class="otp-box">
            <div class="otp-text">${otp}</div>
          </div>
          
          <p style="color: #999;">⏱️ This OTP is valid for <strong>10 minutes</strong>.</p>
          
          <p><strong>⚠️ Security Notice:</strong></p>
          <ul>
            <li>Never share your OTP with anyone</li>
            <li>Visitor Manager team will never ask for your OTP</li>
            <li>If you didn't request this, please ignore this email</li>
          </ul>
          
          <div class="footer">
            <p>© 2024 Visitor Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.OTP_FROM_EMAIL,
    to,
    subject: '🔐 Your Password Reset OTP - Visitor Manager',
    html: htmlContent,
  });
};

// ================= HEALTH =================
app.get('/health', async (req, res) => {
  res.json({ status: 'ok' });
});

// ================= BIGQUERY DAILY SYNC =================
// Triggered by cron-job.org every night at midnight
// Syncs yesterday's visitors and consignments to BigQuery
app.get('/bigquery-sync', async (req, res) => {
  if (!bigquery) return res.json({ status: 'skipped', reason: 'BigQuery not configured' });
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    // Sync visitors
    const vResult = await pool.query(
      `SELECT id, date, visitor_id, name, coming_from, company, location, phone_number,
              purpose, person_to_meet, scheduled, in_time, out_time
       FROM visitors WHERE DATE(date) = $1`, [dateStr]
    );
    if (vResult.rows.length > 0) {
      // Delete existing rows for this date to avoid duplicates
      await bigquery.dataset(BQ_DATASET).table('visitors').query(
        `DELETE FROM \`${BQ_PROJECT}.${BQ_DATASET}.visitors\` WHERE date = '${dateStr}'`
      ).catch(() => {}); // ignore if table empty
      const vRows = vResult.rows.map(r => ({
        id: r.id, date: dateStr, visitor_id: r.visitor_id || null,
        name: r.name || null, coming_from: r.coming_from || null,
        company: r.company || null, location: r.location || null,
        phone_number: r.phone_number || null, purpose: r.purpose || null,
        person_to_meet: r.person_to_meet || null, scheduled: r.scheduled || null,
        in_time: r.in_time || null,
        out_time: r.out_time ? String(r.out_time).slice(0, 5) : null,
      }));
      await bigquery.dataset(BQ_DATASET).table('visitors').insert(vRows);
    }

    // Sync consignments
    const cResult = await pool.query(
      `SELECT id, date, gp_number, type, document_number, document_type, in_time,
              vehicle_number, driver_contact, qty, package_type, comment, security_name, location
       FROM consignments WHERE DATE(date) = $1`, [dateStr]
    );
    if (cResult.rows.length > 0) {
      await bigquery.dataset(BQ_DATASET).table('consignments').query(
        `DELETE FROM \`${BQ_PROJECT}.${BQ_DATASET}.consignments\` WHERE date = '${dateStr}'`
      ).catch(() => {});
      const cRows = cResult.rows.map(r => ({
        id: r.id, date: dateStr, gp_number: r.gp_number || null,
        type: r.type || null, document_number: r.document_number || null,
        document_type: r.document_type || null, in_time: r.in_time || null,
        vehicle_number: r.vehicle_number || null, driver_contact: r.driver_contact || null,
        qty: r.qty ? String(r.qty) : null, package_type: r.package_type || null,
        comment: r.comment || null, security_name: r.security_name || null,
        location: r.location || null,
      }));
      await bigquery.dataset(BQ_DATASET).table('consignments').insert(cRows);
    }

    res.json({
      status: 'ok', date: dateStr,
      visitors_synced: vResult.rows.length,
      consignments_synced: cResult.rows.length,
    });
  } catch (err) {
    console.error('BQ sync error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ================= AUTH =================

// SIGNUP — disabled, accounts are created by admin only
app.post('/signup', (req, res) => {
  res.status(403).json({ error: 'Self-registration is disabled. Contact your administrator to create an account.' });
});

// LOGIN
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Username/email and password are required' });

    // Try email lookup first; fall back to case-insensitive name lookup for users without email
    let result = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email.toLowerCase()]
    );
    if (!result.rows.length) {
      result = await pool.query(
        'SELECT * FROM users WHERE LOWER(name)=$1',
        [email.toLowerCase()]
      );
    }

    if (!result.rows.length)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ error: 'Invalid credentials' });

    // Fetch assigned locations for regular users
    const locResult = await pool.query(
      `SELECT l.name FROM locations l
       JOIN user_locations ul ON ul.location_id = l.id
       WHERE ul.user_id = $1`,
      [user.id]
    );
    const assignedLocations = locResult.rows.map((r) => r.name);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, assignedLocations },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ================= PASSWORD RESET =================

// SEND OTP — admin accounts only
app.post('/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if user exists and is an admin
    const result = await pool.query(
      'SELECT id, role FROM users WHERE email=$1',
      [email.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Email not registered' });
    }

    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Password reset is only available for admin accounts. Please contact your administrator to reset your password.' });
    }

    // Generate OTP
    const otp = generateOtp();
    otpStore[email.toLowerCase()] = {
      otp,
      timestamp: Date.now(),
    };

    // Send email
    await sendOtpEmail(email, otp);

    console.log(`✅ OTP sent to ${email}: ${otp}`);
    res.json({
      success: true,
      message: 'OTP sent to your email successfully',
    });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message,
    });
  }
});

// VERIFY OTP
app.post('/auth/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP required' });
    }

    const storedData = otpStore[email.toLowerCase()];

    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No OTP request found' });
    }

    // Check if OTP expired (10 minutes)
    if (Date.now() - storedData.timestamp > 10 * 60 * 1000) {
      delete otpStore[email.toLowerCase()];
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP verified successfully
    delete otpStore[email.toLowerCase()];
    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message,
    });
  }
});

// RESET PASSWORD
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT id FROM users WHERE email=$1',
      [email.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await pool.query(
      'UPDATE users SET password=$1 WHERE email=$2',
      [hash, email.toLowerCase()]
    );

    console.log(`✅ Password reset for ${email}`);
    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message,
    });
  }
});

// ================= VISITORS =================

app.get('/visitors/next-id', authenticate, async (req, res) => {
  try {
    const r = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM visitors');
    const num = String(r.rows[0].n).padStart(4, '0');
    res.json({ visitorId: `BCNMV-${num}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch next ID' });
  }
});

app.post('/visitor', async (req, res) => {
  try {
    const {
      date,
      in_time,
      name,
      coming_from,
      company,
      location,
      phone_number,
      purpose,
      person_to_meet,
      scheduled,
      out_time,
      photo,
    } = req.body;

    // Validation for mandatory fields
    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!in_time) return res.status(400).json({ error: 'In time is required' });
    if (!name) return res.status(400).json({ error: 'Visitor name is required' });
    if (!coming_from) return res.status(400).json({ error: 'Coming from is required' });
    if (!company) return res.status(400).json({ error: 'Company is required' });
    if (!phone_number) return res.status(400).json({ error: 'Phone number is required' });
    if (!purpose) return res.status(400).json({ error: 'Purpose is required' });
    if (!person_to_meet) return res.status(400).json({ error: 'Person to meet is required' });
    if (!scheduled) return res.status(400).json({ error: 'Scheduled status is required' });
    if (!location) return res.status(400).json({ error: 'Location is required' });
    if (!photo) return res.status(400).json({ error: 'Photo is required' });

    const insertResult = await pool.query(
      `INSERT INTO visitors 
       (date, in_time, name, coming_from, company, location, phone_number, purpose, person_to_meet, scheduled, out_time, photo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [date, in_time, name, coming_from, company, location, phone_number, purpose, person_to_meet, scheduled, out_time || null, photo]
    );
    const row = insertResult.rows[0];
    const visitorId = `BCNMV-${String(row.id).padStart(4, '0')}`;
    await pool.query('UPDATE visitors SET visitor_id = $1 WHERE id = $2', [visitorId, row.id]);
    row.visitor_id = visitorId;

    // Send WhatsApp + Email notification to person_to_meet
    try {
      const contactRow = await pool.query(
        'SELECT phone_number, email FROM dropdown_options WHERE category = $1 AND value = $2 LIMIT 1',
        ['person_to_meet', person_to_meet]
      );
      const toPhone = contactRow.rows[0]?.phone_number;
      const toEmail = contactRow.rows[0]?.email;

      // WhatsApp
      if (toPhone) {
        await sendWhatsAppNotification({
          toPhone,
          visitorName: name,
          company,
          personToMeet: person_to_meet,
          purpose,
          location,
          inTime: in_time,
        });
      }

      // Email
      if (toEmail && smtpEnabled && transporter) {
        await transporter.sendMail({
          from: process.env.OTP_FROM_EMAIL,
          to: toEmail,
          subject: `Visitor Arrival: ${name} is here to meet you`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
              <div style="background:#ff8a00;padding:16px 24px">
                <h2 style="color:#fff;margin:0">Visitor Arrival Notification</h2>
              </div>
              <div style="padding:24px">
                <p style="margin:0 0 16px">Hello <strong>${person_to_meet}</strong>,</p>
                <p style="margin:0 0 16px">A visitor has arrived to meet you.</p>
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold;width:40%">Name</td><td style="padding:8px">${name}</td></tr>
                  <tr><td style="padding:8px;font-weight:bold">Company</td><td style="padding:8px">${company}</td></tr>
                  <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Purpose</td><td style="padding:8px;background:#f9f9f9">${purpose}</td></tr>
                  <tr><td style="padding:8px;font-weight:bold">Location</td><td style="padding:8px">${location}</td></tr>
                  <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">In Time</td><td style="padding:8px;background:#f9f9f9">${in_time}</td></tr>
                </table>
                <p style="margin:16px 0 0;color:#888;font-size:12px">Please proceed to the reception to meet your visitor.</p>
              </div>
            </div>`,
        });
        console.log(`Email notification sent to ${toEmail} for visitor ${name}`);
      }
    } catch (notifErr) {
      console.error('Notification failed:', notifErr.message);
    }

    // BigQuery real-time insert (fire-and-forget)
    bqInsertVisitor(row);

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add visitor', detail: err.message });
  }
});

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

app.delete('/visitors/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM visitors WHERE id=$1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Visitor not found' });

    res.json({ message: 'Visitor deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete visitor' });
  }
});

app.put('/visitors/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, in_time, out_time, name, coming_from, company, location, phone_number, purpose, person_to_meet, scheduled } = req.body;
    const result = await pool.query(
      `UPDATE visitors SET date=$1, in_time=$2, out_time=$3, name=$4, coming_from=$5, company=$6, location=$7, phone_number=$8, purpose=$9, person_to_meet=$10, scheduled=$11 WHERE id=$12 RETURNING *`,
      [date, in_time, out_time || null, name, coming_from, company, location, phone_number, purpose, person_to_meet, scheduled, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visitor not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update visitor' });
  }
});

app.patch('/visitors/:id/out-time', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { out_time } = req.body;
    if (!out_time) return res.status(400).json({ error: 'out_time is required' });
    const result = await pool.query(
      'UPDATE visitors SET out_time = $1 WHERE id = $2 RETURNING id, out_time',
      [out_time, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visitor not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update out time' });
  }
});

// ================= CONSIGNMENTS =================

app.get('/consignments/next-gp', authenticate, async (req, res) => {
  try {
    const r = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM consignments');
    const num = String(r.rows[0].n).padStart(4, '0');
    res.json({ gpNumber: `BCNM-${num}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch next GP number' });
  }
});

app.post('/consignment', async (req, res) => {
  try {
    const {
      date,
      type,
      document_number,
      document_type,
      in_time,
      vehicle_number,
      driver_contact,
      qty,
      package_type,
      comment,
      photo,
      security_name,
      location,
    } = req.body;

    // Validation for mandatory fields
    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!type) return res.status(400).json({ error: 'Type is required' });
    if (!document_number) return res.status(400).json({ error: 'Document Number is required' });
    if (!document_type) return res.status(400).json({ error: 'Document Type is required' });
    if (!in_time) return res.status(400).json({ error: 'In-Time is required' });
    if (!vehicle_number) return res.status(400).json({ error: 'Vehicle Number is required' });
    if (!driver_contact) return res.status(400).json({ error: 'Driver Contact is required' });
    if (!qty) return res.status(400).json({ error: 'Qty is required' });
    if (!package_type) return res.status(400).json({ error: 'Package Type is required' });
    if (!comment) return res.status(400).json({ error: 'Comment is required' });
    if (!photo) return res.status(400).json({ error: 'Photo is required' });
    if (!security_name) return res.status(400).json({ error: 'Security Name is required' });

    const insertResult = await pool.query(
      `INSERT INTO consignments 
       (date, type, document_number, document_type, in_time, vehicle_number, driver_contact, qty, package_type, comment, photo, security_name, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [date, type, document_number, document_type, in_time, vehicle_number, driver_contact, qty, package_type, comment, photo, security_name, location || null]
    );
    const row = insertResult.rows[0];
    const gpNumber = `BCNM-${String(row.id).padStart(4, '0')}`;
    await pool.query('UPDATE consignments SET gp_number = $1 WHERE id = $2', [gpNumber, row.id]);
    row.gp_number = gpNumber;

    // BigQuery real-time insert (fire-and-forget)
    bqInsertConsignment(row);

    res.json(row);
  } catch (err) {
    console.error("CONS ERROR:", err);
    res.status(500).json({ error: 'Failed to add consignment', detail: err.message });
  }
});

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

app.delete('/consignments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM consignments WHERE id=$1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Consignment not found' });

    res.json({ message: 'Consignment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete consignment' });
  }
});

app.put('/consignments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, document_number, document_type, in_time, vehicle_number, driver_contact, qty, package_type, comment, security_name, location } = req.body;
    const result = await pool.query(
      `UPDATE consignments SET date=$1, type=$2, document_number=$3, document_type=$4, in_time=$5, vehicle_number=$6, driver_contact=$7, qty=$8, package_type=$9, comment=$10, security_name=$11, location=$12 WHERE id=$13 RETURNING *`,
      [date, type, document_number, document_type, in_time, vehicle_number, driver_contact, qty, package_type, comment, security_name, location, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Consignment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update consignment' });
  }
});

// ================= LOCATIONS (Public) =================

app.get('/locations', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// ================= LOCATIONS (Admin) =================

app.get('/admin/locations', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

app.post('/admin/locations', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Location name is required' });
    const result = await pool.query('INSERT INTO locations (name) VALUES ($1) RETURNING *', [name.trim()]);
    res.status(201).json({ message: 'Location created', location: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Location already exists' });
    res.status(500).json({ error: 'Failed to create location' });
  }
});

app.delete('/admin/locations/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Location not found' });
    res.json({ message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// ================= USERS (Admin) =================

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
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone_number, role, locationIds } = req.body;
    const userRole = ['admin', 'user'].includes(role) ? role : 'user';

    // Email is required for admin accounts; optional for regular users
    if (!name || !password) return res.status(400).json({ error: 'Name and password are required' });
    if (userRole === 'admin' && !email) return res.status(400).json({ error: 'Email is required for admin accounts' });

    // Check uniqueness: by email if provided, otherwise by name for users
    if (email) {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'A user with this email already exists' });
    } else {
      const existing = await pool.query('SELECT id FROM users WHERE LOWER(name) = $1 AND email IS NULL', [name.toLowerCase()]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'A user with this name already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedPhone = phone_number ? normalizePhone(phone_number) : null;
    const emailValue = email ? email.toLowerCase() : null;

    const userResult = await pool.query(
      'INSERT INTO users (name, email, password, phone_number, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      [name, emailValue, hashedPassword, normalizedPhone, userRole]
    );
    const newUserId = userResult.rows[0].id;
    if (Array.isArray(locationIds) && locationIds.length > 0 && userRole === 'user') {
      for (const locId of locationIds) {
        await pool.query('INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newUserId, locId]);
      }
    }
    res.status(201).json({ message: 'User created', user: userResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.delete('/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own admin account' });
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.put('/admin/users/:id/locations', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { locationIds } = req.body;
    if (!Array.isArray(locationIds)) return res.status(400).json({ error: 'locationIds must be an array' });
    await pool.query('DELETE FROM user_locations WHERE user_id = $1', [userId]);
    for (const locId of locationIds) {
      await pool.query('INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, locId]);
    }
    res.json({ message: 'Locations updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update locations' });
  }
});

// ================= DROPDOWN OPTIONS =================

app.get('/dropdown-options', authenticate, async (req, res) => {
  try {
    const { category } = req.query;
    const result = category
      ? await pool.query('SELECT id, value, phone_number, whatsapp_apikey FROM dropdown_options WHERE category = $1 ORDER BY value ASC', [category])
      : await pool.query('SELECT id, category, value, phone_number, whatsapp_apikey FROM dropdown_options ORDER BY category, value ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dropdown options' });
  }
});

app.post('/admin/dropdown-options', authenticate, requireAdmin, async (req, res) => {
  try {
    const { category, value, phone_number, whatsapp_apikey, email } = req.body;
    if (!category || !value || !value.trim()) return res.status(400).json({ error: 'Category and value are required' });
    const result = await pool.query(
      'INSERT INTO dropdown_options (category, value, phone_number, whatsapp_apikey, email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category, value.trim(), phone_number ? phone_number.trim() : null, whatsapp_apikey ? whatsapp_apikey.trim() : null, email ? email.trim() : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Option already exists' });
    if (err.code === '23514') return res.status(400).json({ error: 'Invalid category. Use: purpose, person_to_meet, or security_name' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create option' });
  }
});

app.put('/admin/dropdown-options/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const { phone_number, email } = req.body;
    const result = await pool.query(
      'UPDATE dropdown_options SET phone_number = $1, email = $2 WHERE id = $3 RETURNING *',
      [phone_number ? phone_number.trim() : null, email ? email.trim() : null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Option not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update option' });
  }
});

app.delete('/admin/dropdown-options/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const result = await pool.query('DELETE FROM dropdown_options WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Option not found' });
    res.json({ message: 'Option deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

// ================= REPORTS =================

// GET VISITORS REPORT BY DATE RANGE
app.get('/reports/visitors', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    console.log(`📊 Fetching visitors from ${startDate} to ${endDate}`);

    const result = await pool.query(
      `SELECT id, date, visitor_id, name, coming_from, company, location, 
              phone_number, purpose, person_to_meet, scheduled, in_time, out_time, photo
       FROM visitors 
       WHERE DATE(date) BETWEEN $1::DATE AND $2::DATE 
       ORDER BY date DESC`,
      [startDate, endDate]
    );

    // Convert photos: pass Cloudinary URLs as-is, convert raw buffers only
    const rows = result.rows.map(row => {
      if (row.photo) {
        try {
          if (Buffer.isBuffer(row.photo)) {
            row.photo = 'data:image/jpeg;base64,' + row.photo.toString('base64');
          }
          // If it's already a URL or data URI, leave it unchanged
        } catch (photoErr) {
          console.warn(`Failed to convert photo for visitor ${row.id}:`, photoErr.message);
          row.photo = null;
        }
      }
      return row;
    });

    console.log(`✅ Found ${result.rows.length} visitor records`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Visitor report error:', err);
    res.status(500).json({ error: 'Failed to fetch visitor report', details: err.message });
  }
});

// GET CONSIGNMENTS REPORT BY DATE RANGE
app.get('/reports/consignments', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    console.log(`📊 Fetching consignments from ${startDate} to ${endDate}`);

    const result = await pool.query(
      `SELECT id, date, gp_number, type, document_number, document_type, 
              in_time, vehicle_number, driver_contact, qty, package_type, 
              comment, security_name, photo
       FROM consignments 
       WHERE DATE(date) BETWEEN $1::DATE AND $2::DATE 
       ORDER BY date DESC`,
      [startDate, endDate]
    );

    // Convert photos: pass Cloudinary URLs as-is, convert raw buffers only
    const rows = result.rows.map(row => {
      if (row.photo) {
        try {
          if (Buffer.isBuffer(row.photo)) {
            row.photo = 'data:image/jpeg;base64,' + row.photo.toString('base64');
          }
          // If it's already a URL or data URI, leave it unchanged
        } catch (photoErr) {
          console.warn(`Failed to convert photo for consignment ${row.id}:`, photoErr.message);
          row.photo = null;
        }
      }
      return row;
    });

    console.log(`✅ Found ${result.rows.length} consignment records`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Consignment report error:', err);
    res.status(500).json({ error: 'Failed to fetch consignment report', details: err.message });
  }
});

// ================= 404 =================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ================= START =================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📧 Email configured: ${process.env.SMTP_USER}`);
  });
}

module.exports = app;