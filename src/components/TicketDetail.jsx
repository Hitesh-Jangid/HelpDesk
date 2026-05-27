import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';
import { onSnapshot, doc, getDoc, collection, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Box, Grid, Typography, Card, CardContent, CardHeader,
  Chip, Button, IconButton, Select, MenuItem, FormControl, InputLabel,
  TextField, Divider, Avatar, Tooltip, Paper, Stack, CircularProgress,
  useTheme, alpha, Skeleton,
} from '@mui/material';
import { PageContainer } from './PageLayout';
import ArrowBackRoundedIcon       from '@mui/icons-material/ArrowBackRounded';
import SendRoundedIcon            from '@mui/icons-material/SendRounded';
import ReplyRoundedIcon           from '@mui/icons-material/ReplyRounded';
import DeleteOutlineRoundedIcon   from '@mui/icons-material/DeleteOutlineRounded';
import EditNoteRoundedIcon        from '@mui/icons-material/EditNoteRounded';
import AccessTimeRoundedIcon      from '@mui/icons-material/AccessTimeRounded';
import PersonOutlineRoundedIcon   from '@mui/icons-material/PersonOutlineRounded';
import CategoryRoundedIcon        from '@mui/icons-material/CategoryRounded';
import LocalOfferRoundedIcon      from '@mui/icons-material/LocalOfferRounded';
import AssignmentRoundedIcon      from '@mui/icons-material/AssignmentRounded';
import ContactPhoneRoundedIcon    from '@mui/icons-material/ContactPhoneRounded';
import GitHubIcon                 from '@mui/icons-material/GitHub';
import SwapHorizRoundedIcon       from '@mui/icons-material/SwapHorizRounded';
import StarRoundedIcon            from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon      from '@mui/icons-material/StarBorderRounded';
import CheckCircleOutlineIcon     from '@mui/icons-material/CheckCircleOutline';
import TimerOutlinedIcon          from '@mui/icons-material/TimerOutlined';
import FlashOnRoundedIcon         from '@mui/icons-material/FlashOnRounded';
import UpdateRoundedIcon          from '@mui/icons-material/UpdateRounded';

const STATUS_CHIP = {
  'Open':      { color: 'info'    },
  'Escalated': { color: 'error'   },
  'Resolved':  { color: 'success' },
  'Closed':    { color: 'default' },
};
const PRIORITY_CHIP = {
  'Critical': { color: 'error'   },
  'High':     { color: 'warning' },
  'Medium':   { color: 'info'    },
  'Low':      { color: 'success' },
};

function StatusChip({ status }) {
  const m = STATUS_CHIP[status] || { color: 'default' };
  return <Chip label={status} color={m.color} size="small" variant="outlined" />;
}
function PriorityChip({ priority }) {
  const m = PRIORITY_CHIP[priority] || { color: 'default' };
  return <Chip label={priority} color={m.color} size="small" />;
}

