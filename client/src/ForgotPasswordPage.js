import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Stack, Link, Paper, Avatar, Alert } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';

export default function ForgotPasswordPage({ onSendOtp, onResetPassword, onBackToLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('email'); // 'email', 'otp', 'password'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!identifier.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const success = await onSendOtp(identifier);

      if (success) {
        setMessage('✓ OTP sent to your email. Check your inbox.');
        setStep('otp');
      } else {
        setError('Unable to send OTP. Email not found or does not exist.');
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setMessage('✓ OTP verified. Enter your new password.');
    setStep('password');
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const success = await onResetPassword({
        identifier,
        otp,
        newPassword,
      });

      if (success) {
        setMessage('✓ Password reset successful! Redirecting to login...');
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="auth-root">
      <Paper className="auth-card" elevation={0}>
        <Stack spacing={3} alignItems="center" mb={3}>
          <Avatar sx={{ bgcolor: '#ff8a00', width: 56, height: 56 }}>
            <LockResetIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700}>
            Reset Password
          </Typography>
          <Typography variant="body2" align="center" sx={{ opacity: 0.6 }}>
            {step === 'email' && 'Enter your email to receive an OTP'}
            {step === 'otp' && 'Enter the 6-digit OTP sent to your email'}
            {step === 'password' && 'Create a new password'}
          </Typography>
        </Stack>

        {/* STEP 1: EMAIL */}
        {step === 'email' && (
          <Box component="form" onSubmit={handleSendOtp}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                fullWidth
                required
                placeholder="Enter your registered email"
              />

              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>

              <Typography variant="body2" align="center" sx={{ opacity: 0.6 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={onBackToLogin}
                  sx={{ cursor: 'pointer' }}
                >
                  Back to Login
                </Link>
              </Typography>
            </Stack>
          </Box>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'otp' && (
          <Box component="form" onSubmit={handleVerifyOtp}>
            <Stack spacing={2}>
              <TextField
                label="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                fullWidth
                required
                placeholder="000000"
                inputProps={{ maxLength: 6 }}
              />

              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                Enter the 6-digit OTP sent to {identifier}
              </Typography>

              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
              >
                Verify OTP
              </Button>

              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setMessage('');
                  setError('');
                }}
              >
                Back
              </Button>
            </Stack>
          </Box>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 'password' && (
          <Box component="form" onSubmit={handleResetPassword}>
            <Stack spacing={2}>
              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                required
                placeholder="At least 6 characters"
              />

              <TextField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                required
                placeholder="Confirm your password"
              />

              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>

              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setStep('otp');
                  setNewPassword('');
                  setConfirmPassword('');
                  setMessage('');
                  setError('');
                }}
              >
                Back
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}