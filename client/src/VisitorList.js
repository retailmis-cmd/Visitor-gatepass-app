import React, { useEffect, useState } from 'react';
import {
  Card, CardHeader, CardContent, TextField, MenuItem, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Stack, Typography, Avatar, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';

const toLocalDate = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
const getToday = () => toLocalDate(new Date());

export default function VisitorList({ apiUrl, refresh, token, user }) {
  const [visitors, setVisitors] = useState([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [loading, setLoading] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [editFields, setEditFields] = useState({});

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/visitors`, { headers: authHeaders });
      const data = await res.json();
      setVisitors(Array.isArray(data) ? data : []);
    } catch { alert('Unable to load visitors.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVisitors(); }, [refresh]);

  const deleteVisitor = async (id) => {
    if (!window.confirm('Remove this visitor?')) return;
    try {
      const res = await fetch(`${apiUrl}/visitors/${id}`, { method: 'DELETE', headers: authHeaders });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error || 'Delete failed');
      setVisitors((prev) => prev.filter((v) => v.id !== id));
    } catch (err) { alert(err.message); }
  };

  const setOutTime = async (id) => {
    const now = new Date();
    const out_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    try {
      const res = await fetch(`${apiUrl}/visitors/${id}/out-time`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ out_time }),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error || 'Update failed');
      setVisitors((prev) => prev.map((v) => v.id === id ? { ...v, out_time } : v));
    } catch (err) { alert(err.message); }
  };

  const openEdit = (v) => {
    setEditingVisitor(v);
    setEditFields({
      date: v.date ? toLocalDate(v.date) : '',
      name: v.name || '',
      coming_from: v.coming_from || '',
      company: v.company || '',
      phone_number: v.phone_number || '',
      purpose: v.purpose || '',
      person_to_meet: v.person_to_meet || '',
      scheduled: v.scheduled || '',
      in_time: v.in_time || '',
      out_time: typeof v.out_time === 'string' ? v.out_time.slice(0, 5) : '',
      location: v.location || '',
    });
  };

  const saveEdit = async () => {
    try {
      const res = await fetch(`${apiUrl}/visitors/${editingVisitor.id}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(editFields),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error || 'Update failed');
      setVisitors((prev) => prev.map((v) => v.id === editingVisitor.id ? { ...v, ...editFields } : v));
      setEditingVisitor(null);
    } catch (err) { alert(err.message); }
  };

  // Build location filter options from actual data
  const uniqueLocations = ['All', ...Array.from(new Set(visitors.map((v) => v.location).filter(Boolean)))];

  const filtered = visitors.filter((v) => {
    const matchSearch = v.name?.toLowerCase().includes(search.toLowerCase()) || v.company?.toLowerCase().includes(search.toLowerCase());
    const matchLoc = locationFilter === 'All' || v.location === locationFilter;
    const vDate = v.date ? toLocalDate(v.date) : '';
    const matchDate = (!startDate || vDate >= startDate) && (!endDate || vDate <= endDate);
    return matchSearch && matchLoc && matchDate;
  });

  return (
    <Card>
      <CardHeader title="Visitor List" subheader={`Showing ${filtered.length} record${filtered.length === 1 ? '' : 's'}`} />
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} flexWrap="wrap">
          <TextField label="Search" placeholder="Name or company" value={search} onChange={(e) => setSearch(e.target.value)} fullWidth sx={{ flex: 1, minWidth: 180 }} />
          <TextField label="Location" select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} sx={{ width: { xs: '100%', sm: 180 } }}>
            {uniqueLocations.map((l) => (<MenuItem key={l} value={l}>{l}</MenuItem>))}
          </TextField>
          <TextField label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', sm: 160 } }} />
          <TextField label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: '100%', sm: 160 } }} />
        </Stack>
        {loading ? (<Typography>Loading…</Typography>) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Photo</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>In Time</TableCell>
                  <TableCell>Out Time</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">No visitors found.</TableCell></TableRow>
                ) : filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.photo ? <Avatar src={v.photo} variant="rounded" /> : <Avatar>{v.name?.slice(0, 1)}</Avatar>}</TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell>{v.company || '-'}</TableCell>
                    <TableCell>{v.location || '-'}</TableCell>
                    <TableCell>{v.in_time || '-'}</TableCell>
                    <TableCell>
                      {v.out_time
                        ? <Chip label={typeof v.out_time === 'string' ? v.out_time : new Date(v.out_time).toTimeString().slice(0,5)} size="small" sx={{ bgcolor: '#1a3a1a', color: '#4caf50', fontWeight: 700 }} />
                        : <Chip label="In Premises" size="small" sx={{ bgcolor: '#1a2a3a', color: '#ff8a00' }} />
                      }
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {!v.out_time && (
                          <Tooltip title="Mark Exit (set out time now)">
                            <IconButton size="small" onClick={() => setOutTime(v.id)} sx={{ color: '#ff8a00' }}>
                              <LogoutIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {user?.role === 'admin' && (
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(v)} sx={{ color: '#1976d2' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {user?.role === 'admin' && (
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => deleteVisitor(v.id)} sx={{ color: '#d32f2f' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
      {/* Edit Visitor Dialog */}
      <Dialog open={Boolean(editingVisitor)} onClose={() => setEditingVisitor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Visitor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Stack direction="row" spacing={2}>
              <TextField label="Date" type="date" value={editFields.date || ''} onChange={(e) => setEditFields({ ...editFields, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Location" value={editFields.location || ''} onChange={(e) => setEditFields({ ...editFields, location: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Name" value={editFields.name || ''} onChange={(e) => setEditFields({ ...editFields, name: e.target.value.toUpperCase() })} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Coming From" value={editFields.coming_from || ''} onChange={(e) => setEditFields({ ...editFields, coming_from: e.target.value.toUpperCase() })} fullWidth />
              <TextField label="Company" value={editFields.company || ''} onChange={(e) => setEditFields({ ...editFields, company: e.target.value.toUpperCase() })} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Phone Number" value={editFields.phone_number || ''} onChange={(e) => setEditFields({ ...editFields, phone_number: e.target.value })} fullWidth />
              <TextField label="Scheduled" value={editFields.scheduled || ''} onChange={(e) => setEditFields({ ...editFields, scheduled: e.target.value })} select fullWidth>
                <MenuItem value="YES">YES</MenuItem>
                <MenuItem value="NO">NO</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Purpose" value={editFields.purpose || ''} onChange={(e) => setEditFields({ ...editFields, purpose: e.target.value })} fullWidth />
              <TextField label="Person to Meet" value={editFields.person_to_meet || ''} onChange={(e) => setEditFields({ ...editFields, person_to_meet: e.target.value })} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="In Time" type="time" value={editFields.in_time || ''} onChange={(e) => setEditFields({ ...editFields, in_time: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Out Time" type="time" value={editFields.out_time || ''} onChange={(e) => setEditFields({ ...editFields, out_time: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingVisitor(null)}>Cancel</Button>
          <Button onClick={saveEdit} variant="contained" sx={{ bgcolor: '#ff8a00' }}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}