function getRelativeTime(ts) {
  if (!ts) return '';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
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

function ThreadEvent({
  entry,
  depth = 0,
  isLastInParentList = false,
  replyTo,
  setReplyTo,
  replyText,
  setReplyText,
  addReply,
  deleteComment,
  canDelete,
  isSubmitting,
  userCache,
  ticket,
  user
}) {
  const theme = useTheme();

  // Determine if this is a system action or user action
  const isSystemAction = entry.action === 'auto_assigned' || (!entry.user && entry.action !== 'created');
  
  // Get display name
  let displayName = '@System';
  if (isSystemAction) {
    displayName = '@System';
  } else {
    const userId = entry.user || (entry.action === 'created' ? ticket.created_by : null);
    if (userId && userCache[userId]) {
      displayName = userCache[userId];
    } else if (entry.username) {
      displayName = `@${entry.username}`;
    } else if (userId) {
      displayName = `@${userId}`;
    }
  }

  const userInitial = displayName.includes('@') ? displayName.charAt(1)?.toUpperCase() : 'S';
  const isReply = depth > 0;
  
  // Delete permission
  const eventCanDelete = !isSystemAction && ((entry.user === user.uid) || user.role === 'admin' || user.role === 'agent');

  // Get action text
  let actionText = '';
  if (isReply) {
    actionText = 'replied';
  } else if (entry.action === 'created') {
    actionText = 'created ticket';
  } else if (entry.action === 'auto_assigned') {
    actionText = 'was auto-assigned';
  } else if (entry.action === 'commented') {
    actionText = 'commented';
  } else if (entry.action === 'status_changed') {
    actionText = 'changed status';
  } else if (entry.action === 'reassigned') {
    actionText = 'reassigned ticket';
  } else if (entry.action === 'transferred') {
    actionText = 'transferred ticket';
  } else if (entry.action === 'admin_transfer') {
    actionText = 'transferred ticket';
  } else if (entry.action === 'reopened') {
    actionText = 'reopened ticket';
  } else if (entry.action === 'contact_added') {
    actionText = 'added contact';
  } else if (entry.action === 'github_added') {
    actionText = 'linked GitHub';
  } else if (entry.action === 'rating_submitted') {
    actionText = 'rated ticket';
  } else {
    actionText = entry.action.replace(/_/g, ' ');
  }

  const time = getRelativeTime(entry.timestamp?.seconds || entry.timestamp);
  const isReplying = replyTo === entry.idx;

  return (
    <Box sx={{ ml: depth > 0 ? `${depth * 3}rem` : 0, position: 'relative' }}>
      <Box sx={{ display: 'flex', gap: isReply ? 1.25 : 1.75, position: 'relative', py: 1.5 }}>
        
        {/* Visual Roadmap Connector line for top-level parent events (depth 0), not the last one */}
        {depth === 0 && !isLastInParentList && (
          <Box
            sx={{
              position: 'absolute',
              left: 18,
              top: 48,
              bottom: -16,
              width: 2,
              bgcolor: 'divider',
              zIndex: 1,
            }}
          />
        )}

        {/* Visual Connector line between parent and replies */}
        {entry.replies && entry.replies.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              left: isReply ? 13 : 18,
              top: isReply ? 38 : 48,
              bottom: -16,
              width: 2,
              bgcolor: 'divider',
              zIndex: 1,
            }}
          />
        )}

        {/* Left Side: Avatar/Icon */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, zIndex: 2 }}>
          <Avatar
            sx={{
              width: isReply ? 26 : 36,
              height: isReply ? 26 : 36,
              bgcolor: isSystemAction ? 'action.hover' : getAvatarColor(displayName),
              color: isSystemAction ? 'text.secondary' : '#fff',
              fontSize: isReply ? '0.75rem' : '0.875rem',
              fontWeight: 600,
              border: isSystemAction ? `1px solid ${theme.palette.divider}` : `1px solid ${alpha('#fff', 0.15)}`,
              boxShadow: isSystemAction ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {isSystemAction ? '🤖' : userInitial}
          </Avatar>
        </Box>

        {/* Right Side: Body */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ fontSize: isReply ? '0.8125rem' : '0.875rem' }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
              {actionText}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6875rem' }}>
              · {time}
            </Typography>
          </Box>

          {/* Comment Bubble (Only render if there is a comment/body) */}
          {entry.comment && (
            <Box
              sx={{
                py: 1,
                px: 1.5,
                borderRadius: isReply ? '0px 12px 12px 12px' : '0px 16px 16px 16px',
                bgcolor: isSystemAction ? 'action.hover' : isReply ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
                border: `1px solid ${isReply || isSystemAction ? theme.palette.divider : alpha(theme.palette.primary.main, 0.08)}`,
                display: 'inline-block',
                maxWidth: '100%',
                wordBreak: 'break-word',
              }}
            >
              <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.6, fontSize: isReply ? '0.8125rem' : '0.875rem' }}>
                {renderTextWithLinks(entry.comment)}
              </Typography>
            </Box>
          )}

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, alignItems: 'center' }}>
            <Typography
              variant="caption"
              color="primary"
              fontWeight={600}
              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, fontSize: '0.6875rem' }}
              onClick={() => setReplyTo(replyTo === entry.idx ? null : entry.idx)}
            >
              Reply
            </Typography>
            {eventCanDelete && (entry.action === 'commented' || isReply) && (
              <Typography
                variant="caption"
                color="error"
                fontWeight={600}
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, fontSize: '0.6875rem' }}
                onClick={() => deleteComment(entry.idx)}
              >
                Delete
              </Typography>
            )}
          </Box>

          {/* Inline Reply Form */}
          {isReplying && (
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                placeholder={`Reply to this ${isReply ? 'reply' : 'action'}…`}
                size="small"
                multiline
                maxRows={4}
                fullWidth
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => addReply(entry.idx)}
                disabled={!replyText.trim() || isSubmitting}
                sx={{ minWidth: 40, height: 36 }}
              >
                {isSubmitting ? <CircularProgress size={18} /> : <SendRoundedIcon fontSize="small" />}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Render replies recursively */}
      {entry.replies && entry.replies.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {entry.replies.map((reply) => (
            <ThreadEvent
              key={reply.idx}
              entry={reply}
              depth={depth + 1}
              isLastInParentList={false}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyText={replyText}
              setReplyText={setReplyText}
              addReply={addReply}
              deleteComment={deleteComment}
              canDelete={canDelete}
              isSubmitting={isSubmitting}
              userCache={userCache}
              ticket={ticket}
              user={user}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

const renderTextWithLinks = (text) => {
  if (!text) return null;
  const ticketRegex = /(T\d{9})\b/g;
  const parts = text.split(ticketRegex);
  if (parts.length <= 1) return text;
  return parts.map((part, index) => {
    if (part.match(/^T\d{9}$/)) {
      return (
        <Link key={index} to={`/tickets/${part}`} style={{ textDecoration: 'underline', color: '#1976d2', fontWeight: 600 }}>
          {part}
        </Link>
      );
    }
    return part;
  });
};

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const theme = useTheme();

  const [ticket, setTicket]     = useState(null);
  const [comment, setComment]   = useState('');
  const [status, setStatus]     = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [agents, setAgents]     = useState([]);
  const [slaText, setSlaText]   = useState('');
  const [slaOverdue, setSlaOverdue] = useState(false);
  const milestonesRef = useRef(new Set());

  const [userCache, setUserCache] = useState({});
  const [replyTo, setReplyTo]     = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [contact, setContact]   = useState('');
  const [github, setGithub]     = useState('');
  const [showContact, setShowContact] = useState(false);
  const [showGithub, setShowGithub]   = useState(false);
  const [showTransfer, setShowTransfer]   = useState(false);
  const [showAdminXfer, setShowAdminXfer] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [adminXferTarget, setAdminXferTarget] = useState('');
  const [adminXferReason, setAdminXferReason] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating]     = useState(0);
  const [feedback, setFeedback] = useState('');

  const cacheRef = useRef({});

  const showToast = useCallback(() => {}, []); // simplified — use alerts inline

  const getUser = useCallback(async (uid) => {
    if (!uid || cacheRef.current[uid]) return;
    cacheRef.current[uid] = 'loading';
    try {
      const d = await getDoc(doc(db, 'users', uid));
      if (d.exists()) {
        const u = d.data();
        const disp = u.username || u.email?.split('@')[0] || uid;
        cacheRef.current[uid] = disp;
        setUserCache(p => ({ ...p, [uid]: disp }));
      } else {
        cacheRef.current[uid] = uid;
      }
    } catch {
      delete cacheRef.current[uid];
    }
  }, []);

  const addEvent = useCallback(async (action) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/tickets/${id}/`, { comment: action, version: ticket?.version }, { params: { role: user?.role, uid: user?.uid } });
    } catch {}
  }, [id, ticket?.version, user]);

  const fetchAgents = useCallback(async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/users/`, { params: { role: 'admin', user_role: user?.role, uid: user?.uid } });
      setAgents((r.data.users || []).filter(u => u.role === 'agent'));
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let unsub;
    if (id.startsWith('T')) {
      const q = query(collection(db, 'tickets'), where('ticket_id', '==', id), limit(1));
      unsub = onSnapshot(q, (snap) => {
        if (snap.empty) {
          setTicket(null);
          return;
        }
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        if (user.role === 'user' && data.created_by !== user.uid) { setTicket(null); return; }
        setTicket({ ...data, id: docSnap.id });
        setStatus(data.status);
        setAssignedTo(data.assigned_to || '');
      });
    } else {
      unsub = onSnapshot(doc(db, 'tickets', id), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (user.role === 'user' && data.created_by !== user.uid) { setTicket(null); return; }
        setTicket({ ...data, id: snap.id });
        setStatus(data.status);
        setAssignedTo(data.assigned_to || '');
      });
    }
    if (user.role === 'admin') fetchAgents();
    return () => unsub && unsub();
  }, [id, user, fetchAgents]);

  useEffect(() => {
    if (!ticket) return;
    getUser(ticket.created_by);
    getUser(ticket.assigned_to);
    if (ticket.resolved_by) getUser(ticket.resolved_by);
    if (ticket.timeline) {
      ticket.timeline.forEach(e => {
        if (e.user) getUser(e.user);
      });
    }
  }, [ticket, getUser]);

  // SLA Timer
  useEffect(() => {
    if (!ticket?.sla_deadline) return;
    const update = () => {
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        setSlaText('SLA Met'); setSlaOverdue(false); return;
      }
      let dl;
      if (typeof ticket.sla_deadline === 'number') dl = new Date(ticket.sla_deadline * 1000);
      else if (ticket.sla_deadline?.toDate) dl = ticket.sla_deadline.toDate();
      else dl = new Date(ticket.sla_deadline);
      if (!dl || isNaN(dl.getTime())) { setSlaText('—'); return; }
      const diff = dl - Date.now();
      if (diff <= 0) {
        const od = -diff;
        const d = Math.floor(od / 86400000), h = Math.floor((od % 86400000) / 3600000), m = Math.floor((od % 3600000) / 60000), s = Math.floor((od % 60000) / 1000);
        setSlaText(`Overdue +${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`);
        setSlaOverdue(true);
        if (!milestonesRef.current.has('overdue')) { milestonesRef.current.add('overdue'); addEvent('SLA Breached'); }
        return;
      }
      const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setSlaText(d > 0 ? `${d}d ${h}h remaining` : `${h}h ${m}m ${s}s`);
      setSlaOverdue(false);

      // Check milestones only once
      if (d === 0 && h === 1 && m === 0 && s === 0 && !milestonesRef.current.has('1h')) {
        milestonesRef.current.add('1h'); addEvent('1 hour remaining');
      } else if (d === 0 && h === 0 && m === 30 && s === 0 && !milestonesRef.current.has('30m')) {
        milestonesRef.current.add('30m'); addEvent('30 minutes remaining');
      } else if (d === 0 && h === 0 && m === 10 && s === 0 && !milestonesRef.current.has('10m')) {
        milestonesRef.current.add('10m'); addEvent('10 minutes remaining');
      }
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [ticket?.sla_deadline, ticket?.status, addEvent]);

  const postComment = async () => {
    if (!comment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await axios.patch(`${API_BASE_URL}/api/tickets/${id}/`, { comment, version: ticket.version }, { params: { role: user.role, uid: user.uid } });
      setComment('');
    } catch {}
    setIsSubmitting(false);
  };

  const postReply = async (parentIdx) => {
    if (!replyText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await axios.patch(`${API_BASE_URL}/api/tickets/${id}/`, { comment: replyText, version: ticket.version, reply_to: parentIdx }, { params: { role: user.role, uid: user.uid } });
      setReplyText(''); setReplyTo(null);
    } catch {}
    setIsSubmitting(false);
  };

  const deleteComment = async (idx) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/tickets/${id}/`, { params: { role: user.role, uid: user.uid }, data: { comment_index: idx } });
    } catch {}
  };

  const updateTicket = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/api/tickets/${id}/`, { status, version: ticket.version }, { params: { role: user.role, uid: user.uid } });
    } catch {}
  };

  const assignTicket = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/api/tickets/${id}/`, { assigned_to: assignedTo, version: ticket.version }, { params: { role: user.role, uid: user.uid } });
    } catch {}
  };

  const submitFeedback = async () => {
    if (!rating) return;
    try {
      await axios.post(`${API_BASE_URL}/api/tickets/${id}/feedback/`, { rating, feedback }, { params: { uid: user.uid } });
      setShowFeedback(false);
    } catch {}
  };

  const doTransfer = async () => {
    if (!transferReason.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/api/tickets/${id}/transfer/`, { reason: transferReason }, { params: { role: user.role, uid: user.uid } });
      setShowTransfer(false); setTransferReason('');
    } catch {}
  };

  const doAdminXfer = async () => {
    if (!adminXferTarget || !adminXferReason.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/api/tickets/${id}/admin-transfer/`, { target_uid: adminXferTarget, reason: adminXferReason }, { params: { role: user.role, uid: user.uid } });
      setShowAdminXfer(false);
    } catch {}
  };

  const addContact = async () => {
    if (!contact.trim()) return;
    try {
      await axios.patch(`${API_BASE_URL}/api/tickets/${id}/`, { contact, version: ticket.version }, { params: { role: user.role, uid: user.uid } });
      setShowContact(false); setContact('');
    } catch {}
  };

  const addGithub = async () => {
    if (!github.trim()) return;
    try {
      await axios.patch(`${API_BASE_URL}/api/tickets/${id}/`, { github, version: ticket.version }, { params: { role: user.role, uid: user.uid } });
      setShowGithub(false); setGithub('');
    } catch {}
  };

  if (!user) return null;

  if (!ticket) {
    return (
      <PageContainer maxWidth="xl">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  const isLocked   = ticket.status === 'Closed';
  const canModify  = user.role === 'agent' || user.role === 'admin';
  const canDelete  = user.role === 'admin' || ticket.created_by === user.uid;
  const created    = ticket.created_at?.toDate ? ticket.created_at.toDate() : new Date(ticket.created_at || 0);

  // Build threads
  const events = ticket.timeline || [];
  const allEventsSorted = [...events]
    .map((entry, idx) => ({ ...entry, idx }))
    .sort((a, b) => {
      const timeA = a.timestamp?.seconds || a.timestamp || 0;
      const timeB = b.timestamp?.seconds || b.timestamp || 0;
      const valA = typeof timeA === 'number' ? timeA : timeA.seconds;
      const valB = typeof timeB === 'number' ? timeB : timeB.seconds;
      return valA - valB;
    });

  const buildThreads = () => {
    const threads = [];
    const eventMap = new Map();
    
    // First pass: create map of all events
    allEventsSorted.forEach(event => {
      eventMap.set(event.idx, { ...event, replies: [] });
    });
    
    // Second pass: organize into threads
    allEventsSorted.forEach(event => {
      const eventData = eventMap.get(event.idx);
      if (event.reply_to !== undefined && event.reply_to !== null) {
        const parent = eventMap.get(event.reply_to);
        if (parent) {
          parent.replies.push(eventData);
        } else {
          threads.push(eventData);
        }
      } else {
        threads.push(eventData);
      }
    });
    
    return threads;
  };

  const threads = buildThreads();

  const SidebarItem = ({ icon, label, value, color }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, py: 0.5 }}>
      <Box sx={{ color: color || 'text.disabled', display: 'flex', alignItems: 'center', mt: 0.1 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.disabled" display="block" sx={{ lineHeight: 1, mb: 0.25 }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500} color={color || 'text.primary'}>
          {value}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer maxWidth="xl">
      {/* Back */}
      <Button
        component={Link}
        to="/tickets"
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ mb: 2.5, color: 'text.secondary', fontWeight: 500, fontSize: '0.8125rem' }}
      >
        All Tickets
      </Button>

      <Grid container spacing={2.5} alignItems="flex-start">
        {/* ── Main Column ── */}
        <Grid item xs={12} lg={8}>
          {/* Title Card */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ flex: 1, lineHeight: 1.4 }}>
                  {ticket.title}
                </Typography>
                <Stack direction="row" spacing={1} flexShrink={0}>
                  <StatusChip status={ticket.status} />
                  <PriorityChip priority={ticket.priority} />
                </Stack>
              </Box>

              <Stack direction="row" spacing={2} flexWrap="wrap" divider={<Typography variant="caption" color="text.disabled">·</Typography>}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AssignmentRoundedIcon sx={{ fontSize: 13 }} />
                  <strong style={{ fontFamily: 'monospace', color: theme.palette.primary.main }}>
                    {ticket.ticket_id || `#${id.substring(0, 8)}`}
                  </strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CategoryRoundedIcon sx={{ fontSize: 13 }} />
                  {ticket.category}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTimeRoundedIcon sx={{ fontSize: 13 }} />
                  {created.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Typography>
                {userCache[ticket.created_by] && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonOutlineRoundedIcon sx={{ fontSize: 13 }} />
                    {userCache[ticket.created_by]}
                  </Typography>
                )}
              </Stack>

              {ticket.description && (
                <Box
                  sx={{
                    mt: 2, p: 2, borderRadius: 2,
                    bgcolor: 'action.hover',
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.7 }}>
                    {renderTextWithLinks(ticket.description)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EditNoteRoundedIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Activity & Comments
                  </Typography>
                  <Chip label={threads.length} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                </Box>
              }
              sx={{ pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}
            />
            <CardContent sx={{ p: 2.5 }}>
              {threads.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                  <EditNoteRoundedIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body2">No activity yet</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {threads.map((thread, idx) => (
                    <ThreadEvent
                      key={thread.idx}
                      entry={thread}
                      depth={0}
                      isLastInParentList={idx === threads.length - 1}
                      replyTo={replyTo}
                      setReplyTo={setReplyTo}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      addReply={postReply}
                      deleteComment={deleteComment}
                      canDelete={canDelete}
                      isSubmitting={isSubmitting}
                      userCache={userCache}
                      ticket={ticket}
                      user={user}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>

            {/* Compose Box */}
            {canModify && !isLocked && (
              <Box
                sx={{
                  px: 2.5, pb: 2.5,
                  borderTop: `1px solid ${theme.palette.divider}`,
                  pt: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                  Add Comment
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: getAvatarColor(user.username || user.email), fontSize: '0.8125rem', flexShrink: 0, mt: 0.25, border: `1px solid ${alpha('#fff', 0.2)}`, boxShadow: `0 1px 3px rgba(0,0,0,0.1)` }}>
                    {(user.username || user.email || 'U')[0].toUpperCase()}
                  </Avatar>
                  <TextField
                    placeholder="Describe the action taken, share an update…"
                    multiline
                    rows={2}
                    fullWidth
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Tooltip title="Post comment">
                    <span>
                      <IconButton
                        color="primary"
                        onClick={postComment}
                        disabled={!comment.trim() || isSubmitting}
                        sx={{ mt: 0.25 }}
                      >
                        {isSubmitting ? <CircularProgress size={18} /> : <SendRoundedIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </Card>
        </Grid>

        {/* ── Sidebar ── */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={2}>
            {/* Details Card */}
            <Card>
              <CardHeader
                title={<Typography variant="subtitle2" fontWeight={700}>Details</Typography>}
                sx={{ pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}
              />
              <CardContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <SidebarItem
                  icon={<TimerOutlinedIcon sx={{ fontSize: 16 }} />}
                  label="SLA Remaining"
                  value={slaText || '—'}
                  color={slaOverdue ? theme.palette.error.main : ticket.status === 'Resolved' || ticket.status === 'Closed' ? theme.palette.success.main : undefined}
                />
                <SidebarItem
                  icon={<PersonOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                  label="Assigned To"
                  value={userCache[ticket.assigned_to] || 'Unassigned'}
                />
                <SidebarItem
                  icon={<PersonOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                  label="Created By"
                  value={userCache[ticket.created_by] || 'Unknown'}
                />
                <SidebarItem
                  icon={<CategoryRoundedIcon sx={{ fontSize: 16 }} />}
                  label="Category"
                  value={ticket.category}
                />
                <SidebarItem
                  icon={<LocalOfferRoundedIcon sx={{ fontSize: 16 }} />}
                  label="Priority"
                  value={ticket.priority}
                  color={ticket.priority === 'Critical' || ticket.priority === 'High' ? theme.palette.error.main : undefined}
                />
                <SidebarItem
                  icon={<AccessTimeRoundedIcon sx={{ fontSize: 16 }} />}
                  label="Created At"
                  value={(() => {
                    const c = ticket.created_at?.toDate ? ticket.created_at.toDate() : typeof ticket.created_at === 'number' ? new Date(ticket.created_at * 1000) : new Date(ticket.created_at || 0);
                    return c.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  })()}
                />
                {(ticket.status === 'Resolved' || ticket.status === 'Closed') && ticket.resolved_at && (
                  <>
                    <SidebarItem
                      icon={<AccessTimeRoundedIcon sx={{ fontSize: 16 }} />}
                      label="Resolved At"
                      value={(() => {
                        const r = ticket.resolved_at?.toDate ? ticket.resolved_at.toDate() : typeof ticket.resolved_at === 'number' ? new Date(ticket.resolved_at * 1000) : new Date(ticket.resolved_at || 0);
                        return r.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                      })()}
                      color={theme.palette.success.main}
                    />
                    {ticket.resolved_by && (
                      <SidebarItem
                        icon={<PersonOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                        label="Resolved By"
                        value={userCache[ticket.resolved_by] || 'Loading...'}
                      />
                    )}
                  </>
                )}
                {(ticket.status === 'Resolved' || ticket.status === 'Closed') && ticket.completed_at && (
                  <SidebarItem
                    icon={<AccessTimeRoundedIcon sx={{ fontSize: 16 }} />}
                    label="Completed At"
                    value={(() => {
                      const cp = ticket.completed_at?.toDate ? ticket.completed_at.toDate() : typeof ticket.completed_at === 'number' ? new Date(ticket.completed_at * 1000) : new Date(ticket.completed_at || 0);
                      return cp.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    })()}
                    color={theme.palette.success.main}
                  />
                )}
                <SidebarItem
                  icon={<AssignmentRoundedIcon sx={{ fontSize: 16 }} />}
                  label="Source"
                  value="Portal"
                />
                {ticket.contact && (
                  <SidebarItem
                    icon={<ContactPhoneRoundedIcon sx={{ fontSize: 16 }} />}
                    label="Contact"
                    value={ticket.contact}
                  />
                )}
                {ticket.github && (
                  <SidebarItem
                    icon={<GitHubIcon sx={{ fontSize: 16 }} />}
                    label="GitHub"
                    value={
                      <Typography
                        component="a"
                        href={ticket.github}
                        target="_blank"
                        rel="noreferrer"
                        variant="body2"
                        color="primary"
                        sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {ticket.github}
                      </Typography>
                    }
                  />
                )}
                {ticket.labels && ticket.labels.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5 }}>
                      Labels
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {ticket.labels.map(l => (
                        <Chip key={l} label={l} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }} />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Actions Card */}
            {(canModify || (ticket.created_by === user.uid && !isLocked) || (user.role === 'user' && ticket.created_by === user.uid && ticket.status === 'Closed' && (ticket.reopen_count || 0) < 1)) && (
              <Card>
                <CardHeader
                  title={<Typography variant="subtitle2" fontWeight={700}>Actions</Typography>}
                  sx={{ pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}
                />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {canModify && (
                    <>
                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} disabled={isLocked}>
                          {['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'].map(s => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={updateTicket}
                        disabled={isLocked}
                        startIcon={<UpdateRoundedIcon />}
                      >
                        Update Status
                      </Button>
                    </>
                  )}

                  {user.role === 'admin' && (
                    <>
                      <Divider />
                      <FormControl fullWidth size="small">
                        <InputLabel>Assign Agent</InputLabel>
                        <Select value={assignedTo} label="Assign Agent" onChange={(e) => setAssignedTo(e.target.value)} disabled={isLocked}>
                          <MenuItem value=""><em>Unassigned</em></MenuItem>
                          {agents.map(a => (
                            <MenuItem key={a.uid} value={a.uid}>{a.username || a.email}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={assignTicket}
                        disabled={isLocked}
                        startIcon={<PersonOutlineRoundedIcon />}
                      >
                        Assign Ticket
                      </Button>
                    </>
                  )}

                  {/* Reopen Ticket option for User */}
                  {user.role === 'user' && ticket.created_by === user.uid && ticket.status === 'Closed' && (ticket.reopen_count || 0) < 1 && (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        You can reopen this ticket to request further assistance (one time only).
                      </Typography>
                      <Button
                        fullWidth
                        variant="contained"
                        color="warning"
                        onClick={async () => {
                          try {
                            await axios.patch(`${API_BASE_URL}/api/tickets/${id}/`, { status: 'Open', version: ticket.version }, { params: { role: user.role, uid: user.uid } });
                          } catch {}
                        }}
                      >
                        Reopen Ticket
                      </Button>
                    </>
                  )}

                  {!isLocked && (ticket.created_by === user.uid || canModify) && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Button
                            fullWidth size="small" variant="outlined" color="secondary"
                            startIcon={<ContactPhoneRoundedIcon fontSize="small" />}
                            onClick={() => setShowContact(!showContact)}
                          >
                            Contact
                          </Button>
                        </Grid>
                        <Grid item xs={6}>
                          <Button
                            fullWidth size="small" variant="outlined" color="secondary"
                            startIcon={<GitHubIcon fontSize="small" />}
                            onClick={() => setShowGithub(!showGithub)}
                          >
                            GitHub
                          </Button>
                        </Grid>
                        {user.role === 'agent' && (
                          <Grid item xs={12}>
                            <Button
                              fullWidth size="small" variant="outlined"
                              startIcon={<SwapHorizRoundedIcon fontSize="small" />}
                              onClick={() => setShowTransfer(!showTransfer)}
                            >
                              Transfer to Admin
                            </Button>
                          </Grid>
                        )}
                        {user.role === 'admin' && (
                          <Grid item xs={12}>
                            <Button
                              fullWidth size="small" variant="outlined"
                              startIcon={<SwapHorizRoundedIcon fontSize="small" />}
                              onClick={() => setShowAdminXfer(!showAdminXfer)}
                            >
                              Reassign
                            </Button>
                          </Grid>
                        )}
                      </Grid>

                      {showContact && (
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <TextField size="small" fullWidth placeholder="Contact info…" value={contact} onChange={(e) => setContact(e.target.value)} />
                          <Button size="small" variant="contained" onClick={addContact}>Save</Button>
                        </Box>
                      )}
                      {showGithub && (
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <TextField size="small" fullWidth placeholder="GitHub URL…" value={github} onChange={(e) => setGithub(e.target.value)} />
                          <Button size="small" variant="contained" onClick={addGithub}>Save</Button>
                        </Box>
                      )}
                      {showTransfer && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                          <TextField size="small" fullWidth multiline rows={2} placeholder="Reason…" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" variant="contained" onClick={doTransfer} disabled={!transferReason.trim()}>Transfer</Button>
                            <Button size="small" onClick={() => setShowTransfer(false)}>Cancel</Button>
                          </Box>
                        </Box>
                      )}
                      {showAdminXfer && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                          <FormControl size="small" fullWidth>
                            <InputLabel>Target Agent</InputLabel>
                            <Select value={adminXferTarget} label="Target Agent" onChange={(e) => setAdminXferTarget(e.target.value)}>
                              {agents.map(a => <MenuItem key={a.uid} value={a.uid}>{a.username || a.email}</MenuItem>)}
                            </Select>
                          </FormControl>
                          <TextField size="small" fullWidth multiline rows={2} placeholder="Reason…" value={adminXferReason} onChange={(e) => setAdminXferReason(e.target.value)} />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" variant="contained" onClick={doAdminXfer} disabled={!adminXferTarget || !adminXferReason.trim()}>Transfer</Button>
                            <Button size="small" onClick={() => setShowAdminXfer(false)}>Cancel</Button>
                          </Box>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Feedback Card */}
            {user.role === 'user' && ticket.created_by === user.uid && (ticket.status === 'Resolved' || ticket.status === 'Closed') && (
              <Card>
                <CardHeader
                  title={<Typography variant="subtitle2" fontWeight={700}>Feedback</Typography>}
                  sx={{ pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}
                />
                <CardContent>
                  {ticket.rating ? (
                    <Box>
                      <Stack direction="row" spacing={0.25} sx={{ mb: 1 }}>
                        {[1,2,3,4,5].map(s => s <= ticket.rating
                          ? <StarRoundedIcon key={s} sx={{ color: '#FFA726', fontSize: 22 }} />
                          : <StarBorderRoundedIcon key={s} sx={{ color: 'text.disabled', fontSize: 22 }} />
                        )}
                      </Stack>
                      {ticket.feedback && (
                        <Typography variant="body2" color="text.secondary">
                          {ticket.feedback}
                        </Typography>
                      )}
                    </Box>
                  ) : !showFeedback ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<StarRoundedIcon />}
                      onClick={() => setShowFeedback(true)}
                    >
                      Rate this Ticket
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Stack direction="row" spacing={0.5}>
                        {[1,2,3,4,5].map(s => (
                          <IconButton key={s} size="small" onClick={() => setRating(s)} sx={{ p: 0.25 }}>
                            {s <= rating
                              ? <StarRoundedIcon sx={{ color: '#FFA726', fontSize: 24 }} />
                              : <StarBorderRoundedIcon sx={{ fontSize: 24, color: 'text.disabled' }} />}
                          </IconButton>
                        ))}
                      </Stack>
                      <TextField
                        size="small"
                        multiline
                        rows={2}
                        fullWidth
                        placeholder="Any additional comments…"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={submitFeedback}
                          disabled={!rating}
                          startIcon={<CheckCircleOutlineIcon />}
                        >
                          Submit
                        </Button>
                        <Button size="small" onClick={() => setShowFeedback(false)}>Cancel</Button>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
