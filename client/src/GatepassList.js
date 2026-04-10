import React, { useEffect, useState } from 'react';
import {
  Card, CardHeader, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Typography, IconButton, Box,
  Stack, TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';

const toLocalDate = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
const getToday = () => toLocalDate(new Date());

export default function GatepassList({ apiUrl, refresh, token }) {
  const [Gatepasses, setGatepasses] = useState([]);
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [loading, setLoading] = useState(false);
  const [selectedGatepass, setSelectedGatepass] = useState(null);

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

  const filtered = Gatepasses.filter((c) => {
    const cDate = c.date ? toLocalDate(c.date) : '';
    return (!startDate || cDate >= startDate) && (!endDate || cDate <= endDate);
  });

  return (
    <Card>
      <CardHeader title="Gatepass List" subheader={`Showing ${filtered.length} record${filtered.length === 1 ? '' : 's'}`} />
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
          <TextField label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', sm: 180 } }} />
          <TextField label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', sm: 180 } }} />
        </Stack>
        {loading ? (<Typography>Loading…</Typography>) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead sx={{ backgroundColor: '#ff8a00' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Document No.</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>QTY</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Package Type</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center">No Gatepasses found.</TableCell></TableRow>
                  ) : filtered.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>{c.date || '-'}</TableCell>
                      <TableCell>{c.document_number || '-'}</TableCell>
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
                        <IconButton
                          size="small"
                          color="error"
                          title="Delete"
                          onClick={() => deleteGatepass(c.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
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
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box><strong>Date:</strong> {selectedGatepass.date || '-'}</Box>
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
                      style={{ maxWidth: '200px', marginTop: '10px', borderRadius: '8px' }}
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
    </Card>
  );
}