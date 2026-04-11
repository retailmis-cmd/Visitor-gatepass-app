import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Stack, Card, CardContent, CardHeader,
  TextField, MenuItem, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Checkbox, FormControlLabel, FormGroup,
  Divider, Avatar, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import ListIcon from '@mui/icons-material/List';

// v4 - uses runtime origin, no env var
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : window.location.origin;

const DROPDOWN_CATEGORIES = [
  { key: 'purpose', label: 'Purpose' },
  { key: 'person_to_meet', label: 'Person to Meet' },
  { key: 'security_name', label: 'Security Name' },
  { key: 'coming_from', label: 'Coming From (Locations)' },
];

export default function AdminDashboard({ user, token }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create User dialog
  const [userDialog, setUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', phone_number: '', role: 'user', locationIds: [] });
  const [userError, setUserError] = useState('');

  // Create Location dialog
  const [locationDialog, setLocationDialog] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [locationError, setLocationError] = useState('');

  // Assign locations dialog
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignUser, setAssignUser] = useState(null);
  const [assignLocationIds, setAssignLocationIds] = useState([]);

  // Dropdown options
  const [dropdownCategory, setDropdownCategory] = useState('purpose');
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionPhone, setNewOptionPhone] = useState('');
  const [dropdownError, setDropdownError] = useState('');
  // Edit phone dialog for person_to_meet
  const [editPhoneDialog, setEditPhoneDialog] = useState(false);
  const [editPhoneTarget, setEditPhoneTarget] = useState(null);
  const [editPhoneValue, setEditPhoneValue] = useState('');

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to load users:', err); alert(`Failed to load users: ${err.message}`); }
    finally { setLoading(false); }
  }, [token]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/locations`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to load locations:', err); alert(`Failed to load locations: ${err.message}`); }
  }, [token]);

  const fetchDropdownOptions = useCallback(async (category) => {
    try {
      const res = await fetch(`${API_URL}/dropdown-options?category=${category}`, { headers: authHeaders });
      const data = await res.json();
      setDropdownOptions(Array.isArray(data) ? data : []);
    } catch { setDropdownOptions([]); }
  }, [token]);

  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, [fetchUsers, fetchLocations]);

  useEffect(() => {
    if (activeTab === 'dropdowns') fetchDropdownOptions(dropdownCategory);
  }, [activeTab, dropdownCategory, fetchDropdownOptions]);

  /* ---------- Create User ---------- */
  const handleCreateUser = async () => {
    setUserError('');
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setUserError('Name, email, and password are required.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) { setUserError(data.error || 'Failed to create user'); return; }
      setUserDialog(false);
      setNewUser({ name: '', email: '', password: '', phone_number: '', role: 'user', locationIds: [] });
      fetchUsers();
    } catch { setUserError('Failed to create user'); }
  };

  /* ---------- Delete User ---------- */
  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Delete failed'); return; }
      fetchUsers();
    } catch { alert('Failed to delete user'); }
  };

  /* ---------- Create Location ---------- */
  const handleCreateLocation = async () => {
    setLocationError('');
    if (!newLocation.trim()) { setLocationError('Location name is required.'); return; }
    try {
      const res = await fetch(`${API_URL}/admin/locations`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: newLocation.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setLocationError(data.error || 'Failed to create location'); return; }
      setLocationDialog(false);
      setNewLocation('');
      fetchLocations();
      fetchUsers();
    } catch { setLocationError('Failed to create location'); }
  };

  /* ---------- Delete Location ---------- */
  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Delete this location? Users assigned to it will lose access.')) return;
    try {
      const res = await fetch(`${API_URL}/admin/locations/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Delete failed'); return; }
      fetchLocations();
      fetchUsers();
    } catch { alert('Failed to delete location'); }
  };

  /* ---------- Assign Locations ---------- */
  const openAssignDialog = (u) => {
    setAssignUser(u);
    setAssignLocationIds(u.locations.map((l) => l.id));
    setAssignDialog(true);
  };

  const handleAssignLocations = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${assignUser.id}/locations`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ locationIds: assignLocationIds }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Update failed'); return; }
      setAssignDialog(false);
      fetchUsers();
    } catch { alert('Failed to update locations'); }
  };

  const toggleAssignLoc = (id) => {
    setAssignLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* ---------- Dropdown Options ---------- */
  const handleAddDropdownOption = async () => {
    setDropdownError('');
    if (!newOptionValue.trim()) { setDropdownError('Value is required.'); return; }
    try {
      const res = await fetch(`${API_URL}/admin/dropdown-options`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          category: dropdownCategory,
          value: newOptionValue.trim(),
          phone_number: dropdownCategory === 'person_to_meet' ? newOptionPhone.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setDropdownError(data.error || 'Failed to add option'); return; }
      setNewOptionValue('');
      setNewOptionPhone('');
      fetchDropdownOptions(dropdownCategory);
    } catch { setDropdownError('Failed to add option'); }
  };

  const handleDeleteDropdownOption = async (id) => {
    if (!window.confirm('Delete this option?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/dropdown-options/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Delete failed'); return; }
      fetchDropdownOptions(dropdownCategory);
    } catch { alert('Failed to delete option'); }
  };

  const openEditPhone = (opt) => {
    setEditPhoneTarget(opt);
    setEditPhoneValue(opt.phone_number || '');
    setEditPhoneDialog(true);
  };

  const handleSavePhone = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/dropdown-options/${editPhoneTarget.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ phone_number: editPhoneValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Update failed'); return; }
      setEditPhoneDialog(false);
      fetchDropdownOptions(dropdownCategory);
    } catch { alert('Failed to update'); }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AdminPanelSettingsIcon sx={{ color: '#ff8a00', fontSize: 36 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Admin Dashboard</Typography>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>Manage users, locations, and access control</Typography>
        </Box>
      </Box>

      {/* Quick Action Buttons */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => { setUserDialog(true); setUserError(''); }}
          sx={{ bgcolor: '#ff8a00', '&:hover': { bgcolor: '#e07a00' } }}
        >
          Create User
        </Button>
        <Button
          variant="outlined"
          startIcon={<LocationOnIcon />}
          onClick={() => { setLocationDialog(true); setLocationError(''); }}
          sx={{ borderColor: '#ff8a00', color: '#ff8a00' }}
        >
          Add Location
        </Button>
      </Stack>

      {/* Tab navigation */}
      <Stack direction="row" spacing={1} mb={2} sx={{ overflowX: 'auto', pb: 0.5, '& .MuiButton-root': { flexShrink: 0 } }}>
        <Button
          variant={activeTab === 'users' ? 'contained' : 'text'}
          startIcon={<PeopleIcon />}
          onClick={() => setActiveTab('users')}
          sx={activeTab === 'users' ? { bgcolor: '#ff8a00' } : { color: '#ff8a00' }}
        >
          Users ({users.length})
        </Button>
        <Button
          variant={activeTab === 'locations' ? 'contained' : 'text'}
          startIcon={<LocationOnIcon />}
          onClick={() => setActiveTab('locations')}
          sx={activeTab === 'locations' ? { bgcolor: '#ff8a00' } : { color: '#ff8a00' }}
        >
          Locations ({locations.length})
        </Button>
        <Button
          variant={activeTab === 'dropdowns' ? 'contained' : 'text'}
          startIcon={<ListIcon />}
          onClick={() => setActiveTab('dropdowns')}
          sx={activeTab === 'dropdowns' ? { bgcolor: '#ff8a00' } : { color: '#ff8a00' }}
        >
          Dropdown Options
        </Button>
      </Stack>

      {/* USERS TABLE */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader title="Users" subheader="All registered accounts and their location access" />
          <CardContent>
            {loading ? (
              <Typography>Loading...</Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#ff8a00' }}>
                    <TableRow>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Role</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Assigned Locations</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center">No users found.</TableCell></TableRow>
                    ) : users.map((u) => (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: u.role === 'admin' ? '#ff8a00' : '#555', fontSize: 14 }}>
                              {u.name?.slice(0, 1).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2">{u.name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={u.role.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: u.role === 'admin' ? '#ff8a00' : '#1a3a5c',
                              color: '#fff',
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {u.role === 'admin' ? (
                            <Chip label="All Locations" size="small" variant="outlined" sx={{ borderColor: '#ff8a00', color: '#ff8a00' }} />
                          ) : u.locations.length === 0 ? (
                            <Typography variant="body2" sx={{ opacity: 0.5 }}>No access assigned</Typography>
                          ) : (
                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                              {u.locations.map((l) => (
                                <Chip key={l.id} label={l.name} size="small" />
                              ))}
                            </Stack>
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {u.role !== 'admin' && (
                              <Tooltip title="Assign Locations">
                                <IconButton size="small" color="primary" onClick={() => openAssignDialog(u)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {u.id !== user.id && (
                              <Tooltip title="Delete User">
                                <IconButton size="small" color="error" onClick={() => handleDeleteUser(u.id)}>
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
        </Card>
      )}

      {/* LOCATIONS TABLE */}
      {activeTab === 'locations' && (
        <Card>
          <CardHeader title="Locations" subheader="Locations available for access assignment" />
          <CardContent>
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#ff8a00' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>#</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Location Name</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {locations.length === 0 ? (
                    <TableRow><TableCell colSpan={3} align="center">No locations found.</TableCell></TableRow>
                  ) : locations.map((l) => (
                    <TableRow key={l.id} hover>
                      <TableCell>{l.id}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LocationOnIcon sx={{ color: '#ff8a00', fontSize: 18 }} />
                          <Typography>{l.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Delete Location">
                          <IconButton size="small" color="error" onClick={() => handleDeleteLocation(l.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* DROPDOWN OPTIONS */}
      {activeTab === 'dropdowns' && (
        <Card>
          <CardHeader title="Dropdown Options" subheader="Manage options for Purpose, Person to Meet, and Security Name" />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="flex-start" flexWrap="wrap">
              <TextField
                label="Category"
                select
                value={dropdownCategory}
                onChange={(e) => { setDropdownCategory(e.target.value); setDropdownError(''); setNewOptionValue(''); setNewOptionPhone(''); }}
                sx={{ width: { xs: '100%', sm: 200 } }}
              >
                {DROPDOWN_CATEGORIES.map((c) => (
                  <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Name / Value"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                placeholder="Enter value"
                size="small"
                sx={{ flex: 1, minWidth: 160 }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDropdownOption(); } }}
              />
              {dropdownCategory === 'person_to_meet' && (
                <TextField
                  label="Mobile Number (WhatsApp)"
                  value={newOptionPhone}
                  onChange={(e) => setNewOptionPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  size="small"
                  sx={{ flex: 1, minWidth: 180 }}
                  inputProps={{ maxLength: 15 }}
                />
              )}
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddDropdownOption} sx={{ bgcolor: '#ff8a00', '&:hover': { bgcolor: '#e07a00' } }}>
                Add
              </Button>
            </Stack>
            {dropdownCategory === 'person_to_meet' && (
              <Typography variant="body2" sx={{ color: '#888', mb: 2, fontSize: '0.8rem' }}>
                💡 Mobile number is used to send WhatsApp notifications (via Green API) when a visitor arrives. Enter 10-digit number (India) or include country code.
              </Typography>
            )}
            {dropdownError && <Typography color="error" variant="body2" mb={1}>{dropdownError}</Typography>}
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#ff8a00' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Name</TableCell>
                    {dropdownCategory === 'person_to_meet' && (
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>WhatsApp Status</TableCell>
                    )}
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dropdownOptions.length === 0 ? (
                    <TableRow><TableCell colSpan={dropdownCategory === 'person_to_meet' ? 3 : 2} align="center">No options yet. Add one above.</TableCell></TableRow>
                  ) : dropdownOptions.map((opt) => (
                    <TableRow key={opt.id} hover>
                      <TableCell>{opt.value}</TableCell>
                      {dropdownCategory === 'person_to_meet' && (
                        <TableCell>
                          {opt.phone_number
                            ? <Chip label={opt.phone_number} size="small" sx={{ bgcolor: '#e8f5e9', color: '#388e3c', fontWeight: 600 }} />
                            : <Chip label="Not set" size="small" sx={{ bgcolor: '#f5f5f5', color: '#aaa' }} />}
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {dropdownCategory === 'person_to_meet' && (
                            <Tooltip title={opt.phone_number ? 'Edit Mobile Number' : 'Add Mobile Number'}>
                              <IconButton size="small" color="primary" onClick={() => openEditPhone(opt)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeleteDropdownOption(opt.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* CREATE USER DIALOG */}
      <Dialog open={userDialog} onClose={() => setUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {userError && <Typography color="error" variant="body2">{userError}</Typography>}
            <TextField label="Full Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} fullWidth required />
            <TextField label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} fullWidth required />
            <TextField label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} fullWidth required />
            <TextField label="Phone Number (optional)" value={newUser.phone_number} onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })} fullWidth />
            <TextField
              label="Role"
              select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value, locationIds: [] })}
              fullWidth
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
            {newUser.role === 'user' && (
              <Box>
                <Typography variant="body2" fontWeight={600} mb={1}>Assign Locations</Typography>
                {locations.length === 0 ? (
                  <Typography variant="body2" sx={{ opacity: 0.5 }}>No locations available. Add locations first.</Typography>
                ) : (
                  <FormGroup>
                    {locations.map((l) => (
                      <FormControlLabel
                        key={l.id}
                        control={
                          <Checkbox
                            checked={newUser.locationIds.includes(l.id)}
                            onChange={() => {
                              const ids = newUser.locationIds.includes(l.id)
                                ? newUser.locationIds.filter((x) => x !== l.id)
                                : [...newUser.locationIds, l.id];
                              setNewUser({ ...newUser, locationIds: ids });
                            }}
                          />
                        }
                        label={l.name}
                      />
                    ))}
                  </FormGroup>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateUser} sx={{ bgcolor: '#ff8a00' }}>Create User</Button>
        </DialogActions>
      </Dialog>

      {/* CREATE LOCATION DIALOG */}
      <Dialog open={locationDialog} onClose={() => setLocationDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Location</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {locationError && <Typography color="error" variant="body2">{locationError}</Typography>}
            <TextField
              label="Location Name"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              fullWidth
              required
              placeholder="e.g. Warehouse B, Gate 2, Office HQ"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateLocation} sx={{ bgcolor: '#ff8a00' }}>Add Location</Button>
        </DialogActions>
      </Dialog>

      {/* ASSIGN LOCATIONS DIALOG */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Locations — {assignUser?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
            Select which locations this user can access:
          </Typography>
          {locations.length === 0 ? (
            <Typography variant="body2" sx={{ opacity: 0.5 }}>No locations available.</Typography>
          ) : (
            <FormGroup>
              {locations.map((l) => (
                <FormControlLabel
                  key={l.id}
                  control={
                    <Checkbox
                      checked={assignLocationIds.includes(l.id)}
                      onChange={() => toggleAssignLoc(l.id)}
                    />
                  }
                  label={l.name}
                />
              ))}
            </FormGroup>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignLocations} sx={{ bgcolor: '#ff8a00' }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* EDIT PHONE DIALOG */}
      <Dialog open={editPhoneDialog} onClose={() => setEditPhoneDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>WhatsApp Number — {editPhoneTarget?.value}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" sx={{ color: '#888' }}>
              This number will receive a WhatsApp message (via Green API) when a visitor arrives to meet <strong>{editPhoneTarget?.value}</strong>.
            </Typography>
            <TextField
              label="Mobile Number"
              value={editPhoneValue}
              onChange={(e) => setEditPhoneValue(e.target.value)}
              placeholder="e.g. 9876543210"
              fullWidth
              inputProps={{ maxLength: 15 }}
              helperText="10-digit Indian number or with country code (e.g. 919876543210)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPhoneDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePhone} sx={{ bgcolor: '#ff8a00' }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
