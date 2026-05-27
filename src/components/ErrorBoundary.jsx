import React from 'react';
import { Box, Container, Typography, Button, Card, CardContent, useTheme, alpha } from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RefreshRoundedIcon      from '@mui/icons-material/RefreshRounded';
import HomeRoundedIcon         from '@mui/icons-material/HomeRounded';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorView error={this.state.error} errorInfo={this.state.errorInfo} />;
  }
}

function ErrorView({ error, errorInfo }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
            {/* Icon */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'error.light',
                mb: 2.5,
              }}
            >
              <ErrorOutlineRoundedIcon sx={{ fontSize: 32, color: 'error.main' }} />
            </Box>

            <Typography variant="h5" fontWeight={700} gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
              An unexpected error occurred in the application. Our team has been notified.
              You can try refreshing the page or returning to the dashboard.
            </Typography>

            {/* Error details (dev-friendly) */}
            {error && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: 'error.light',
                  borderRadius: 2,
                  textAlign: 'left',
                  border: '1px solid',
                  borderColor: 'error.main',
                }}
              >
                <Typography
                  variant="caption"
                  fontFamily="monospace"
                  color="error.main"
                  display="block"
                  fontWeight={600}
                  sx={{ wordBreak: 'break-all' }}
                >
                  {error.toString()}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<HomeRoundedIcon />}
                onClick={() => { window.location.href = '/'; }}
              >
                Go Home
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default ErrorBoundary;
