import React, { useEffect, useState } from 'react';
import {
  Card, CardHeader, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Typography, IconButton, Box,
  Stack, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

const toLocalDate = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
const getToday = () => toLocalDate(new Date());

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDisplayDate = (d) => {
  if (!d) return '-';
  const s = typeof d === 'string' ? d : d.toISOString();
  const parts = s.slice(0, 10).split('-');
  if (parts.length !== 3) return String(d);
  return `${parts[2]}-${MONTHS[parseInt(parts[1], 10) - 1]}-${parts[0]}`;
};

export default function GatepassList({ apiUrl, refresh, token, user }) {
  const [Gatepasses, setGatepasses] = useState([]);
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [editingGatepass, setEditingGatepass] = useState(null);
  const [editFields, setEditFields] = useState({});

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchGatepasses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/consignments`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to fetch Gatepasses');
      const data = await res.json();
      setGatepasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching Gatepasses:', err);
      alert('Unable to load Gatepasses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGatepasses(); }, [refresh, apiUrl]);

  const deleteGatepass = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Gatepass?')) return;

    try {
      const res = await fetch(`${apiUrl}/consignments/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Backend error');
      }

      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      
      alert('✅ Gatepass deleted successfully');
      setSelectedGatepass(null);
      fetchGatepasses();
    } catch (err) {
      console.error('Delete error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const openEdit = (c) => {
    setEditingGatepass(c);
    setEditFields({
      date: c.date ? toLocalDate(c.date) : '',
      type: c.type || '',
      document_number: c.document_number || '',
      document_type: c.document_type || '',
      in_time: c.in_time || '',
      vehicle_number: c.vehicle_number || '',
      driver_contact: c.driver_contact || '',
      qty: c.qty || '',
      package_type: c.package_type || '',
      comment: c.comment || '',
      security_name: c.security_name || '',
      location: c.location || '',
    });
  };

  const saveEdit = async () => {
    try {
      const res = await fetch(`${apiUrl}/consignments/${editingGatepass.id}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(editFields),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error || 'Update failed');
      setGatepasses((prev) => prev.map((c) => c.id === editingGatepass.id ? { ...c, ...editFields } : c));
      setEditingGatepass(null);
    } catch (err) { alert(err.message); }
  };

  const filtered = Gatepasses.filter((c) => {
    const cDate = c.date ? toLocalDate(c.date) : '';
    const matchDate = (!startDate || cDate >= startDate) && (!endDate || cDate <= endDate);
    const q = search.toLowerCase();
    const matchSearch = !search ||
      c.document_number?.toLowerCase().includes(q) ||
      c.vehicle_number?.toLowerCase().includes(q) ||
      c.security_name?.toLowerCase().includes(q) ||
      c.type?.toLowerCase().includes(q) ||
      c.package_type?.toLowerCase().includes(q);
    return matchDate && matchSearch;
  });

  return (
    <Card>
      <CardHeader title="Gatepass List" subheader={`Showing ${filtered.length} record${filtered.length === 1 ? '' : 's'}`} />
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} flexWrap="wrap">
          <TextField label="Search" placeholder="Doc no., vehicle, security..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
          <TextField label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', sm: 180 } }} />
          <TextField label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', sm: 180 } }} />
        </Stack>
        {loading ? (<Typography>Loading…</Typography>) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 500 }}>
                <TableHead sx={{ backgroundColor: '#ff8a00' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Document No.</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>QTY</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Package Type</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center">No Gatepasses found.</TableCell></TableRow>
                  ) : filtered.map((c) => (
                    <TableRow key={c.id} hover sx={{ '&:hover': { backgroundColor: '#fff8f0' } }}>
                      <TableCell sx={{ fontSize: '0.95rem', py: 1.5 }}>{formatDisplayDate(c.date)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{c.document_number || '-'}</TableCell>
                      <TableCell>
                        <Chip label={c.type || '-'} size="small" sx={{ bgcolor: c.type === 'INWARD' ? '#e8f5e9' : '#fff3e0', color: c.type === 'INWARD' ? '#388e3c' : '#e65100', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>{c.qty || '-'}</TableCell>
                      <TableCell>{c.package_type || '-'}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          title="View Details"
                          onClick={() => setSelectedGatepass(c)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                        {user?.role === 'admin' && (
                          <IconButton
                            size="small"
                            title="Edit"
                            onClick={() => openEdit(c)}
                            sx={{ color: '#1976d2' }}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {user?.role === 'admin' && (
                          <IconButton
                            size="small"
                            color="error"
                            title="Delete"
                            onClick={() => deleteGatepass(c.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Detail View */}
            {selectedGatepass && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              >
                <h3>📋 Gatepass Details</h3>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box><strong>Date:</strong> {formatDisplayDate(selectedGatepass.date)}</Box>
                  <Box><strong>GP Number:</strong> {selectedGatepass.gp_number || '-'}</Box>
                  <Box><strong>Type:</strong> {selectedGatepass.type || '-'}</Box>
                  <Box><strong>Document Number:</strong> {selectedGatepass.document_number || '-'}</Box>
                  <Box><strong>Document Type:</strong> {selectedGatepass.document_type || '-'}</Box>
                  <Box><strong>In-Time:</strong> {selectedGatepass.in_time || '-'}</Box>
                  <Box><strong>Vehicle Number:</strong> {selectedGatepass.vehicle_number || '-'}</Box>
                  <Box><strong>Driver Contact:</strong> {selectedGatepass.driver_contact || '-'}</Box>
                  <Box><strong>QTY:</strong> {selectedGatepass.qty || '-'}</Box>
                  <Box><strong>Package Type:</strong> {selectedGatepass.package_type || '-'}</Box>
                  <Box><strong>Comment:</strong> {selectedGatepass.comment || '-'}</Box>
                  <Box><strong>Security Name:</strong> {selectedGatepass.security_name || '-'}</Box>
                </Box>
                {selectedGatepass.photo && (
                  <Box sx={{ mt: 2 }}>
                    <strong>Photo:</strong>
                    <img
                      src={selectedGatepass.photo}
                      alt="Gatepass"
                      style={{ maxWidth: '100%', maxHeight: '320px', marginTop: '10px', borderRadius: '8px', objectFit: 'contain', display: 'block' }}
                    />
                  </Box>
                )}
                <button
                  onClick={() => setSelectedGatepass(null)}
                  style={{
                    marginTop: '15px',
                    padding: '8px 16px',
                    backgroundColor: '#ff8a00',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Close Details
                </button>
              </Box>
            )}
          </>
        )}
      </CardContent>
      {/* Edit Gatepass Dialog */}
      <Dialog open={Boolean(editingGatepass)} onClose={() => setEditingGatepass(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Gatepass</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Stack direction="row" spacing={2}>
              <TextField label="Date" type="date" value={editFields.date || ''} onChange={(e) => setEditFields({ ...editFields, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Type" value={editFields.type || ''} onChange={(e) => setEditFields({ ...editFields, type: e.target.value })} select fullWidth>
                <MenuItem value="INWARD">Inward</MenuItem>
                <MenuItem value="OUTWARD">Outward</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Document Number" value={editFields.document_number || ''} onChange={(e) => setEditFields({ ...editFields, document_number: e.target.value.toUpperCase() })} fullWidth />
              <TextField label="Document Type" value={editFields.document_type || ''} onChange={(e) => setEditFields({ ...editFields, document_type: e.target.value })} select fullWidth>
                <MenuItem value="DC">DC</MenuItem>
                <MenuItem value="Tax invoice">Tax invoice</MenuItem>
                <MenuItem value="LR">LR</MenuItem>
                <MenuItem value="Manifest">Manifest</MenuItem>
              </TextField>
            </Stack>
            <TextField label="In Time" type="time" value={editFields.in_time || ''} onChange={(e) => setEditFields({ ...editFields, in_time: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Vehicle Number" value={editFields.vehicle_number || ''} onChange={(e) => setEditFields({ ...editFields, vehicle_number: e.target.value.toUpperCase() })} fullWidth />
              <TextField label="Driver Contact" value={editFields.driver_contact || ''} onChange={(e) => setEditFields({ ...editFields, driver_contact: e.target.value })} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Qty" type="number" value={editFields.qty || ''} onChange={(e) => setEditFields({ ...editFields, qty: e.target.value })} fullWidth />
              <TextField label="Package Type" value={editFields.package_type || ''} onChange={(e) => setEditFields({ ...editFields, package_type: e.target.value })} select fullWidth>
                <MenuItem value="Box">Box</MenuItem>
                <MenuItem value="Bag">Bag</MenuItem>
                <MenuItem value="Carton">Carton</MenuItem>
                <MenuItem value="Pallet">Pallet</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Stack>
            <TextField label="Comment" value={editFields.comment || ''} onChange={(e) => setEditFields({ ...editFields, comment: e.target.value })} fullWidth multiline rows={2} />
            <TextField label="Security Name" value={editFields.security_name || ''} onChange={(e) => setEditFields({ ...editFields, security_name: e.target.value })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingGatepass(null)}>Cancel</Button>
          <Button onClick={saveEdit} variant="contained" sx={{ bgcolor: '#ff8a00' }}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}