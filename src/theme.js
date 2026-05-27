import { createTheme } from '@mui/material/styles';
import '@fontsource/inter';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5', // modern indigo
      light: '#818cf8',
      dark: '#3730a3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0ea5e9', // vivid sky blue
      light: '#38bdf8',
      dark: '#0284c7',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#b91c1c',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#b45309',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#047857',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, color: '#0f172a', fontSize: '2.5rem' },
    h2: { fontWeight: 700, color: '#0f172a', fontSize: '2.0rem' },
    h3: { fontWeight: 700, color: '#0f172a', fontSize: '1.75rem' },
    h4: { fontWeight: 700, color: '#0f172a', fontSize: '1.5rem' },
    h5: { fontWeight: 600, color: '#0f172a', fontSize: '1.25rem' },
    h6: { fontWeight: 600, color: '#0f172a', fontSize: '1.1rem' },
    subtitle1: { fontWeight: 500, fontSize: '1.1rem' },
    body1: { fontSize: '1rem', color: '#334155' },
    body2: { fontSize: '0.9rem', color: '#475569' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          color: '#ffffff',
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          transition: 'all 0.2s ease-in-out',
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          borderRadius: 12,
        },
        elevation0: { border: 'none', boxShadow: 'none' },
        elevation1: { boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
        elevation2: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
        elevation3: { boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' },
      },
      defaultProps: {
        elevation: 0,
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
          fontSize: '0.75rem',
        },
        filled: {
          color: '#ffffff',
        }
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#ffffff',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: 'none',
        }
      }
    }
  },
});

export default theme;
