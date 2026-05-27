import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';
import { onSnapshot, collection, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Box, Card, CardContent, Button, CircularProgress,
  TextField, Dialog, DialogContent, DialogActions,
  InputAdornment, IconButton, Skeleton, useTheme, alpha, Typography,
  Avatar, Select, MenuItem, FormControl, InputLabel, Grid,
  Container, Chip, LinearProgress, Divider,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell
} from '@mui/material';
import AddRoundedIcon            from '@mui/icons-material/AddRounded';
import SearchRoundedIcon         from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded';
import NavigateBeforeIcon        from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon          from '@mui/icons-material/NavigateNext';
import InboxRoundedIcon          from '@mui/icons-material/InboxRounded';
import AccessTimeRoundedIcon     from '@mui/icons-material/AccessTimeRounded';
import TrendingUpRoundedIcon     from '@mui/icons-material/TrendingUpRounded';
import ArrowOutwardRoundedIcon   from '@mui/icons-material/ArrowOutwardRounded';
import BoltRoundedIcon           from '@mui/icons-material/BoltRounded';
import RadioButtonCheckedIcon    from '@mui/icons-material/RadioButtonChecked';
import PauseCircleOutlineIcon    from '@mui/icons-material/PauseCircleOutline';
import TaskAltRoundedIcon        from '@mui/icons-material/TaskAltRounded';
import ErrorOutlineRoundedIcon   from '@mui/icons-material/ErrorOutlineRounded';

/* ═══════════════════════════════════════════════════════════════════════════
   PALETTE & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const STAT_THEMES = [
  { grad: ['#3b82f6','#60a5fa'], light: '#eff6ff', icon: <RadioButtonCheckedIcon /> }, // Open
  { grad: ['#ef4444','#f87171'], light: '#fef2f2', icon: <ErrorOutlineRoundedIcon /> }, // Escalated
  { grad: ['#10b981','#34d399'], light: '#ecfdf5', icon: <TaskAltRoundedIcon /> }, // Resolved
  { grad: ['#94a3b8','#cbd5e1'], light: '#f8fafc', icon: <PauseCircleOutlineIcon /> }, // Closed
];

const STATUS_COLOR = {
  'Open': '#3b82f6', 'Resolved': '#10b981', 'Closed': '#94a3b8', 'Escalated': '#ef4444',
};
const PRIORITY_COLOR = {
  'Critical': '#ef4444', 'High': '#f59e0b', 'Medium': '#3b82f6', 'Low': '#10b981',
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function getSla(ticket) {
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    const c = ticket.created_at?.toDate ? ticket.created_at.toDate() : new Date(ticket.created_at || 0);
    const ra = ticket.resolved_at?.toDate ? ticket.resolved_at.toDate() : ticket.resolved_at ? new Date(ticket.resolved_at) : null;
    const ca = ticket.closed_at?.toDate ? ticket.closed_at.toDate() : ticket.closed_at ? new Date(ticket.closed_at) : null;
    const end = ra || ca || new Date();
    const ms = end - c;
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return { label: `${h}h ${m}m`, isOverdue: false, isDone: true, pct: 100 };
  }
  let dl;
  if (typeof ticket.sla_deadline === 'number') dl = new Date(ticket.sla_deadline * 1000);
  else if (ticket.sla_deadline?.toDate) dl = ticket.sla_deadline.toDate();
  else dl = new Date(ticket.sla_deadline);
  if (!dl || isNaN(dl.getTime())) return { label: '—', isOverdue: false, isDone: false, pct: 0 };
  const diff = dl - Date.now();
  if (diff <= 0) {
    const od = -diff;
    const h = Math.floor(od / 3600000), m = Math.floor((od % 3600000) / 60000);
    return { label: `+${h}h ${m}m`, isOverdue: true, isDone: false, pct: 100 };
  }
  const c = ticket.created_at?.toDate ? ticket.created_at.toDate() : new Date(ticket.created_at || 0);
  const total = dl - c;
  const pct = Math.min(100, Math.round(((Date.now() - c) / total) * 100));
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
  return { label: `${h}h ${m}m`, isOverdue: false, isDone: false, isAtRisk: diff < 4 * 3600000, pct };
}

function relTime(ts) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : (typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts));
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getAvatarColor(name) {
  if (!name) return '#5C6BC0';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#5C6BC0', '#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26A69A', '#EC407A'];
  return colors[Math.abs(hash) % colors.length];
}

/* ═══════════════════════════════════════════════════════════════════════════
   SLA RING
   ═══════════════════════════════════════════════════════════════════════════ */

