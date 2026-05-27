import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import axios from 'axios';
import {
  Box, Typography, Card, CardContent, CardHeader, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Select, MenuItem, TextField, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Stack, Divider, Tabs, Tab,
  InputAdornment, IconButton, Tooltip, Avatar, LinearProgress, Alert,
  FormControl, InputLabel, useTheme, alpha, CardActions,
} from '@mui/material';
import SearchRoundedIcon          from '@mui/icons-material/SearchRounded';
import PeopleAltRoundedIcon       from '@mui/icons-material/PeopleAltRounded';
import ManageAccountsRoundedIcon  from '@mui/icons-material/ManageAccountsRounded';
import SupportAgentRoundedIcon    from '@mui/icons-material/SupportAgentRounded';
import AdminPanelSettingsIcon     from '@mui/icons-material/AdminPanelSettings';
import PersonOutlineRoundedIcon   from '@mui/icons-material/PersonOutlineRounded';
import CheckCircleRoundedIcon     from '@mui/icons-material/CheckCircleRounded';
import BlockRoundedIcon           from '@mui/icons-material/BlockRounded';
import LockOpenRoundedIcon        from '@mui/icons-material/LockOpenRounded';
import HourglassEmptyRoundedIcon  from '@mui/icons-material/HourglassEmptyRounded';
import AddRoundedIcon             from '@mui/icons-material/AddRounded';
import WorkspacesRoundedIcon      from '@mui/icons-material/WorkspacesRounded';
import EmailOutlinedIcon          from '@mui/icons-material/EmailOutlined';
import EditRoundedIcon            from '@mui/icons-material/EditRounded';
import { PageContainer, PageHeader, StatCard, StatRow, StatCol, EmptyState } from './PageLayout';

const ROLE_META = {
  admin: { label: 'Admin', color: 'error',   icon: <AdminPanelSettingsIcon fontSize="small" /> },
  agent: { label: 'Agent', color: 'warning', icon: <SupportAgentRoundedIcon fontSize="small" /> },
  user:  { label: 'User',  color: 'primary', icon: <PersonOutlineRoundedIcon fontSize="small" /> },
};

const AVATAR_COLORS = ['#5C6BC0','#26A69A','#7E57C2','#42A5F5','#66BB6A','#EF5350'];

