import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
  Box, Card, CardHeader, CardContent, TextField, MenuItem,
  Button, Stack, Avatar,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteIcon from '@mui/icons-material/Delete';

const getToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

const uploadToCloudinary = async (base64Image) => {
  const formData = new FormData();
  formData.append('file', base64Image);
  formData.append('upload_preset', 'ebnzge39');
  const res = await fetch('https://api.cloudinary.com/v1_1/de1lhfxdx/image/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Photo upload to Cloudinary failed');
  return data.secure_url;
};

export default function VisitorForm({ apiUrl, onVisitorAdded, token, user, onDirty }) {
  const [date, setDate] = useState(getToday());
  const [visitorIdPreview, setVisitorIdPreview] = useState('Loading...');
  const [name, setName] = useState('');
  const [coming_from, setComingFrom] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [personToMeet, setPersonToMeet] = useState('');
  const [scheduled, setScheduled] = useState('');
  const [in_time, setInTime] = useState(getCurrentTime());
  const [out_time, setOutTime] = useState('');
  const [photo, setPhoto] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [purposeOptions, setPurposeOptions] = useState([]);
  const [personOptions, setPersonOptions] = useState([]);
  const webcamRef = useRef(null);

  const authHeaders = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  const markDirty = () => { if (onDirty) onDirty(true); };

  // Fetch locations for this user
  useEffect(() => {
    const fetchLocations = async () => {
      if (user?.role === 'admin') {
        try {
          const res = await fetch(`${apiUrl}/locations`, { headers: authHeaders });
          const data = await res.json();
          setAvailableLocations(Array.isArray(data) ? data.map((l) => l.name) : []);
        } catch { setAvailableLocations([]); }
      } else if (user?.assignedLocations?.length > 0) {
        setAvailableLocations(user.assignedLocations);
        if (user.assignedLocations.length === 1) setLocation(user.assignedLocations[0]);
      }
    };
    fetchLocations();
  }, [user]);

  // Fetch next visitor ID and dropdown options
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [idRes, purposeRes, personRes] = await Promise.all([
          fetch(`${apiUrl}/visitors/next-id`, { headers: authHeaders }),
          fetch(`${apiUrl}/dropdown-options?category=purpose`, { headers: authHeaders }),
          fetch(`${apiUrl}/dropdown-options?category=person_to_meet`, { headers: authHeaders }),
        ]);
        const idData = await idRes.json();
        if (idData.visitorId) setVisitorIdPreview(idData.visitorId);
        const purpData = await purposeRes.json();
        if (Array.isArray(purpData)) setPurposeOptions(purpData.map((o) => o.value));
        const personData = await personRes.json();
        if (Array.isArray(personData)) setPersonOptions(personData.map((o) => o.value));
      } catch { /* silently fail */ }
    };
    fetchData();
  }, []);

  const capture = () => {
    const src = webcamRef.current.getScreenshot();
    if (src) { setPhoto(src); setCameraOpen(false); markDirty(); }
  };

  const resetForm = () => {
    setDate(getToday());
    setName('');
    setComingFrom('');
    setCompany('');
    setLocation(user?.assignedLocations?.length === 1 ? user.assignedLocations[0] : '');
    setPhone('');
    setPurpose('');
    setPersonToMeet('');
    setScheduled('');
    setInTime(getCurrentTime());
    setOutTime('');
    setPhoto('');
    // Re-fetch next ID preview
    fetch(`${apiUrl}/visitors/next-id`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => { if (d.visitorId) setVisitorIdPreview(d.visitorId); })
      .catch(() => { setVisitorIdPreview('Auto'); });
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!date.trim()) { alert('❌ Date is required'); return; }
    if (!name.trim()) { alert('❌ Visitor name is required'); return; }
    if (!coming_from.trim()) { alert('❌ Coming from is required'); return; }
    if (!company.trim()) { alert('❌ Company is required'); return; }
    if (!phone.trim()) { alert('❌ Phone number is required'); return; }
    if (!in_time.trim()) { alert('❌ In time is required'); return; }
    if (!purpose.trim()) { alert('❌ Purpose is required'); return; }
    if (!personToMeet.trim()) { alert('❌ Person to meet is required'); return; }
    if (!scheduled.trim()) { alert('❌ Scheduled status is required'); return; }
    if (!location.trim()) { alert('❌ Location is required'); return; }
    if (!photo) { alert('❌ Photo is required'); return; }
    setSaving(true);
    try {
      const photoUrl = await uploadToCloudinary(photo);
      const res = await fetch(`${apiUrl}/visitor`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          date,
          in_time,
          name,
          coming_from,
          company,
          location,
          phone_number: phone,
          purpose,
          person_to_meet: personToMeet,
          scheduled,
          out_time,
          photo: photoUrl,
        }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Backend not hit (HTML returned)'); }
      if (!res.ok) throw new Error((data.error || 'Unable to save visitor.') + (data.detail ? ': ' + data.detail : ''));
      if (onDirty) onDirty(false);
      resetForm();
      onVisitorAdded();
      alert(`✅ Visitor added successfully! ID: ${data.visitor_id}`);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title="Add Visitor" subheader="Capture visitor details and mandatory webcam photo" />
      <CardContent>
        <Box component="form" onSubmit={submit}>
          <Stack spacing={3}>
            {/* ROW 1: Date and Visitor ID (auto) */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Date"
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); markDirty(); }}
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="Visitor ID (Auto)"
                value={visitorIdPreview}
                fullWidth
                InputProps={{ readOnly: true }}
                inputProps={{ style: { color: '#ff8a00', fontWeight: 700 } }}
              />
            </Stack>

            {/* ROW 2: In Time and Out Time */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="In Time"
                type="time"
                value={in_time}
                onChange={(e) => { setInTime(e.target.value); markDirty(); }}
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="Out Time"
                type="time"
                value={out_time}
                onChange={(e) => { setOutTime(e.target.value); markDirty(); }}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {/* Visitor Name */}
            <TextField
              label="Visitor Name"
              value={name}
              onChange={(e) => { setName(e.target.value.toUpperCase()); markDirty(); }}
              placeholder="ENTER VISITOR NAME"
              fullWidth
              required
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />

            {/* ROW 3: Coming From and Company */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Coming From"
                value={coming_from}
                onChange={(e) => { setComingFrom(e.target.value.toUpperCase()); markDirty(); }}
                placeholder="ENTER COMPANY/LOCATION"
                fullWidth
                required
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
              <TextField
                label="Company"
                value={company}
                onChange={(e) => { setCompany(e.target.value.toUpperCase()); markDirty(); }}
                placeholder="ENTER COMPANY"
                fullWidth
                required
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Stack>

            {/* ROW 4: Phone Number and Scheduled */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Phone Number"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); markDirty(); }}
                placeholder="Enter phone number"
                fullWidth
                required
              />
              <TextField
                label="Scheduled"
                value={scheduled}
                onChange={(e) => { setScheduled(e.target.value); markDirty(); }}
                select
                fullWidth
                required
              >
                <MenuItem value="">-- Select --</MenuItem>
                <MenuItem value="YES">YES</MenuItem>
                <MenuItem value="NO">NO</MenuItem>
              </TextField>
            </Stack>

            {/* ROW 5: Purpose and Person to Meet (dropdowns) */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Purpose"
                value={purpose}
                onChange={(e) => { setPurpose(e.target.value); markDirty(); }}
                select
                fullWidth
                required
              >
                <MenuItem value="">-- Select Purpose --</MenuItem>
                {purposeOptions.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
              </TextField>
              <TextField
                label="Person to Meet"
                value={personToMeet}
                onChange={(e) => { setPersonToMeet(e.target.value); markDirty(); }}
                select
                fullWidth
                required
              >
                <MenuItem value="">-- Select Person --</MenuItem>
                {personOptions.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
              </TextField>
            </Stack>

            {/* Location */}
            <TextField
              label="Location"
              value={location}
              onChange={(e) => { setLocation(e.target.value); markDirty(); }}
              select
              fullWidth
              required

            >
              <MenuItem value="">-- Select Location --</MenuItem>
              {availableLocations.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
            </TextField>

            {/* Camera Section - MANDATORY */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant="contained" startIcon={<CameraAltIcon />} onClick={() => setCameraOpen((c) => !c)}>
                {cameraOpen ? 'Close Camera' : photo ? 'Retake Photo' : 'Open Camera *'}
              </Button>
              {photo && (<Button variant="outlined" startIcon={<DeleteIcon />} onClick={() => { setPhoto(''); markDirty(); }}>Remove Photo</Button>)}
            </Stack>

            {cameraOpen && (
              <Box className="camera-box">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: 'user' }} />
                <Button fullWidth onClick={capture} variant="contained" sx={{ mt: 1 }}>Capture</Button>
              </Box>
            )}

            {photo && <Avatar src={photo} variant="rounded" sx={{ width: 200, height: 200, alignSelf: 'center' }} />}

            {/* Submit Button */}
            <Button type="submit" variant="contained" size="large" disabled={saving} sx={{ py: 1.5, fontWeight: 700, fontSize: '16px', backgroundColor: '#ff8a00' }}>
              {saving ? '🔄 Saving…' : '✅ SAVE VISITOR'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}