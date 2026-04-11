import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
  Box, Card, CardHeader, CardContent, TextField, MenuItem,
  Button, Stack, Avatar, IconButton, Tooltip,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';

const documentTypes = ['DC', 'Tax invoice', 'LR', 'Manifest'];
const packageTypes = ['Box', 'Bag', 'Carton', 'Pallet', 'Other'];

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

export default function GatepassForm({ apiUrl, onGatepassAdded, token, user, onDirty }) {
  const [date, setDate] = useState(getToday());
  const [gpNumberPreview, setGpNumberPreview] = useState('Loading...');
  const [type, setType] = useState('');
  const [document_number, setDocumentNumber] = useState('');
  const [document_type, setDocumentType] = useState('');
  const [in_time, setInTime] = useState(getCurrentTime());
  const [vehicle_number, setVehicleNumber] = useState('');
  const [driver_contact, setDriverContact] = useState('');
  const [qty, setQty] = useState('');
  const [package_type, setPackageType] = useState('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState('');
  const [security_name, setSecurityName] = useState('');
  const [location, setLocation] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [securityOptions, setSecurityOptions] = useState([]);
  const webcamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user');

  const authHeaders = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  const markDirty = () => { if (onDirty) onDirty(true); };

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gpRes, secRes] = await Promise.all([
          fetch(`${apiUrl}/consignments/next-gp`, { headers: authHeaders }),
          fetch(`${apiUrl}/dropdown-options?category=security_name`, { headers: authHeaders }),
        ]);
        const gpData = await gpRes.json();
        if (gpData.gpNumber) setGpNumberPreview(gpData.gpNumber);
        const secData = await secRes.json();
        if (Array.isArray(secData)) setSecurityOptions(secData.map((o) => o.value));
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
    setType('');
    setDocumentNumber('');
    setDocumentType('');
    setInTime(getCurrentTime());
    setVehicleNumber('');
    setDriverContact('');
    setQty('');
    setPackageType('');
    setComment('');
    setPhoto('');
    setSecurityName('');
    setLocation(user?.assignedLocations?.length === 1 ? user.assignedLocations[0] : '');
    fetch(`${apiUrl}/consignments/next-gp`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => { if (d.gpNumber) setGpNumberPreview(d.gpNumber); })
      .catch(() => { setGpNumberPreview('Auto'); });
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!date.trim()) { alert('❌ Date is required'); return; }
    if (!type.trim()) { alert('❌ Type is required'); return; }
    if (!document_number.trim()) { alert('❌ Document Number is required'); return; }
    if (!document_type.trim()) { alert('❌ Document Type is required'); return; }
    if (!in_time.trim()) { alert('❌ In-Time is required'); return; }
    if (!vehicle_number.trim()) { alert('❌ Vehicle Number is required'); return; }
    if (!driver_contact.trim()) { alert('❌ Driver Contact is required'); return; }
    if (!qty.trim()) { alert('❌ Qty is required'); return; }
    if (!package_type.trim()) { alert('❌ Package Type is required'); return; }
    if (!comment.trim()) { alert('❌ Comment is required'); return; }
    if (!photo) { alert('❌ Photo is required'); return; }
    if (!security_name.trim()) { alert('❌ Security Name is required'); return; }

    setSaving(true);
    try {
      const photoUrl = await uploadToCloudinary(photo);
      const res = await fetch(`${apiUrl}/consignment`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          date, type, document_number, document_type, in_time,
          vehicle_number, driver_contact, qty, package_type,
          comment, photo: photoUrl, security_name, location,
        }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Backend not hit (HTML returned)'); }
      if (!res.ok) throw new Error((data.error || 'Unable to save Gatepass.') + (data.detail ? ': ' + data.detail : ''));
      if (onDirty) onDirty(false);
      resetForm();
      onGatepassAdded();
      alert(`✅ Gatepass added successfully! GP: ${data.gp_number}`);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title="Add Gatepass" subheader="Capture Gatepass details and mandatory photo" />
      <CardContent>
        <Box component="form" onSubmit={submit}>
          <Stack spacing={3}>
            {/* ROW 1: Date and GP Number (auto) */}
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
                label="GP Number (Auto)"
                value={gpNumberPreview}
                fullWidth
                InputProps={{ readOnly: true }}
                inputProps={{ style: { color: '#ff8a00', fontWeight: 700 } }}
              />
            </Stack>

            {/* ROW 2: Type and In-Time */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Type"
                value={type}
                onChange={(e) => { setType(e.target.value); markDirty(); }}
                select
                fullWidth
                required
              >
                <MenuItem value="">-- Select --</MenuItem>
                <MenuItem value="INWARD">Inward</MenuItem>
                <MenuItem value="OUTWARD">Outward</MenuItem>
              </TextField>
              <TextField
                label="In-Time"
                type="time"
                value={in_time}
                onChange={(e) => { setInTime(e.target.value); markDirty(); }}
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
              />
            </Stack>

            {/* ROW 3: Document Number and Document Type */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Document Number"
                value={document_number}
                onChange={(e) => { setDocumentNumber(e.target.value.toUpperCase()); markDirty(); }}
                placeholder="ENTER DOCUMENT NUMBER"
                fullWidth
                required
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
              <TextField
                label="Document Type"
                value={document_type}
                onChange={(e) => { setDocumentType(e.target.value); markDirty(); }}
                select
                fullWidth
                required
              >
                <MenuItem value="">-- Select --</MenuItem>
                {documentTypes.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
              </TextField>
            </Stack>

            {/* ROW 4: Vehicle Number and Driver Contact */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Vehicle Number"
                value={vehicle_number}
                onChange={(e) => { setVehicleNumber(e.target.value.toUpperCase()); markDirty(); }}
                placeholder="ENTER VEHICLE NUMBER"
                fullWidth
                required
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
              <TextField
                label="Driver Contact"
                value={driver_contact}
                onChange={(e) => { setDriverContact(e.target.value); markDirty(); }}
                placeholder="Enter driver contact"
                fullWidth
                required
              />
            </Stack>

            {/* ROW 5: Qty and Package Type */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Qty"
                type="number"
                value={qty}
                onChange={(e) => { setQty(e.target.value); markDirty(); }}
                placeholder="Enter quantity"
                fullWidth
                required
              />
              <TextField
                label="Package Type"
                value={package_type}
                onChange={(e) => { setPackageType(e.target.value); markDirty(); }}
                select
                fullWidth
                required
              >
                <MenuItem value="">-- Select --</MenuItem>
                {packageTypes.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
              </TextField>
            </Stack>

            {/* ROW 6: Comment and Security Name (dropdown) */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Comment"
                value={comment}
                onChange={(e) => { setComment(e.target.value.toUpperCase()); markDirty(); }}
                placeholder="ENTER COMMENT"
                fullWidth
                multiline
                rows={2}
                required
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
              <TextField
                label="Security Name"
                value={security_name}
                onChange={(e) => { setSecurityName(e.target.value); markDirty(); }}
                select
                fullWidth
                required
              >
                <MenuItem value="">-- Select Security --</MenuItem>
                {securityOptions.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
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
              <Box className="camera-box" sx={{ position: 'relative' }}>
                <Webcam key={facingMode} audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode }} />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button fullWidth onClick={capture} variant="contained">Capture</Button>
                  <Tooltip title={facingMode === 'user' ? 'Switch to Rear Camera' : 'Switch to Front Camera'}>
                    <IconButton onClick={() => setFacingMode((m) => m === 'user' ? 'environment' : 'user')} sx={{ bgcolor: 'rgba(255,138,0,0.1)', borderRadius: 2 }}>
                      <FlipCameraIosIcon sx={{ color: '#ff8a00' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            )}

            {photo && <Avatar src={photo} variant="rounded" sx={{ width: 200, height: 200, alignSelf: 'center' }} />}

            {/* Submit Button */}
            <Button type="submit" variant="contained" size="large" disabled={saving} sx={{ py: 1.5, fontWeight: 700, fontSize: '16px', backgroundColor: '#ff8a00' }}>
              {saving ? '🔄 Saving…' : '✅ SAVE Gatepass'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}