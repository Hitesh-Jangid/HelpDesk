import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Box, Typography, IconButton, Tooltip,
  Avatar, Chip, Menu, MenuItem, Divider, ListItemIcon, ListItemText,
  useTheme, alpha,
} from '@mui/material';
import DashboardRoundedIcon        from '@mui/icons-material/DashboardRounded';
import ChecklistRoundedIcon        from '@mui/icons-material/ChecklistRounded';
import BarChartRoundedIcon         from '@mui/icons-material/BarChartRounded';
import PeopleRoundedIcon           from '@mui/icons-material/PeopleRounded';
import ManageAccountsRoundedIcon   from '@mui/icons-material/ManageAccountsRounded';
import LightModeRoundedIcon        from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon         from '@mui/icons-material/DarkModeRounded';
import LogoutRoundedIcon           from '@mui/icons-material/LogoutRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import SupportAgentRoundedIcon     from '@mui/icons-material/SupportAgentRounded';
import SupportRoundedIcon          from '@mui/icons-material/SupportRounded';

import { useAuth } from '../AuthContext';
import { useThemeMode } from '../ThemeContext';

function getAvatarColor(name) {
  if (!name) return '#5C6BC0';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#5C6BC0', '#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26A69A', '#EC407A'];
  return colors[Math.abs(hash) % colors.length];
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/tickets',      icon: <DashboardRoundedIcon fontSize="small" />,      roles: ['user','agent','admin'] },
  { label: 'My Tasks',  path: '/todo',         icon: <ChecklistRoundedIcon fontSize="small" />,      roles: ['user','agent','admin'] },
  { label: 'Reports',   path: '/reports/sla',  icon: <BarChartRoundedIcon fontSize="small" />,       roles: ['admin'] },
  { label: 'Users',     path: '/users',        icon: <PeopleRoundedIcon fontSize="small" />,         roles: ['admin'] },
];

const ROLE_META = {
  admin: { label: 'Admin',  color: 'error'   },
  agent: { label: 'Agent',  color: 'warning' },
  user:  { label: 'User',   color: 'primary' },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { mode, toggleColorMode } = useThemeMode();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(n => n.roles.includes(user.role));
  const isActive = (path) => location.pathname === path || (path !== '/tickets' && location.pathname.startsWith(path));

  const initials = ((user.name || user.username || user.email || '?')[0]).toUpperCase();
  const roleMeta = ROLE_META[user.role] || ROLE_META.user;
  const displayName = user.name || user.username || user.email?.split('@')[0] || 'User';

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/');
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: theme.zIndex.drawer + 1,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: 64, gap: 0.5 }}>
        {/* Left: Brand / Logo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            justifyContent: 'flex-start'
          }}
        >
          <Box
            component={Link}
            to="/tickets"
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.25,
              textDecoration: 'none', color: 'inherit', flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="HelpDesk Logo"
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2.2,
                boxShadow: '0 3px 8px rgba(79, 70, 229, 0.15)',
                objectFit: 'contain'
              }}
            />
            <Typography fontWeight={800} fontSize="1.05rem" letterSpacing="-0.4px" sx={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: theme.palette.text.primary }}>Help</span>
              <span style={{ 
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
                marginLeft: '1px'
              }}>Desk</span>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#06b6d4', ml: 0.5, boxShadow: '0 0 6px #06b6d4' }} />
            </Typography>
          </Box>
        </Box>

        {/* Center: Nav Links */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 0.25,
            px: 0.5,
            py: 0.5,
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'light' ? alpha('#f1f5f9', 0.6) : alpha('#1e293b', 0.4),
            border: `1px solid ${theme.palette.mode === 'light' ? '#e2e8f0' : '#242b3d'}`,
            backdropFilter: 'blur(8px)',
            flexShrink: 0
          }}
        >
          {visibleItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Box
                key={item.path}
                component={Link}
                to={item.path}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 2,
                  py: 0.75,
                  borderRadius: 2.5,
                  textDecoration: 'none',
                  color: active ? (theme.palette.mode === 'light' ? '#4f46e5' : '#7986CB') : 'text.secondary',
                  bgcolor: active ? (theme.palette.mode === 'light' ? '#ffffff' : '#252e45') : 'transparent',
                  boxShadow: active ? (theme.palette.mode === 'light' ? '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' : '0 2px 4px rgba(0,0,0,0.12)') : 'none',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.8125rem',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    color: active ? (theme.palette.mode === 'light' ? '#4f46e5' : '#7986CB') : 'text.primary',
                    bgcolor: active ? (theme.palette.mode === 'light' ? '#ffffff' : '#252e45') : alpha(theme.palette.text.primary, 0.04),
                  },
                }}
              >
                <Box sx={{ color: 'inherit', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </Box>
                {item.label}
              </Box>
            );
          })}
        </Box>

        {/* Right side */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, justifyContent: 'flex-end' }}>
          {/* Theme Toggle */}
          <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
            <IconButton onClick={toggleColorMode} size="small" sx={{ color: 'text.secondary' }}>
              {mode === 'light'
                ? <DarkModeRoundedIcon fontSize="small" />
                : <LightModeRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* User Menu Trigger */}
          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              pl: 1, pr: 0.75, py: 0.5,
              borderRadius: 2.5,
              border: `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              ml: 0.5,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Avatar
              sx={{
                width: 28, height: 28,
                bgcolor: getAvatarColor(displayName),
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="caption" fontWeight={600} color="text.primary" display="block" lineHeight={1.3}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1 }}>
                {roleMeta.label}
              </Typography>
            </Box>
            <KeyboardArrowDownRoundedIcon
              sx={{
                fontSize: 16, color: 'text.secondary',
                transform: anchorEl ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </Box>
        </Box>

        {/* User Dropdown */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 4,
            sx: { mt: 1, minWidth: 200, borderRadius: 2.5, border: `1px solid ${theme.palette.divider}` },
          }}
        >
          {/* User info header */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" fontWeight={700} color="text.primary">
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip
                label={roleMeta.label}
                color={roleMeta.color}
                size="small"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
          </Box>
          <Divider />

          {/* Mobile nav items */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {visibleItems.map(item => (
              <MenuItem
                key={item.path}
                onClick={() => { navigate(item.path); setAnchorEl(null); }}
                selected={isActive(item.path)}
                dense
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem' }} />
              </MenuItem>
            ))}
            <Divider />
          </Box>

          {/* Profile link */}
          <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null); }} dense>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ManageAccountsRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="My Profile" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }} />
          </MenuItem>
          <Divider />

          <MenuItem onClick={handleLogout} dense sx={{ color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LogoutRoundedIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }} />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}