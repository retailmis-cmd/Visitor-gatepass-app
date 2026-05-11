import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Stack, Link } from '@mui/material';

export default function SignupPage({ onSignup, onSwitchMode }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    onSignup({ name, email, password });
  };

  return (
    <Box component="form" onSubmit={submit}>
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={700}>Sign up</Typography>
        <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth required />
        <Button type="submit" variant="contained" fullWidth size="large">Register</Button>
        <Typography variant="body2" align="center">
          Already have an account?{' '}
          <Link component="button" variant="body2" onClick={onSwitchMode}>Sign in</Link>
        </Typography>
      </Stack>
    </Box>
  );
}