import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, Box, Button, Stack, Avatar,
  Divider, Paper, Chip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import AddBoxIcon from '@mui/icons-material/AddBox';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LogoutIcon from '@mui/icons-material/Logout';
import DownloadIcon from '@mui/icons-material/Download';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import VisitorForm from './VisitorForm';
import VisitorList from './VisitorList';
import GatepassForm from './GatepassForm';
import GatepassList from './GatepassList';
import ReportDownload from './ReportDownload';
import AdminDashboard from './AdminDashboard';
import './App.css';

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : window.location.origin;
const drawerWidth = 260;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#ff8a00' },
    background: { default: '#f0f2f8', paper: '#ffffff' },
    text: { primary: '#1a1a2e', secondary: '#555770' },
  },
  typography: {
    fontFamily: "'Roboto Condensed', Arial, sans-serif",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { color: '#1a1a2e' },
      },
    },
  },
});

function App() {
  const [currentPage, setCurrentPage] = useState('visitor-form');
  const [refreshVisitors, setRefreshVisitors] = useState(0);
  const [refreshGatepasses, setRefreshGatepasses] = useState(0);
  const [authMode, setAuthMode] = useState('login');
  const [formDirty, setFormDirty] = useState(false);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('visitorAppUser')); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('visitorAppToken') || null);

  // ==================== LOGIN ====================
  const handleLogin = async ({ email, password }) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Server error (${response.status}): ${text.slice(0, 120)}`); }

      if (!response.ok) {
        alert(data.error || 'Login failed');
        return false;
      }

      const profile = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        assignedLocations: data.user.assignedLocations || [],
      };
      localStorage.setItem('visitorAppUser', JSON.stringify(profile));
      localStorage.setItem('visitorAppToken', data.token);
      setUser(profile);
      setToken(data.token);
      // Route admin to admin dashboard
      if (data.user.role === 'admin') {
        setCurrentPage('admin');
      } else {
        setCurrentPage('visitor-form');
      }
      return true;
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
      return false;
    }
  };

  // ==================== SIGNUP ====================
  const handleSignup = async ({ name, email, password, phone_number }) => {
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone_number }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Signup failed');
        return false;
      }

      alert('Account created! Please log in.');
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      alert('Signup failed. Please try again.');
      return false;
    }
  };

  // ==================== SEND OTP ====================
  const handleSendOtp = async (email) => {
    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || 'Failed to send OTP');
        return false;
      }

      sessionStorage.setItem('resetEmail', email.toLowerCase());
      alert('OTP sent to your email successfully!');
      return true;
    } catch (error) {
      console.error('Send OTP error:', error);
      alert('Failed to send OTP. Please try again.');
      return false;
    }
  };

  // ==================== RESET PASSWORD ====================
  const handleResetPassword = async ({ identifier, otp, newPassword }) => {
    try {
      const verifyResponse = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier.toLowerCase(), otp }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        alert(verifyData.message || 'OTP verification failed');
        return false;
      }

      const resetResponse = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier.toLowerCase(), newPassword }),
      });

      const resetData = await resetResponse.json();
      if (!resetResponse.ok) {
        alert(resetData.message || 'Password reset failed');
        return false;
      }

      sessionStorage.removeItem('resetEmail');
      alert('Password reset successfully! Please log in with your new password.');
      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      alert('Password reset failed. Please try again.');
      return false;
    }
  };

  // ==================== LOGOUT ====================
  const handleLogout = () => {
    localStorage.removeItem('visitorAppUser');
    localStorage.removeItem('visitorAppToken');
    setUser(null);
    setToken(null);
    setAuthMode('login');
  };

  // ==================== NOT LOGGED IN PAGE ====================
  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />

        {authMode === 'login' && (
          <Box className="auth-root">
            <Paper className="auth-card" elevation={0}>
              <Stack spacing={2} alignItems="center" mb={3}>
                <Avatar sx={{ bgcolor: '#ff8a00', width: 56, height: 56 }}>
                  <PersonIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h4" fontWeight={700}>
                  Visitor Manager
                </Typography>
                <Typography variant="body2" align="center" sx={{ opacity: 0.6 }}>
                  Sign in to manage visitors and Gatepasses.
                </Typography>
              </Stack>
              <LoginPage
                onLogin={async (p) => handleLogin(p)}
                onForgotPassword={() => setAuthMode('forgot')}
              />
            </Paper>
          </Box>
        )}

        {authMode === 'forgot' && (
          <ForgotPasswordPage
            onSendOtp={handleSendOtp}
            onResetPassword={handleResetPassword}
            onBackToLogin={() => setAuthMode('login')}
          />
        )}
      </ThemeProvider>
    );
  }

  // ==================== LOGGED IN PAGE ====================
  const isAdmin = user.role === 'admin';

  const userNavItems = [
    { key: 'visitor-form', label: 'Add Visitor', icon: <AddBoxIcon /> },
    { key: 'visitor-list', label: 'Visitor List', icon: <GroupIcon /> },
    { key: 'gatepass-form', label: 'Add Gatepass', icon: <Inventory2Icon /> },
    { key: 'gatepass-list', label: 'Gatepass List', icon: <PersonIcon /> },
    { key: 'reports', label: 'Download Reports', icon: <DownloadIcon /> },
  ];

  const adminNavItems = [
    { key: 'admin', label: 'Admin Dashboard', icon: <AdminPanelSettingsIcon /> },
    { key: 'visitor-form', label: 'Add Visitor', icon: <AddBoxIcon /> },
    { key: 'visitor-list', label: 'Visitor List', icon: <GroupIcon /> },
    { key: 'gatepass-form', label: 'Add Gatepass', icon: <Inventory2Icon /> },
    { key: 'gatepass-list', label: 'Gatepass List', icon: <PersonIcon /> },
    { key: 'reports', label: 'Download Reports', icon: <DownloadIcon /> },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {/* SIDEBAR DRAWER */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#ff8a00' }}>
              Visitor Manager
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, color: '#1a1a2e' }}>
              {user.name}
            </Typography>
            <Chip
              label={isAdmin ? 'ADMIN' : 'USER'}
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: isAdmin ? '#ff8a00' : '#e8eaf6',
                color: isAdmin ? '#fff' : '#3949ab',
                fontWeight: 700,
                fontSize: 10,
              }}
            />
          </Box>
          <Divider />
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.key}
                selected={currentPage === item.key}
                onClick={() => {
                  if (formDirty && !window.confirm('You have unsaved changes. Leave this page?')) return;
                  setFormDirty(false);
                  setCurrentPage(item.key);
                }}
              >
                <ListItemIcon sx={item.key === 'admin' ? { color: '#ff8a00' } : {}}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>

        {/* MAIN CONTENT */}
        <Box component="main" sx={{ flexGrow: 1 }}>
          {/* APPBAR */}
          <AppBar position="fixed" elevation={0} sx={{ ml: `${drawerWidth}px`, width: `calc(100% - ${drawerWidth}px)` }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Visitor & Gatepass Dashboard
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.6 }}>
                  {isAdmin ? 'Admin — Full Access' : `Locations: ${user.assignedLocations?.join(', ') || 'None assigned'}`}
                </Typography>
              </Box>
              <Button startIcon={<LogoutIcon />} onClick={handleLogout} color="inherit" sx={{ ml: 'auto' }}>
                Logout
              </Button>
            </Toolbar>
          </AppBar>

          {/* CENTERED CONTENT AREA */}
          <Box sx={{ mt: 12, p: 3, display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 100px)' }}>
            <Box sx={{ width: '100%', maxWidth: '1100px' }}>
              {currentPage === 'admin' && isAdmin && (
                <AdminDashboard user={user} token={token} />
              )}
              {currentPage === 'visitor-form' && (
                <VisitorForm apiUrl={API_URL} token={token} user={user} onVisitorAdded={() => setRefreshVisitors((p) => p + 1)} onDirty={setFormDirty} />
              )}
              {currentPage === 'visitor-list' && (
                <VisitorList apiUrl={API_URL} token={token} user={user} refresh={refreshVisitors} />
              )}
              {currentPage === 'gatepass-form' && (
                <GatepassForm apiUrl={API_URL} token={token} user={user} onGatepassAdded={() => setRefreshGatepasses((p) => p + 1)} onDirty={setFormDirty} />
              )}
              {currentPage === 'gatepass-list' && (
                <GatepassList apiUrl={API_URL} token={token} user={user} refresh={refreshGatepasses} />
              )}
              {currentPage === 'reports' && (
                <ReportDownload apiUrl={API_URL} token={token} />
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
