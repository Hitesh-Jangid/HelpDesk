import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';
import {
  Box, Card, CardContent, Button, IconButton, TextField, Chip, Divider,
  Tab, Tabs, LinearProgress, useTheme, Stack, Tooltip, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, alpha, Avatar, Collapse,
} from '@mui/material';
import AddRoundedIcon            from '@mui/icons-material/AddRounded';
import FormatListBulletedIcon    from '@mui/icons-material/FormatListBulleted';
import PlayArrowRoundedIcon      from '@mui/icons-material/PlayArrowRounded';
import CheckRoundedIcon          from '@mui/icons-material/CheckRounded';
import DeleteOutlineRoundedIcon  from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon           from '@mui/icons-material/EditRounded';
import SaveRoundedIcon           from '@mui/icons-material/SaveRounded';
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded';
import UndoRoundedIcon           from '@mui/icons-material/UndoRounded';
import TaskAltRoundedIcon        from '@mui/icons-material/TaskAltRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import CheckCircleOutlineIcon    from '@mui/icons-material/CheckCircleOutline';
import InboxRoundedIcon          from '@mui/icons-material/InboxRounded';
import LockRoundedIcon           from '@mui/icons-material/LockRounded';
import LinkRoundedIcon           from '@mui/icons-material/LinkRounded';
import NotesRoundedIcon          from '@mui/icons-material/NotesRounded';
import FlagRoundedIcon           from '@mui/icons-material/FlagRounded';
import ExpandMoreRoundedIcon     from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon     from '@mui/icons-material/ExpandLessRounded';
import CalendarTodayRoundedIcon  from '@mui/icons-material/CalendarTodayRounded';
import { PageContainer, PageHeader, StatCard, StatRow, StatCol, EmptyState } from './PageLayout';

const PRIORITY_COLOR = { Critical: 'error', High: 'warning', Medium: 'info', Low: 'success' };
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

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