export default function UserManagement() {
  const { user, globalUsers, setGlobalUsers, populateCache } = useAuth();
  const theme = useTheme();
  const [users, setUsers] = useState(globalUsers || []);
  const [loading, setLoading] = useState(!globalUsers || globalUsers.length === 0);
  const [alert, setAlert] = useState({ msg: '', type: 'info' });
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Directory action states
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', role: 'user' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSkills, setShowSkills] = useState(false);
  const [skillsText, setSkillsText] = useState('');

  const showAlert = useCallback((msg, type = 'info') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: '', type: 'info' }), 3500);
  }, []);

  const updateUsersState = useCallback((updater) => {
    setUsers(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setGlobalUsers(next);
      populateCache(next);
      return next;
    });
  }, [setGlobalUsers, populateCache]);

  const fetchUsers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(d => ({ firebaseUid: d.id, uid: d.id, ...d.data() }));
      updateUsersState(list);
    } catch {
      showAlert('Failed to load users', 'error');
    }
  }, [showAlert, updateUsersState]);

  useEffect(() => {
    if (user?.role === 'admin') {
      if (!globalUsers || globalUsers.length === 0) {
        setLoading(true);
      }
      fetchUsers().finally(() => setLoading(false));
    }
  }, [user, fetchUsers]);

  const updateRole = async (uid, role) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/users/${uid}/role/`, { role }, { params: { role: user.role, uid: user.uid } });
      showAlert('Role updated successfully', 'success');
      fetchUsers();
    } catch (err) {
      showAlert(err.response?.data?.error || 'Failed to update role', 'error');
    }
  };

  const toggleStatus = async (uid, currentStatus) => {
    try {
      const next = currentStatus === 'active' ? 'blocked' : 'active';
      await axios.patch(`${API_BASE_URL}/api/users/${uid}/status/`, { status: next }, { params: { role: user.role, uid: user.uid } });
      showAlert(`User ${next} successfully`, 'success');
      fetchUsers();
    } catch (err) {
      showAlert(err.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  const verifyAgent = async (uid) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/users/${uid}/verify/`, {}, { params: { role: user.role, uid: user.uid } });
      showAlert('Agent verified successfully', 'success');
      fetchUsers();
    } catch (err) {
      showAlert(err.response?.data?.error || 'Failed to verify agent', 'error');
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.role) { showAlert('Please fill in all fields', 'warning'); return; }
    if (users.some(u => u.email === newUser.email)) { showAlert('Email already exists', 'warning'); return; }
    try {
      await axios.post(`${API_BASE_URL}/api/users/`, newUser, { params: { role: user.role, uid: user.uid } });
      setNewUser({ email: '', role: 'user' });
      setShowCreate(false);
      fetchUsers();
      showAlert('User created successfully!', 'success');
    } catch (err) {
      showAlert(err.response?.data?.error?.message || 'Failed to create user', 'error');
    }
  };

  const updateSkills = async () => {
    if (!selectedUser) return;
    const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
    try {
      await axios.patch(`${API_BASE_URL}/api/users/${selectedUser.uid}/skills/?role=${user.role}&uid=${user.uid}`, { skills });
      showAlert('Skills updated successfully!', 'success');
      setShowSkills(false);
      fetchUsers();
    } catch (err) {
      showAlert(err.response?.data?.error?.message || 'Failed to update skills', 'error');
    }
  };

  const getAvatarColor = (email) => {
    if (!email) return AVATAR_COLORS[0];
    let h = 0;
    for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) & 0xFFFFFF;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || (u.custom_uid || '').toLowerCase().includes(q);
    return matchSearch && (!filterRole || u.role === filterRole);
  });

  const getStatusChip = (u) => {
    if (u.account_status === 'blocked') return <Chip icon={<BlockRoundedIcon sx={{ fontSize: 12 }} />} label="Blocked" color="error" size="small" />;
    if ((u.role === 'agent' || u.role === 'admin') && !u.verified) return <Chip icon={<HourglassEmptyRoundedIcon sx={{ fontSize: 12 }} />} label="Pending" color="warning" size="small" />;
    return <Chip icon={<CheckCircleRoundedIcon sx={{ fontSize: 12 }} />} label="Active" color="success" size="small" />;
  };

  if (!user || user.role !== 'admin') return (
    <PageContainer>
      <EmptyState
        icon={<AdminPanelSettingsIcon sx={{ fontSize: 48 }} />}
        title="Access Denied"
        description="This page requires administrator access."
      />
    </PageContainer>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Manage Users"
        subtitle={`${users.length} registered members · ${users.filter(u => u.role === 'agent').length} agents`}
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setShowCreate(true)}>
            Invite User
          </Button>
        }
      />

      {alert.msg && <Alert severity={alert.type} sx={{ mb: 2.5 }}>{alert.msg}</Alert>}

      <StatRow>
        <StatCol><StatCard icon={<PeopleAltRoundedIcon />} label="Total Users" value={users.length} colorKey="primary" /></StatCol>
        <StatCol><StatCard icon={<PersonOutlineRoundedIcon />} label="End Users" value={users.filter(u => u.role === 'user').length} colorKey="info" /></StatCol>
        <StatCol><StatCard icon={<SupportAgentRoundedIcon />} label="Agents" value={users.filter(u => u.role === 'agent').length} colorKey="success" /></StatCol>
        <StatCol><StatCard icon={<AdminPanelSettingsIcon />} label="Admins" value={users.filter(u => u.role === 'admin').length} colorKey="error" /></StatCol>
      </StatRow>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
          <Tab label="User Directory" id="user-tab-0" aria-controls="user-tabpanel-0" sx={{ fontWeight: 600 }} />
          <Tab label="Access Control & Roles" id="user-tab-1" aria-controls="user-tabpanel-1" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {/* Shared filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search members…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
          }}
          sx={{ width: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Filter Role</InputLabel>
          <Select value={filterRole} label="Filter Role" onChange={e => setFilterRole(e.target.value)}>
            <MenuItem value=""><em>All Roles</em></MenuItem>
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="agent">Agent</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tab Panel 0: Directory (Card Grid) */}
      {tabValue === 0 && (
        <>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}><LinearProgress /></Box>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<PeopleAltRoundedIcon sx={{ fontSize: 48 }} />}
              title="No users found"
              description="Try adjusting the filters or invite a new user"
            />
          ) : (
            <Grid container spacing={2}>
              {filtered.map(u => {
                const rm = ROLE_META[u.role] || ROLE_META.user;
                const initial = (u.name || u.username || u.email || '?')[0].toUpperCase();
                const bgColor = getAvatarColor(u.email);
                const skills = u.skills || [];

                 return (
                   <Grid item xs={12} sm={6} md={4} lg={3} key={u.firebaseUid}>
                     <Card
                       sx={{
                         height: '100%',
                         display: 'flex',
                         flexDirection: 'column',
                         borderLeft: `4px solid ${theme.palette[rm.color]?.main || theme.palette.text.secondary}`,
                         transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                         '&:hover': {
                           transform: 'translateY(-3px)',
                           boxShadow: `0 10px 24px ${alpha(theme.palette[rm.color]?.main || theme.palette.primary.main, 0.15)}`,
                           borderColor: theme.palette[rm.color]?.main || theme.palette.primary.main,
                         }
                       }}
                     >
                       <CardContent sx={{ flex: 1 }}>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.75 }}>
                          <Avatar
                            sx={{
                              width: 44, height: 44,
                              bgcolor: bgColor,
                              fontWeight: 700,
                              fontSize: '1rem',
                            }}
                          >
                            {initial}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={700} noWrap>
                              {u.name || u.username || 'Unregistered'}
                            </Typography>
                            <Chip
                              icon={rm.icon}
                              label={rm.label}
                              color={rm.color}
                              size="small"
                              sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.6875rem', fontWeight: 700 } }}
                            />
                          </Box>
                        </Box>

                        <Divider sx={{ my: 1.5 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                            <EmailOutlinedIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption" noWrap>{u.email}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                            <WorkspacesRoundedIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption" fontWeight={600} color="text.primary">Skills:</Typography>
                          </Box>
                        </Box>

                        {/* Skill Chips */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {skills.length === 0 ? (
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                              No skills specified
                            </Typography>
                          ) : (
                            skills.map(s => (
                              <Chip
                                key={s}
                                label={s}
                                size="small"
                                sx={{
                                  height: 20,
                                  bgcolor: 'action.hover',
                                  fontSize: '0.6875rem',
                                  fontWeight: 500,
                                }}
                              />
                            ))
                          )}
                        </Box>
                      </CardContent>

                      <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          startIcon={<EditRoundedIcon />}
                          onClick={() => {
                            setSelectedUser(u);
                            setSkillsText(skills.join(', '));
                            setShowSkills(true);
                          }}
                        >
                          Skills
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}

      {/* Tab Panel 1: Access Control Table */}
      {tabValue === 1 && (
        <Card sx={{ width: '100%', overflow: 'hidden' }}>
          <CardHeader
            title={<Typography variant="subtitle2" fontWeight={700}>System Access Control</Typography>}
            sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 1.5 }}
          />

          {loading ? (
            <Box sx={{ p: 3 }}><LinearProgress /></Box>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ManageAccountsRoundedIcon sx={{ fontSize: 48 }} />}
              title="No users found"
              description="Try adjusting the filters above"
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>User ID (UID)</TableCell>
                    <TableCell>System Role</TableCell>
                    <TableCell>Account Status</TableCell>
                    <TableCell>Registration Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(u => {
                    const rm = ROLE_META[u.role] || ROLE_META.user;
                    const initial = (u.name || u.username || u.email || '?')[0].toUpperCase();
                    return (
                      <TableRow key={u.firebaseUid} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <Avatar sx={{ width: 30, height: 30, bgcolor: `${rm.color}.main`, fontSize: '0.75rem', fontWeight: 700 }}>
                              {initial}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{u.name || u.username || '—'}</Typography>
                              <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" color="primary.main" fontWeight={700}>
                            {u.custom_uid || u.firebaseUid.substring(0, 10)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={u.role}
                            onChange={e => updateRole(u.firebaseUid, e.target.value)}
                            sx={{ minWidth: 110, fontSize: '0.8125rem' }}
                          >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="agent">Agent</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>{getStatusChip(u)}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {u.created_at
                              ? new Date(u.created_at?.toDate ? u.created_at.toDate() : typeof u.created_at === 'number' ? u.created_at * 1000 : u.created_at).toLocaleDateString()
                              : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                            {(u.role === 'agent' || u.role === 'admin') && !u.verified && (
                              <Tooltip title="Verify Agent">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => verifyAgent(u.firebaseUid)}
                                  sx={{ bgcolor: alpha(theme.palette.success.main, 0.12), '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.2) } }}
                                >
                                  <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={u.account_status === 'blocked' ? 'Activate Account' : 'Block Account'}>
                              <IconButton
                                size="small"
                                color={u.account_status === 'blocked' ? 'success' : 'error'}
                                onClick={() => toggleStatus(u.firebaseUid, u.account_status || 'active')}
                                sx={{
                                  bgcolor: u.account_status === 'blocked' ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.error.main, 0.12),
                                  '&:hover': { opacity: 0.8 },
                                }}
                              >
                                {u.account_status === 'blocked'
                                  ? <LockOpenRoundedIcon sx={{ fontSize: 16 }} />
                                  : <BlockRoundedIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Invite New Member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Email Address"
              fullWidth
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Assigned Role</InputLabel>
              <Select
                value={newUser.role}
                label="Assigned Role"
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="agent">Agent</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={createUser}>Invite Member</Button>
        </DialogActions>
      </Dialog>

      {/* Skills Dialog */}
      <Dialog open={showSkills} onClose={() => setShowSkills(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Skills Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Enter skill keywords separated by commas (e.g. React, Python, Network, Linux) to help with automatic routing.
            </Typography>
            <TextField
              label="Skills"
              fullWidth
              multiline
              rows={2}
              value={skillsText}
              onChange={e => setSkillsText(e.target.value)}
              placeholder="e.g. React, Python, Support"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowSkills(false)}>Cancel</Button>
          <Button variant="contained" onClick={updateSkills}>Save Skills</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
