import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Stack, Link } from '@mui/material';

export default function LoginPage({ onLogin, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email or username.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const success = await onLogin({ email, password });
      if (!success) {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit}>
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={700}>Login</Typography>
        
        <TextField 
          label="Email / Username" 
          type="text" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          fullWidth 
          required
          disabled={loading}
          placeholder="Enter your email or username"
        />
        
        <TextField 
          label="Password" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          fullWidth 
          required
          disabled={loading}
          placeholder="Enter your password"
        />

        {error && (
          <Typography variant="body2" sx={{ color: '#ff6b6b', fontWeight: 500 }}>
            ⚠️ {error}
          </Typography>
        )}
        
        <Button 
          type="submit" 
          variant="contained" 
          fullWidth 
          size="large"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Link 
            component="button" 
            variant="body2" 
            onClick={(e) => {
              e.preventDefault();
              onForgotPassword();
            }}
            sx={{ cursor: 'pointer', whiteSpace: 'nowrap', color: '#ff8a00', fontWeight: 600 }}
          >
            Forgot password? (Admins only)
          </Link>
        </Box>
      </Stack>
    </Box>
  );
}