function SlaRing({ pct, color, size = 28, thickness = 3 }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <CircularProgress
        variant="determinate" value={100} size={size} thickness={thickness}
        sx={{ color: alpha(color, 0.12), position: 'absolute' }}
      />
      <CircularProgress
        variant="determinate" value={pct} size={size} thickness={thickness}
        sx={{ color, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
      />
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const { user, userCache, fetchUser, globalTickets, ticketsLoading } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'Medium', category: 'General' });
  const [creating, setCreating] = useState(false);
  const [, setTick] = useState(0);
  const PER_PAGE = 10;
  const agentView = searchParams.get('view') || (user?.role === 'agent' ? 'mine' : 'all');

  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(iv); }, []);

  useEffect(() => {
    globalTickets.forEach(t => {
      fetchUser(t.created_by);
      fetchUser(t.assigned_to);
    });
  }, [globalTickets, fetchUser]);

  const loading = ticketsLoading;

  const { tickets, totalFiltered, stats } = useMemo(() => {
    let pool = [...globalTickets];
    if (user?.role === 'user') pool = pool.filter(t => t.created_by === user.uid);
    if (user?.role === 'agent' && agentView === 'mine') pool = pool.filter(t => t.assigned_to === user.uid);

    const stats = {
      open: pool.filter(t => t.status === 'Open').length,
      escalated: pool.filter(t => t.status === 'Escalated').length,
      resolved: pool.filter(t => t.status === 'Resolved').length,
      closed: pool.filter(t => t.status === 'Closed').length,
    };

    let f = [...pool];
    if (statusFilter) {
      f = f.filter(t => t.status === statusFilter);
    }
    if (priorityFilter) {
      f = f.filter(t => t.priority === priorityFilter);
    }
    if (categoryFilter) {
      f = f.filter(t => t.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(t =>
        (t.ticket_id || '').toLowerCase().includes(q) ||
        (t.title || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (userCache[t.created_by] || '').toLowerCase().includes(q) ||
        (userCache[t.assigned_to] || '').toLowerCase().includes(q)
      );
    }
    // Status weight: active tickets always above resolved/closed
    // Open Critical = 100 (absolute top), other active = 40-70, resolved/closed = 0-10
    const STATUS_WEIGHT = {
      'Open':        60,
      'In Progress': 50,
      'Breached':    70,   // breached = most urgent, needs attention
      'Escalated':   65,
      'Resolved':    10,
      'Closed':       5,
    };
    const PRIORITY_WEIGHT = { Critical: 4, High: 3, Medium: 2, Low: 1 };

    f.sort((a, b) => {
      // Pin Open + Critical to absolute top
      const aTopPin = a.status === 'Open' && a.priority === 'Critical' ? 1 : 0;
      const bTopPin = b.status === 'Open' && b.priority === 'Critical' ? 1 : 0;
      if (bTopPin !== aTopPin) return bTopPin - aTopPin;

      // Then sort by status group (active vs resolved/closed)
      const sw = (STATUS_WEIGHT[b.status] || 0) - (STATUS_WEIGHT[a.status] || 0);
      if (sw !== 0) return sw;

      // Within same status group → sort by priority
      const pw = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
      if (pw !== 0) return pw;

      // Final tie-break: newest first
      const da = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
      const db2 = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
      return db2 - da;
    });
    return { tickets: f.slice((page - 1) * PER_PAGE, page * PER_PAGE), totalFiltered: f.length, stats };
  }, [globalTickets, user, agentView, statusFilter, priorityFilter, categoryFilter, search, userCache, page]);

  const totalPages = Math.ceil(totalFiltered / PER_PAGE);
  const displayName = user?.name || user?.username || user?.email?.split('@')[0] || 'there';

  const createTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) return;
    setCreating(true);
    try {
      await axios.post(`${API_BASE_URL}/api/tickets/`, newTicket, { params: { uid: user.uid } });
      setNewTicket({ title: '', description: '', priority: 'Medium', category: 'General' });
      setCreateOpen(false);
    } catch {}
    setCreating(false);
  };

  /* ══════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════ */

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>

      {/* ── HERO HEADER ──────────────────────────────────────────── */}
      <Box
        sx={{
          mb: { xs: 3, md: 4 },
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 3,
          background: isDark
            ? `linear-gradient(135deg, ${alpha('#6366f1', 0.15)}, ${alpha('#3b82f6', 0.08)})`
            : `linear-gradient(135deg, ${alpha('#6366f1', 0.06)}, ${alpha('#3b82f6', 0.03)})`,
          border: `1px solid ${isDark ? alpha('#6366f1', 0.15) : alpha('#6366f1', 0.08)}`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""', position: 'absolute',
            top: -60, right: -60, width: 220, height: 220,
            borderRadius: '50%',
            border: `1.5px dashed ${alpha('#818cf8', isDark ? 0.25 : 0.12)}`,
            background: 'transparent',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""', position: 'absolute',
            top: -30, right: -30, width: 140, height: 140,
            borderRadius: '50%',
            background: alpha('#6366f1', isDark ? 0.08 : 0.04),
            boxShadow: `0 0 25px ${alpha('#6366f1', isDark ? 0.25 : 0.12)}`,
            pointerEvents: 'none',
          },
        }}
      >
        {/* Concentric rings for deep SaaS architectural depth */}
        <Box sx={{
          position: 'absolute', bottom: -80, left: '20%', width: 200, height: 200,
          borderRadius: '50%', border: `1px solid ${alpha('#60a5fa', isDark ? 0.12 : 0.06)}`,
          pointerEvents: 'none', zIndex: 0,
        }} />
        <Box sx={{
          position: 'absolute', bottom: -60, left: '20%', width: 160, height: 160,
          borderRadius: '50%', border: `1px dashed ${alpha('#60a5fa', isDark ? 0.08 : 0.04)}`,
          pointerEvents: 'none', zIndex: 0,
        }} />
        <Box sx={{
          position: 'absolute', bottom: -40, left: '20%', width: 120, height: 120,
          borderRadius: '50%', border: `1px solid ${alpha('#60a5fa', isDark ? 0.06 : 0.03)}`,
          pointerEvents: 'none', zIndex: 0,
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 }, flexWrap: 'wrap' }}>
            <Box>
              <Typography
                sx={{
                  fontSize: { xs: '1.4rem', md: '1.75rem' },
                  fontWeight: 800,
                  letterSpacing: '-0.6px',
                  lineHeight: 1.2,
                }}
              >
                {greeting()}, {displayName} 👋
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                {user?.role === 'user'
                  ? 'Here are your support requests'
                  : `${stats.open + stats.escalated} active · ${stats.resolved + stats.closed} resolved/closed`}
              </Typography>
            </Box>

            {/* Live Radar Pulse Widget */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 1.75, py: 0.75, borderRadius: 2,
              bgcolor: isDark ? alpha('#10b981', 0.08) : alpha('#10b981', 0.04),
              border: `1px solid ${alpha('#10b981', isDark ? 0.2 : 0.1)}`,
              boxShadow: `0 2px 8px ${alpha('#10b981', 0.05)}`,
            }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981',
                position: 'relative',
                display: 'inline-block',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: -4, left: -4, right: -4, bottom: -4,
                  borderRadius: '50%',
                  border: '2px solid #10b981',
                  animation: 'radar-pulse 2s infinite ease-out',
                },
                '@keyframes radar-pulse': {
                  '0%': { transform: 'scale(0.5)', opacity: 1 },
                  '100%': { transform: 'scale(2.5)', opacity: 0 },
                }
              }} />
              <Box>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.5px', lineHeight: 1 }}>
                  System Active
                </Typography>
                <Typography sx={{ fontSize: '0.56rem', fontWeight: 600, color: 'text.secondary', mt: 0.25, lineHeight: 1 }}>
                  SLA Response Monitored
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Button
              variant="contained" startIcon={<AddRoundedIcon />}
              onClick={() => setCreateOpen(true)} disableElevation
              sx={{
                borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3, py: 0.85,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                '&:hover': { boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.45)}`, transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}
            >New Ticket</Button>
          </Box>
        </Box>
      </Box>

      {/* ── STAT CARDS ───────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: { xs: 3, md: 3.5 },
        }}
      >
        {[
          { label: 'Open', value: stats.open, sub: 'Awaiting action', i: 0, status: 'Open' },
          { label: 'Escalated', value: stats.escalated, sub: 'Needs urgent care', i: 1, status: 'Escalated' },
          { label: 'Resolved', value: stats.resolved, sub: 'Resolved cases', i: 2, status: 'Resolved' },
          { label: 'Closed', value: stats.closed, sub: 'Archived cases', i: 3, status: 'Closed' },
        ].map(({ label, value, sub, i, status }) => {
          const active = statusFilter === status;
          const t = STAT_THEMES[i];
          return (
            <Card
              key={label}
              onClick={() => { setStatusFilter(active ? '' : status); setPage(1); }}
              sx={{
                cursor: 'pointer',
                borderRadius: 2.5,
                border: active ? `2px solid ${t.grad[0]}` : `1px solid ${theme.palette.divider}`,
                boxShadow: active ? `0 8px 24px ${alpha(t.grad[0], 0.2)}` : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 28px ${alpha(t.grad[0], 0.18)}`,
                  borderColor: t.grad[0],
                  '& .card-watermark': {
                    opacity: active ? 0.22 : 0.12,
                    transform: 'scale(1.12)',
                    bgcolor: alpha(t.grad[0], 0.08),
                    '& svg': { transform: 'rotate(15deg) scale(1.12)' },
                  },
                },
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Gradient top bar */}
              <Box sx={{ height: 3, background: `linear-gradient(90deg, ${t.grad[0]}, ${t.grad[1]})` }} />
              
              {/* Large Status Icon Watermark for high visual appeal */}
              <Box
                className="card-watermark"
                sx={{
                  position: 'absolute',
                  bottom: -15,
                  right: -15,
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(t.grad[0], active ? 0.06 : 0.03),
                  color: t.grad[0],
                  opacity: active ? 0.15 : 0.06,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: 'none',
                  zIndex: 0,
                  '& svg': { fontSize: 44, transform: 'rotate(-10deg)', transition: 'all 0.3s ease' },
                }}
              >
                {t.icon}
              </Box>

              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: active ? t.grad[0] : 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {label}
                  </Typography>
                  <Box
                    sx={{
                      width: 28, height: 28,
                      borderRadius: 1.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDark ? alpha(t.grad[0], 0.12) : t.light,
                      color: t.grad[0],
                      '& svg': { fontSize: 16 },
                    }}
                  >
                    {t.icon}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '1.75rem', md: '2rem' },
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: '-1px',
                      fontVariantNumeric: 'tabular-nums',
                      background: active
                        ? `linear-gradient(135deg, ${t.grad[0]}, ${t.grad[1]})`
                        : `linear-gradient(135deg, ${theme.palette.text.primary}, ${alpha(theme.palette.text.primary, 0.7)})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: 'text.disabled',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sub}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* ── SEARCH AND FILTERS ROW (100% CONTAINER WIDTH) ─────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2.5, flexWrap: 'wrap', width: '100%' }}>
        <TextField
          placeholder="Search tickets by ID, title, category, or user…"
          size="small"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearch(''); setPage(1); }}><CloseRoundedIcon sx={{ fontSize: 14 }} /></IconButton></InputAdornment> : null,
            sx: {
              borderRadius: 2,
              height: 38,
              bgcolor: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.015),
              '& fieldset': { borderColor: `${theme.palette.divider} !important` },
              '&:hover fieldset': { borderColor: `${theme.palette.text.disabled} !important` },
              '&.Mui-focused fieldset': { borderColor: `${theme.palette.primary.main} !important` },
            }
          }}
          sx={{ flex: 1, minWidth: { xs: '100%', md: '280px' } }}
        />

        {/* Status Dropdown */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            displayEmpty
            sx={{
              borderRadius: 2,
              height: 38,
              fontSize: '0.78rem',
              fontWeight: 600,
              bgcolor: statusFilter 
                ? (isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.04))
                : (isDark ? alpha('#fff', 0.03) : alpha('#000', 0.015)),
              '& fieldset': { borderColor: `${statusFilter ? theme.palette.primary.main : theme.palette.divider} !important` },
              transition: 'all 0.2s',
            }}
          >
            <MenuItem value="" sx={{ fontSize: '0.78rem' }}>All Statuses</MenuItem>
            <MenuItem value="Open" sx={{ fontSize: '0.78rem' }}>Open</MenuItem>
            <MenuItem value="Escalated" sx={{ fontSize: '0.78rem' }}>Escalated</MenuItem>
            <MenuItem value="Resolved" sx={{ fontSize: '0.78rem' }}>Resolved</MenuItem>
            <MenuItem value="Closed" sx={{ fontSize: '0.78rem' }}>Closed</MenuItem>
          </Select>
        </FormControl>

        {/* Priority Dropdown */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
            displayEmpty
            sx={{
              borderRadius: 2,
              height: 38,
              fontSize: '0.78rem',
              fontWeight: 600,
              bgcolor: priorityFilter 
                ? (isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.04))
                : (isDark ? alpha('#fff', 0.03) : alpha('#000', 0.015)),
              '& fieldset': { borderColor: `${priorityFilter ? theme.palette.primary.main : theme.palette.divider} !important` },
              transition: 'all 0.2s',
            }}
          >
            <MenuItem value="" sx={{ fontSize: '0.78rem' }}>All Priorities</MenuItem>
            <MenuItem value="Low" sx={{ fontSize: '0.78rem' }}>Low</MenuItem>
            <MenuItem value="Medium" sx={{ fontSize: '0.78rem' }}>Medium</MenuItem>
            <MenuItem value="High" sx={{ fontSize: '0.78rem' }}>High</MenuItem>
            <MenuItem value="Critical" sx={{ fontSize: '0.78rem' }}>Critical</MenuItem>
          </Select>
        </FormControl>

        {/* Category Dropdown */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            displayEmpty
            sx={{
              borderRadius: 2,
              height: 38,
              fontSize: '0.78rem',
              fontWeight: 600,
              bgcolor: categoryFilter 
                ? (isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.04))
                : (isDark ? alpha('#fff', 0.03) : alpha('#000', 0.015)),
              '& fieldset': { borderColor: `${categoryFilter ? theme.palette.primary.main : theme.palette.divider} !important` },
              transition: 'all 0.2s',
            }}
          >
            <MenuItem value="" sx={{ fontSize: '0.78rem' }}>All Categories</MenuItem>
            <MenuItem value="General" sx={{ fontSize: '0.78rem' }}>General</MenuItem>
            <MenuItem value="Technical" sx={{ fontSize: '0.78rem' }}>Technical</MenuItem>
            <MenuItem value="Payment" sx={{ fontSize: '0.78rem' }}>Payment</MenuItem>
            <MenuItem value="Support" sx={{ fontSize: '0.78rem' }}>Support</MenuItem>
          </Select>
        </FormControl>

        {/* Agent Mine/All View Toggle */}
        {user?.role === 'agent' && (
          <Box sx={{ display: 'flex', borderRadius: 2, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden', bgcolor: 'background.paper', height: 38 }}>
            {[{ v: 'mine', l: 'Mine' }, { v: 'all', l: 'All' }].map(o => (
              <Box
                key={o.v}
                onClick={() => { setSearchParams({ view: o.v }); setPage(1); }}
                sx={{
                  px: 2, display: 'flex', alignItems: 'center', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  bgcolor: agentView === o.v ? 'primary.main' : 'transparent',
                  color: agentView === o.v ? '#fff' : 'text.secondary',
                  '&:hover': { bgcolor: agentView === o.v ? 'primary.main' : 'action.hover' },
                }}
              >{o.l}</Box>
            ))}
          </Box>
        )}

        {/* Clear Filters Button */}
        {(search || statusFilter || priorityFilter || categoryFilter) && (
          <Button
            variant="text"
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setPriorityFilter('');
              setCategoryFilter('');
              setPage(1);
            }}
            sx={{
              textTransform: 'none',
              fontSize: '0.76rem',
              fontWeight: 700,
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' }
            }}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      {/* ── RESULTS COUNT ────────────────────────────────────────── */}
      {!loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.25, px: 0.5 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontWeight: 600 }}>
            {totalFiltered === 0 ? 'No tickets found' : `${totalFiltered} ticket${totalFiltered !== 1 ? 's' : ''}`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {statusFilter && (
              <Chip
                label={`Status: ${statusFilter}`}
                size="small"
                onDelete={() => { setStatusFilter(''); setPage(1); }}
                deleteIcon={<CloseRoundedIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
              />
            )}
            {priorityFilter && (
              <Chip
                label={`Priority: ${priorityFilter}`}
                size="small"
                onDelete={() => { setPriorityFilter(''); setPage(1); }}
                deleteIcon={<CloseRoundedIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
              />
            )}
            {categoryFilter && (
              <Chip
                label={`Category: ${categoryFilter}`}
                size="small"
                onDelete={() => { setCategoryFilter(''); setPage(1); }}
                deleteIcon={<CloseRoundedIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* ── TICKET TABLE ─────────────────────────────────────────── */}
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {loading ? (
          <Box sx={{ p: 3 }}>
            {[1,2,3,4,5].map(i => (
              <Box key={i} sx={{ display: 'flex', gap: 3, mb: 2.5, alignItems: 'center' }}>
                <Skeleton variant="rounded" width={60} height={20} sx={{ borderRadius: 1 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="55%" height={18} />
                  <Skeleton variant="text" width="25%" height={14} sx={{ mt: 0.5 }} />
                </Box>
                <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 2 }} />
                <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 2 }} />
                <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: '50%' }} />
              </Box>
            ))}
          </Box>
        ) : tickets.length === 0 ? (
          <Box sx={{ py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: isDark ? alpha('#6366f1', 0.1) : '#eef2ff',
            }}>
              <InboxRoundedIcon sx={{ fontSize: 36, color: '#6366f1', opacity: 0.5 }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography fontWeight={700} color="text.secondary" sx={{ mb: 0.5 }}>
                {search || statusFilter || priorityFilter || categoryFilter ? 'No matching tickets' : 'No tickets yet'}
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 280 }}>
                {search || statusFilter || priorityFilter || categoryFilter ? 'Try clearing some filters' : 'Create your first ticket to get started'}
              </Typography>
            </Box>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: user?.role === 'user' ? 800 : 920 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.015) }}>
                  <TableCell sx={{ pl: 3, py: 1.5, width: '80px', borderBottom: `2px solid ${theme.palette.divider}`, borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                    <HeaderLabel>ID</HeaderLabel>
                  </TableCell>
                  <TableCell sx={{ py: 1.5, borderBottom: `2px solid ${theme.palette.divider}`, borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                    <HeaderLabel>Title</HeaderLabel>
                  </TableCell>
                  <TableCell sx={{ py: 1.5, width: '120px', borderBottom: `2px solid ${theme.palette.divider}`, borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                    <HeaderLabel>Created By</HeaderLabel>
                  </TableCell>
                  <TableCell sx={{ py: 1.5, width: '100px', borderBottom: `2px solid ${theme.palette.divider}`, borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                    <HeaderLabel>Category</HeaderLabel>
                  </TableCell>
                  <TableCell sx={{ py: 1.5, width: '105px', borderBottom: `2px solid ${theme.palette.divider}`, borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                    <HeaderLabel>Status</HeaderLabel>
                  </TableCell>
                  <TableCell sx={{ py: 1.5, width: '105px', borderBottom: `2px solid ${theme.palette.divider}`, borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                    <HeaderLabel>Priority</HeaderLabel>
                  </TableCell>
                  {user?.role !== 'user' && (
                    <TableCell sx={{ py: 1.5, width: '120px', borderBottom: `2px solid ${theme.palette.divider}`, borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                      <HeaderLabel>Assignee</HeaderLabel>
                    </TableCell>
                  )}
                  <TableCell sx={{ py: 1.5, width: '80px', borderBottom: `2px solid ${theme.palette.divider}`, borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                    <HeaderLabel>Age</HeaderLabel>
                  </TableCell>
                  <TableCell sx={{ pr: 3, py: 1.5, width: '100px', borderBottom: `2px solid ${theme.palette.divider}` }}>
                    <HeaderLabel>SLA</HeaderLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((ticket) => {
                  const sla = getSla(ticket);
                  const slaColor = sla.isDone ? '#10b981' : sla.isOverdue ? '#ef4444' : sla.isAtRisk ? '#f59e0b' : '#3b82f6';
                  const assignee = userCache[ticket.assigned_to];
                  const isUrgent = ticket.priority === 'Critical' || sla.isOverdue;

                  return (
                    <TableRow
                      key={ticket.id}
                      hover
                      component={Link}
                      to={`/tickets/${ticket.id}`}
                      sx={{
                        textDecoration: 'none',
                        color: 'inherit',
                        position: 'relative',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: isDark ? `${alpha('#6366f1', 0.05)} !important` : `${alpha('#6366f1', 0.025)} !important`,
                          '& .row-arrow': { opacity: 1, transform: 'translateX(0)' },
                          ...(isUrgent && {
                            bgcolor: isDark ? `${alpha(theme.palette.error.main, 0.08)} !important` : `${alpha(theme.palette.error.main, 0.04)} !important`,
                          }),
                        },
                        // highlight bar for urgent tickets
                        ...(isUrgent && {
                          boxShadow: `inset 4px 0 0 0 ${theme.palette.error.main}`,
                          bgcolor: isDark ? alpha(theme.palette.error.main, 0.04) : alpha(theme.palette.error.main, 0.015),
                        }),
                      }}
                    >
                      {/* ID */}
                      <TableCell sx={{ pl: 3, py: 1.25, width: '80px', borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem', color: 'primary.main' }}>
                          {ticket.ticket_id || `#${ticket.id.substring(0, 7)}`}
                        </Typography>
                      </TableCell>

                      {/* Title */}
                      <TableCell sx={{ py: 1.25, borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                            {ticket.title}
                          </Typography>
                          {ticket.description && (
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px', mt: 0.25 }}>
                              {ticket.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Created By */}
                      <TableCell sx={{ py: 1.25, width: '120px', borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Avatar sx={{
                            width: 22, height: 22, fontSize: '0.62rem', fontWeight: 800,
                            bgcolor: getAvatarColor(userCache[ticket.created_by]), color: '#fff',
                            border: `1px solid ${alpha('#fff', 0.2)}`,
                            boxShadow: `0 1px 3px rgba(0,0,0,0.1)`,
                          }}>
                            {(userCache[ticket.created_by] || 'U')[0].toUpperCase()}
                          </Avatar>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.secondary', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {userCache[ticket.created_by] || '—'}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Category */}
                      <TableCell sx={{ py: 1.25, width: '100px', borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.5, py: 0.25,
                            borderRadius: 1.5,
                            bgcolor: isDark ? alpha('#6366f1', 0.1) : '#eef2ff',
                            border: `1px solid ${isDark ? alpha('#6366f1', 0.18) : '#dbeafe'}`,
                          }}
                        >
                          {ticket.category === 'Technical' ? <BoltRoundedIcon sx={{ fontSize: '10px', color: '#6366f1' }} /> :
                           ticket.category === 'Payment' ? <AccessTimeRoundedIcon sx={{ fontSize: '10px', color: '#6366f1' }} /> :
                           ticket.category === 'Support' ? <TaskAltRoundedIcon sx={{ fontSize: '10px', color: '#6366f1' }} /> :
                           <InboxRoundedIcon sx={{ fontSize: '10px', color: '#6366f1' }} />}
                          <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, color: '#6366f1' }}>
                            {ticket.category}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ py: 1.25, width: '105px', borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            bgcolor: isDark ? alpha(STATUS_COLOR[ticket.status] || '#94a3b8', 0.18) : alpha(STATUS_COLOR[ticket.status] || '#94a3b8', 0.08),
                            border: `1px solid ${alpha(STATUS_COLOR[ticket.status] || '#94a3b8', 0.22)}`,
                            boxShadow: `0 1px 3px rgba(0,0,0,0.02)`,
                          }}
                        >
                          <Box sx={{
                            width: 6, height: 6, borderRadius: '50%',
                            bgcolor: STATUS_COLOR[ticket.status] || '#94a3b8',
                            position: 'relative',
                            boxShadow: `0 0 8px ${STATUS_COLOR[ticket.status] || '#94a3b8'}`,
                            ...((ticket.status === 'Open' || ticket.status === 'Escalated') && {
                              '&::after': {
                                content: '""', position: 'absolute', top: -2, left: -2, right: -2, bottom: -2,
                                borderRadius: '50%', border: `1px solid ${STATUS_COLOR[ticket.status]}`,
                                animation: 'pulse-dot 1.8s infinite',
                              },
                              '@keyframes pulse-dot': {
                                '0%': { transform: 'scale(1)', opacity: 1 },
                                '100%': { transform: 'scale(2.2)', opacity: 0 }
                              }
                            })
                          }} />
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: STATUS_COLOR[ticket.status] || 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            {ticket.status}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Priority */}
                      <TableCell sx={{ py: 1.25, width: '105px', borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            bgcolor: isDark ? alpha(PRIORITY_COLOR[ticket.priority] || '#94a3b8', 0.18) : alpha(PRIORITY_COLOR[ticket.priority] || '#94a3b8', 0.08),
                            border: `1px solid ${alpha(PRIORITY_COLOR[ticket.priority] || '#94a3b8', 0.22)}`,
                          }}
                        >
                          <Box sx={{
                            width: 6, height: 6, borderRadius: '50%',
                            bgcolor: PRIORITY_COLOR[ticket.priority] || '#94a3b8',
                            boxShadow: `0 0 6px ${PRIORITY_COLOR[ticket.priority] || '#94a3b8'}`,
                          }} />
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: PRIORITY_COLOR[ticket.priority] || 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            {ticket.priority}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Assignee */}
                      {user?.role !== 'user' && (
                        <TableCell sx={{ py: 1.25, width: '120px', borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                          {assignee ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Avatar sx={{
                                width: 22, height: 22, fontSize: '0.62rem', fontWeight: 800,
                                bgcolor: getAvatarColor(assignee), color: '#fff',
                                border: `1px solid ${alpha('#fff', 0.2)}`,
                                boxShadow: `0 1px 3px rgba(0,0,0,0.1)`,
                              }}>
                                {assignee[0]?.toUpperCase()}
                              </Avatar>
                              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.secondary', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {assignee}
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1, py: 0.25, borderRadius: 1.5,
                              border: `1px dashed ${theme.palette.divider}`,
                              bgcolor: isDark ? alpha('#fff', 0.01) : alpha('#000', 0.005),
                            }}>
                              <Typography sx={{ fontSize: '0.66rem', fontWeight: 600, color: 'text.disabled' }}>
                                Unassigned
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                      )}

                      {/* Age */}
                      <TableCell sx={{ py: 1.25, width: '80px', borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <AccessTimeRoundedIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                            {relTime(ticket.created_at)}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* SLA */}
                      <TableCell sx={{ pr: 3, py: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <SlaRing pct={sla.pct} color={slaColor} size={24} thickness={2.5} />
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: slaColor, fontVariantNumeric: 'tabular-nums' }}>
                            {sla.label}
                          </Typography>
                          <ArrowOutwardRoundedIcon className="row-arrow" sx={{
                            fontSize: 14, color: 'text.disabled', opacity: 0, transform: 'translateX(-4px)',
                            transition: 'all 0.2s',
                            ml: 'auto'
                          }} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        {!loading && totalFiltered > 0 && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2.5, py: 1.25, borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: isDark ? alpha('#fff', 0.01) : alpha('#000', 0.01),
          }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontWeight: 600 }}>
              Showing {Math.min((page - 1) * PER_PAGE + 1, totalFiltered)}–{Math.min(page * PER_PAGE, totalFiltered)} of {totalFiltered}
            </Typography>
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <IconButton size="small" onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  sx={{ width: 28, height: 28, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
                  <NavigateBeforeIcon sx={{ fontSize: 16 }} />
                </IconButton>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pn;
                  if (totalPages <= 5) pn = i + 1;
                  else if (page <= 3) pn = i + 1;
                  else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                  else pn = page - 2 + i;
                  return (
                    <Box
                      key={pn}
                      onClick={() => setPage(pn)}
                      sx={{
                        width: 28, height: 28,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 1.5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                        bgcolor: pn === page ? 'primary.main' : 'transparent',
                        color: pn === page ? '#fff' : 'text.secondary',
                        border: pn === page ? 'none' : `1px solid ${theme.palette.divider}`,
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: pn === page ? 'primary.main' : 'action.hover' },
                      }}
                    >
                      {pn}
                    </Box>
                  );
                })}
                <IconButton size="small" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                  sx={{ width: 28, height: 28, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
                  <NavigateNextIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* ── CREATE TICKET DIALOG ─────────────────────────────────── */}
      <Dialog
        open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <Box sx={{
          height: 4,
          background: `linear-gradient(90deg, ${STAT_THEMES[0].grad[0]}, ${STAT_THEMES[1].grad[0]}, ${STAT_THEMES[2].grad[0]}, ${STAT_THEMES[3].grad[0]})`,
        }} />
        <Box sx={{ px: 3, pt: 3, pb: 1 }}>
          <Typography fontWeight={800} fontSize="1.15rem" letterSpacing="-0.3px">New Ticket</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Describe your issue and we'll route it to the right team
          </Typography>
        </Box>
        <DialogContent sx={{ px: 3, pt: 2, pb: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField label="Subject" fullWidth required value={newTicket.title}
            onChange={e => setNewTicket(n => ({ ...n, title: e.target.value }))}
            placeholder="Brief summary" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField label="Description" fullWidth multiline rows={4} required value={newTicket.description}
            onChange={e => setNewTicket(n => ({ ...n, description: e.target.value }))}
            placeholder="Steps to reproduce, expected behavior…"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={newTicket.priority} label="Priority"
                onChange={e => setNewTicket(n => ({ ...n, priority: e.target.value }))}
                sx={{ borderRadius: 2 }}
              >
                {['Low','Medium','High','Critical'].map(p => (
                  <MenuItem key={p} value={p}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: PRIORITY_COLOR[p] }} />
                      {p}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={newTicket.category} label="Category"
                onChange={e => setNewTicket(n => ({ ...n, category: e.target.value }))}
                sx={{ borderRadius: 2 }}
              >
                {['General','Technical','Payment','Support'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 1.5, py: 0.75, borderRadius: 2,
            bgcolor: alpha(PRIORITY_COLOR[newTicket.priority], 0.06),
            border: `1px solid ${alpha(PRIORITY_COLOR[newTicket.priority], 0.12)}`,
          }}>
            <AccessTimeRoundedIcon sx={{ fontSize: 15, color: PRIORITY_COLOR[newTicket.priority] }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: PRIORITY_COLOR[newTicket.priority] }}>
              SLA: {newTicket.priority === 'Critical' ? '4h' : newTicket.priority === 'High' ? '12h' : newTicket.priority === 'Medium' ? '24h' : '48h'} response
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} color="inherit" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={createTicket}
            disabled={creating || !newTicket.title.trim() || !newTicket.description.trim()}
            sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            {creating ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

/* ── Tiny helper components ─────────────────────────────────────────────── */

function HeaderLabel({ children }) {
  return (
    <Typography sx={{
      fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '1px', color: 'text.disabled',
    }}>
      {children}
    </Typography>
  );
}

function CellDivider() {
  const theme = useTheme();
  return (
    <Box sx={{
      width: '1px', alignSelf: 'stretch',
      bgcolor: alpha(theme.palette.divider, 0.5),
    }} />
  );
}