export default function Todo() {
  const { user, globalTodos, setGlobalTodos } = useAuth();
  const theme = useTheme();
  const [todos, setTodos] = useState(globalTodos || []);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(!globalTodos || globalTodos.length === 0);
  const [saving, setSaving] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newLinkedTicket, setNewLinkedTicket] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  // Inline editing
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Expanded items (for showing notes/details)
  const [expandedId, setExpandedId] = useState(null);

  const tabKeys = ['backlog', 'in_progress', 'complete'];

  const updateTodosState = useCallback((updater) => {
    setTodos(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setGlobalTodos(next);
      return next;
    });
  }, [setGlobalTodos]);

  // ────────────────────────── API calls (all uid-scoped) ──────────────────────
  const fetchTodos = useCallback(async () => {
    if (!user) return;
    try {
      const r = await axios.get(`${API_BASE_URL}/api/todos/?uid=${user.uid}`);
      updateTodosState(r.data.todos || []);
    } catch { /* private — silently fail */ }
  }, [user, updateTodosState]);

  useEffect(() => {
    if (!user) return;
    if (!globalTodos || globalTodos.length === 0) {
      setLoading(true);
    }
    fetchTodos().finally(() => setLoading(false));
  }, [fetchTodos, user]);

  const addTodo = async () => {
    if (!newTitle.trim() || saving) return;
    setSaving(true);
    try {
      const r = await axios.post(`${API_BASE_URL}/api/todos/?uid=${user.uid}`, {
        title: newTitle.trim(),
        status: 'backlog',
        priority: newPriority,
        linked_ticket: newLinkedTicket.trim() || null,
        notes: newNotes.trim(),
        due_date: newDueDate || null,
      });
      updateTodosState(p => [...p, r.data]);
      setNewTitle(''); setNewPriority('Medium'); setNewLinkedTicket('');
      setNewNotes(''); setNewDueDate(''); setCreateOpen(false);
    } catch { /* fail silently */ } finally { setSaving(false); }
  };

  const quickAdd = async (title) => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const r = await axios.post(`${API_BASE_URL}/api/todos/?uid=${user.uid}`, {
        title: title.trim(), status: 'backlog', priority: 'Medium',
      });
      updateTodosState(p => [...p, r.data]);
    } catch { /* */ } finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    if (saving) return;
    setSaving(true);
    try {
      const r = await axios.patch(`${API_BASE_URL}/api/todos/${id}/?uid=${user.uid}`, { status });
      updateTodosState(p => p.map(t => t.id === id ? r.data : t));
    } catch { /* */ } finally { setSaving(false); }
  };

  const updatePriority = async (id, priority) => {
    if (saving) return;
    setSaving(true);
    try {
      const r = await axios.patch(`${API_BASE_URL}/api/todos/${id}/?uid=${user.uid}`, { priority });
      updateTodosState(p => p.map(t => t.id === id ? r.data : t));
    } catch { /* */ } finally { setSaving(false); }
  };

  const saveEdit = async (id) => {
    if (!editText.trim() || saving) return;
    setSaving(true);
    try {
      const r = await axios.patch(`${API_BASE_URL}/api/todos/${id}/?uid=${user.uid}`, { title: editText });
      updateTodosState(p => p.map(t => t.id === id ? r.data : t));
      setEditingId(null); setEditText('');
    } catch { /* */ } finally { setSaving(false); }
  };

  const deleteTodo = async (id) => {
    if (saving || !window.confirm('Delete this task?')) return;
    setSaving(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/todos/${id}/?uid=${user.uid}`);
      updateTodosState(p => p.filter(t => t.id !== id));
    } catch { /* */ } finally { setSaving(false); }
  };

  // ────────────────────────── Derived state ───────────────────────────────────
  const tabCounts = {
    backlog:     todos.filter(t => t.status === 'backlog').length,
    in_progress: todos.filter(t => t.status === 'in_progress').length,
    complete:    todos.filter(t => t.status === 'complete').length,
  };
  const currentKey = tabKeys[activeTab];
  const items = todos
    .filter(t => t.status === currentKey)
    .sort((a, b) => {
      const pOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    });

  // Quick-add ref
  const [quickText, setQuickText] = useState('');

  return (
    <PageContainer>
      <PageHeader
        title="My Private Tasks"
        subtitle="Only you can see these — they are never shared with anyone"
        action={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setCreateOpen(true)}
            size="small"
          >
            New Task
          </Button>
        }
      />

      {/* ── Privacy Banner ─────────────────────────────────────────────── */}
      <Card
        sx={{
          mb: 2,
          bgcolor: alpha(theme.palette.info.main, 0.06),
          border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <LockRoundedIcon sx={{ fontSize: 18, color: 'info.main' }} />
          <Typography variant="caption" color="info.main" fontWeight={600}>
            Your tasks are private and encrypted to your account. Admins and agents cannot see them.
          </Typography>
        </CardContent>
      </Card>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <StatRow>
        <StatCol><StatCard icon={<FormatListBulletedIcon />} label="Total Tasks" value={todos.length} colorKey="primary" /></StatCol>
        <StatCol><StatCard icon={<PendingActionsRoundedIcon />} label="Backlog" value={tabCounts.backlog} colorKey="secondary" /></StatCol>
        <StatCol><StatCard icon={<TaskAltRoundedIcon />} label="In Progress" value={tabCounts.in_progress} colorKey="warning" /></StatCol>
        <StatCol><StatCard icon={<CheckCircleOutlineIcon />} label="Completed" value={tabCounts.complete} colorKey="success" /></StatCol>
      </StatRow>

      {/* ── Quick Add ──────────────────────────────────────────────────── */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Quick add a task and press Enter…"
              value={quickText}
              onChange={e => setQuickText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && quickText.trim()) {
                  quickAdd(quickText);
                  setQuickText('');
                }
              }}
              disabled={saving}
              InputProps={{
                sx: { borderRadius: 2 },
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                if (quickText.trim()) { quickAdd(quickText); setQuickText(''); }
              }}
              disabled={!quickText.trim() || saving}
              sx={{ flexShrink: 0, borderRadius: 2 }}
            >
              Add
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ── Task List ──────────────────────────────────────────────────── */}
      <Card>
        <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>Backlog<Chip label={tabCounts.backlog} size="small" sx={{ height: 18, fontSize: '0.68rem' }} /></Box>}
            />
            <Tab
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>In Progress<Chip label={tabCounts.in_progress} color="warning" size="small" sx={{ height: 18, fontSize: '0.68rem' }} /></Box>}
            />
            <Tab
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>Completed<Chip label={tabCounts.complete} color="success" size="small" sx={{ height: 18, fontSize: '0.68rem' }} /></Box>}
            />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ p: 3 }}><LinearProgress /></Box>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<InboxRoundedIcon sx={{ fontSize: 44 }} />}
            title={activeTab === 0 ? 'No backlog items' : activeTab === 2 ? 'Nothing completed yet' : 'Nothing in progress'}
            description={activeTab === 0 ? 'Add a new task using the input above' : 'Move tasks here as you work through them'}
          />
        ) : (
          items.map((item, index) => (
            <Box key={item.id}>
              {index > 0 && <Divider />}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderLeft: '3px solid transparent',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderLeftColor: 
                      item.priority === 'Critical' ? 'error.main' :
                      item.priority === 'High' ? 'warning.main' :
                      item.priority === 'Medium' ? 'info.main' :
                      'success.main',
                    px: '17px',
                  },
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {/* Priority indicator */}
                  <Tooltip title={item.priority || 'Medium'}>
                    <FlagRoundedIcon
                      sx={{
                        fontSize: 18,
                        color: `${PRIORITY_COLOR[item.priority] || 'info'}.main`,
                        flexShrink: 0,
                        cursor: 'default',
                      }}
                    />
                  </Tooltip>

                  {/* Title / Edit */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {editingId === item.id ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(item.id);
                          if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
                        }}
                        autoFocus
                      />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{
                            textDecoration: item.status === 'complete' ? 'line-through' : 'none',
                            color: item.status === 'complete' ? 'text.disabled' : 'text.primary',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </Typography>
                        {item.linked_ticket && (
                          <Chip
                            component={Link}
                            to={`/tickets/${item.linked_ticket}`}
                            icon={<LinkRoundedIcon sx={{ fontSize: '14px !important' }} />}
                            label={item.linked_ticket.substring(0, 8)}
                            size="small"
                            variant="outlined"
                            color="info"
                            clickable
                            sx={{ height: 20, fontSize: '0.65rem', '& .MuiChip-icon': { ml: '4px' } }}
                          />
                        )}
                        {item.notes && (
                          <NotesRoundedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        )}
                        {item.due_date && (
                          <Chip
                            icon={<CalendarTodayRoundedIcon sx={{ fontSize: '12px !important' }} />}
                            label={new Date(item.due_date).toLocaleDateString()}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.62rem', '& .MuiChip-icon': { ml: '4px' } }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Actions */}
                  <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                    {editingId === item.id ? (
                      <>
                        <Tooltip title="Save">
                          <IconButton size="small" color="primary" onClick={() => saveEdit(item.id)} disabled={saving}>
                            <SaveRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton size="small" onClick={() => { setEditingId(null); setEditText(''); }}>
                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        {/* Expand/Collapse */}
                        {(item.notes || item.linked_ticket) && (
                          <Tooltip title={expandedId === item.id ? 'Collapse' : 'Details'}>
                            <IconButton size="small" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                              {expandedId === item.id
                                ? <ExpandLessRoundedIcon sx={{ fontSize: 16 }} />
                                : <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {/* Status transitions */}
                        {item.status === 'backlog' && (
                          <Tooltip title="Start">
                            <IconButton size="small" color="warning" onClick={() => updateStatus(item.id, 'in_progress')} disabled={saving}>
                              <PlayArrowRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {item.status === 'in_progress' && (
                          <>
                            <Tooltip title="Move to Backlog">
                              <IconButton size="small" onClick={() => updateStatus(item.id, 'backlog')} disabled={saving}>
                                <UndoRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Complete">
                              <IconButton size="small" color="success" onClick={() => updateStatus(item.id, 'complete')} disabled={saving}>
                                <CheckRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {item.status === 'complete' && (
                          <Tooltip title="Reopen">
                            <IconButton size="small" color="warning" onClick={() => updateStatus(item.id, 'in_progress')} disabled={saving}>
                              <UndoRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => { setEditingId(item.id); setEditText(item.title); }} disabled={saving}>
                            <EditRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => deleteTodo(item.id)} disabled={saving}>
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </Box>

                {/* Expanded details */}
                <Collapse in={expandedId === item.id}>
                  <Box
                    sx={{
                      mt: 1,
                      ml: 4.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.background.default, 0.6),
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {item.notes && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, whiteSpace: 'pre-wrap' }}>
                        {item.notes}
                      </Typography>
                    )}
                    {item.linked_ticket && (
                      <Typography variant="caption" color="text.secondary">
                        🔗 Linked to ticket:{' '}
                        <Typography
                          component={Link}
                          to={`/tickets/${item.linked_ticket}`}
                          variant="caption"
                          color="primary"
                          fontWeight={600}
                          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {item.linked_ticket}
                        </Typography>
                      </Typography>
                    )}
                    {item.created_at && (
                      <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                        Created {getRelativeTime(item.created_at)}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Box>
            </Box>
          ))
        )}
      </Card>

      {/* ── Create Task Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockRoundedIcon sx={{ fontSize: 18, color: 'info.main' }} />
            <Typography fontWeight={700}>New Private Task</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            This task will only be visible to you
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Stack spacing={2}>
            <TextField
              label="Task Title"
              fullWidth
              size="small"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
              autoFocus
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Priority</InputLabel>
                <Select value={newPriority} label="Priority" onChange={e => setNewPriority(e.target.value)}>
                  {PRIORITY_OPTIONS.map(p => (
                    <MenuItem key={p} value={p}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FlagRoundedIcon sx={{ fontSize: 14, color: `${PRIORITY_COLOR[p]}.main` }} />
                        {p}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Due Date"
                type="date"
                size="small"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              label="Linked Ticket ID (optional)"
              fullWidth
              size="small"
              value={newLinkedTicket}
              onChange={e => setNewLinkedTicket(e.target.value)}
              placeholder="Paste a Firestore ticket document ID"
              InputProps={{
                startAdornment: <LinkRoundedIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 1 }} />,
              }}
            />
            <TextField
              label="Notes (optional)"
              fullWidth
              size="small"
              multiline
              rows={3}
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Private notes for this task…"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} color="inherit" size="small">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={addTodo}
            disabled={!newTitle.trim() || saving}
            startIcon={<AddRoundedIcon />}
            size="small"
          >
            Create Task
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
