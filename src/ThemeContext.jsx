import { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeModeContext = createContext({ toggleColorMode: () => {} });

export const useThemeMode = () => useContext(ThemeModeContext);

export const AppThemeProvider = ({ children }) => {
  const stored = localStorage.getItem('colorMode') || 'light';
  const [mode, setMode] = useState(stored);

  const toggleColorMode = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('colorMode', next);
      return next;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                primary:   { main: '#5C6BC0', light: '#8E99F3', dark: '#26418F', contrastText: '#fff' },
                secondary: { main: '#78909C', light: '#A7C0CD', dark: '#4B636E', contrastText: '#fff' },
                background: { default: '#F4F5F8', paper: '#FFFFFF' },
                text:       { primary: '#1A2035', secondary: '#5A6A8A' },
                divider:    '#E2E6F0',
                action:     { hover: '#F0F1F8', selected: '#E8EAFD', disabledBackground: '#F4F5F8' },
                success:    { main: '#43A047', light: '#E8F5E9', contrastText: '#fff' },
                warning:    { main: '#FB8C00', light: '#FFF3E0', contrastText: '#fff' },
                error:      { main: '#E53935', light: '#FFEBEE', contrastText: '#fff' },
                info:       { main: '#1E88E5', light: '#E3F2FD', contrastText: '#fff' },
              }
            : {
                primary:   { main: '#7986CB', light: '#AAB6FB', dark: '#49599A', contrastText: '#fff' },
                secondary: { main: '#90A4AE', light: '#C1D5E0', dark: '#62757F', contrastText: '#fff' },
                background: { default: '#0D1117', paper: '#161B27' },
                text:       { primary: '#E6EAF4', secondary: '#8B9AC4' },
                divider:    '#242B3D',
                action:     { hover: '#1E2537', selected: '#252E45', disabledBackground: '#1A2035' },
                success:    { main: '#66BB6A', light: '#1B3A1C', contrastText: '#fff' },
                warning:    { main: '#FFA726', light: '#2D2000', contrastText: '#fff' },
                error:      { main: '#EF5350', light: '#2D1212', contrastText: '#fff' },
                info:       { main: '#42A5F5', light: '#0D1E33', contrastText: '#fff' },
              }),
        },
        shape: { borderRadius: 10 },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
          h4:      { fontWeight: 700, letterSpacing: '-0.5px' },
          h5:      { fontWeight: 700, letterSpacing: '-0.3px' },
          h6:      { fontWeight: 600 },
          subtitle1: { fontWeight: 500 },
          subtitle2: { fontWeight: 600, letterSpacing: '0.02em' },
          body1:   { fontSize: '0.9rem' },
          body2:   { fontSize: '0.8125rem' },
          caption: { fontSize: '0.75rem', letterSpacing: '0.04em' },
          button:  { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
          overline:{ letterSpacing: '0.1em', fontWeight: 700 },
        },
        shadows: [
          'none',
          '0 1px 2px rgba(0,0,0,0.06)',
          '0 1px 4px rgba(0,0,0,0.08)',
          '0 2px 8px rgba(0,0,0,0.08)',
          '0 4px 12px rgba(0,0,0,0.08)',
          '0 6px 16px rgba(0,0,0,0.1)',
          '0 8px 24px rgba(0,0,0,0.1)',
          ...Array(18).fill('none'),
        ],
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              '*': { boxSizing: 'border-box' },
              body: {
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { width: 5 },
                '&::-webkit-scrollbar-thumb': { background: mode === 'light' ? '#D0D5E8' : '#2A3349', borderRadius: 8 },
              },
            },
          },
          MuiAppBar: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
              root: ({ theme }) => ({
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }),
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: ({ theme }) => ({
                borderRight: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
              }),
            },
          },
          MuiCard: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
              root: ({ theme }) => ({
                border: `1px solid ${theme.palette.divider}`,
                backgroundImage: 'none',
                borderRadius: 12,
              }),
            },
          },
          MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
              root: { backgroundImage: 'none' },
              outlined: ({ theme }) => ({ borderColor: theme.palette.divider }),
            },
          },
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
              root: { borderRadius: 8, padding: '7px 18px', fontSize: '0.8125rem' },
              sizeSmall: { padding: '4px 12px', fontSize: '0.75rem' },
              containedPrimary: { '&:hover': { opacity: 0.9 } },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: { borderRadius: 8 },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.04em', borderRadius: 6 },
              sizeSmall: { height: 22 },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              head: ({ theme }) => ({
                fontWeight: 700,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: theme.palette.text.secondary,
                backgroundColor: mode === 'light' ? '#F4F5F8' : '#1A2035',
                borderBottom: `1px solid ${theme.palette.divider}`,
                padding: '10px 16px',
              }),
              body: { fontSize: '0.8125rem', padding: '12px 16px' },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: ({ theme }) => ({
                '&:last-child td': { borderBottom: 0 },
                '&:hover': { backgroundColor: theme.palette.action.hover },
                cursor: 'default',
              }),
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: { borderRadius: 8 },
            },
          },
          MuiTextField: {
            defaultProps: { variant: 'outlined', size: 'small' },
            styleOverrides: {
              root: { '& .MuiOutlinedInput-root': { borderRadius: 8, fontSize: '0.875rem' } },
            },
          },
          MuiSelect: {
            defaultProps: { size: 'small' },
            styleOverrides: {
              root: { borderRadius: 8, fontSize: '0.875rem' },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: { fontWeight: 600, fontSize: '0.8125rem', textTransform: 'none', minHeight: 44 },
            },
          },
          MuiTabs: {
            styleOverrides: {
              indicator: { height: 2, borderRadius: 2 },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: { fontSize: '0.75rem', borderRadius: 6 },
            },
          },
          MuiAlert: {
            styleOverrides: { root: { borderRadius: 10, fontSize: '0.8125rem' } },
          },
          MuiDialog: {
            styleOverrides: { paper: { borderRadius: 14 } },
          },
          MuiDialogTitle: {
            styleOverrides: { root: { fontWeight: 700, fontSize: '1rem', padding: '20px 24px 12px' } },
          },
          MuiLinearProgress: {
            styleOverrides: { root: { borderRadius: 4, height: 6 } },
          },
          MuiAvatar: {
            styleOverrides: { root: { fontWeight: 700, fontSize: '0.875rem' } },
          },
        },
      }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleColorMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
