import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Box, Typography, Card, CardContent, CardHeader, Grid,
  Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, LinearProgress, Stack, useTheme, alpha,
} from '@mui/material';
import BarChartRoundedIcon      from '@mui/icons-material/BarChartRounded';
import WarningAmberRoundedIcon  from '@mui/icons-material/WarningAmberRounded';
import SpeedRoundedIcon         from '@mui/icons-material/SpeedRounded';
import PeopleAltRoundedIcon     from '@mui/icons-material/PeopleAltRounded';
import CategoryRoundedIcon      from '@mui/icons-material/CategoryRounded';
import StarRoundedIcon          from '@mui/icons-material/StarRounded';
import DownloadRoundedIcon      from '@mui/icons-material/DownloadRounded';
import ErrorOutlineIcon         from '@mui/icons-material/ErrorOutline';
import VerifiedRoundedIcon      from '@mui/icons-material/VerifiedRounded';
import TrendingUpRoundedIcon    from '@mui/icons-material/TrendingUpRounded';
import { PageContainer, PageHeader, StatCard, StatRow, StatCol } from './PageLayout';

// StatCard is now imported from PageLayout

export default function Reports() {
  const { user, userCache, fetchUser, globalTickets, ticketsLoading } = useAuth();
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [report, setReport] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const r = await axios.get(`${API_BASE_URL}/api/reports/sla/`, { params: { role: user.role } });
      setReport(r.data);
    } catch {}
    setApiLoading(false);
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') fetchData();
  }, [user, fetchData]);

  useEffect(() => {
    if (globalTickets.length) {
      const assignees = [...new Set(globalTickets.map(t => t.assigned_to).filter(Boolean))];
      assignees.forEach(fetchUser);
    }
  }, [globalTickets, fetchUser]);

  const tickets = globalTickets;
  const loading = ticketsLoading || apiLoading;

  if (!user || user.role !== 'admin') return (
    <PageContainer>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
        <Typography variant="h6" fontWeight={700}>Access Denied</Typography>
        <Typography variant="body2" color="text.secondary">This page requires admin access.</Typography>
      </Box>
    </PageContainer>
  );

  if (loading) return (
    <PageContainer><LinearProgress /></PageContainer>
  );

  // Data helpers
  const resolutionData = (() => {
    const resolved = tickets.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.resolved_at);
    if (!resolved.length) return { average: 'N/A', count: 0 };
    const total = resolved.reduce((s, t) => {
      const c = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at || 0);
      const r = t.resolved_at?.toDate ? t.resolved_at.toDate() : new Date(t.resolved_at);
      return s + (r - c);
    }, 0);
    const avg = total / resolved.length;
    return { average: `${Math.floor(avg / 3600000)}h ${Math.floor((avg % 3600000) / 60000)}m`, count: resolved.length };
  })();

  const satData = (() => {
    const rated = tickets.filter(t => t.rating);
    if (!rated.length) return { average: 'N/A', count: 0, dist: new Map() };
    const total = rated.reduce((s, t) => s + t.rating, 0);
    const dist = new Map([[5,0],[4,0],[3,0],[2,0],[1,0]]);
    rated.forEach(t => dist.set(t.rating, (dist.get(t.rating) || 0) + 1));
    return { average: (total / rated.length).toFixed(1), count: rated.length, dist };
  })();

  const volumeData = (() => {
    const m = new Map();
    tickets.forEach(t => {
      const d = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at || 0);
      const k = d.toLocaleDateString();
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  })();

  const agentData = (() => {
    const m = new Map();
    tickets.forEach(t => {
      if (!t.assigned_to) return;
      if (!m.has(t.assigned_to)) m.set(t.assigned_to, { total: 0, resolved: 0, open: 0 });
      const s = m.get(t.assigned_to);
      s.total++;
      if (t.status === 'Resolved' || t.status === 'Closed') s.resolved++; else s.open++;
    });
    return Array.from(m.entries());
  })();

  const categoryData = (() => {
    const m = new Map();
    tickets.forEach(t => { const c = t.category || 'Uncategorized'; m.set(c, (m.get(c) || 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  })();

  const priorityData = (() => {
    const m = new Map([['Critical', 0], ['High', 0], ['Medium', 0], ['Low', 0]]);
    tickets.forEach(t => { const p = t.priority || 'Medium'; m.set(p, (m.get(p) || 0) + 1); });
    return Array.from(m.entries());
  })();

  const exportCSV = (type) => {
    let csv = '', filename = '';
    if (type === 'volume') {
      csv = 'Date,Count\n' + volumeData.map(([d, c]) => `${d},${c}`).join('\n');
      filename = 'volume.csv';
    } else if (type === 'category') {
      csv = 'Category,Count\n' + categoryData.map(([c, n]) => `${c},${n}`).join('\n');
      filename = 'category.csv';
    }
    if (!csv) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename; a.click();
  };

  const TABS = [
    { label: 'SLA', icon: <SpeedRoundedIcon fontSize="small" /> },
    { label: 'Volume', icon: <BarChartRoundedIcon fontSize="small" /> },
    { label: 'Agents', icon: <PeopleAltRoundedIcon fontSize="small" /> },
    { label: 'Categories', icon: <CategoryRoundedIcon fontSize="small" /> },
    { label: 'Satisfaction', icon: <StarRoundedIcon fontSize="small" /> },
  ];

  const PRIORITY_COLOR = { Critical: 'error', High: 'warning', Medium: 'info', Low: 'success' };

  return (
    <PageContainer>
      <PageHeader title="Reports & Analytics" subtitle="Performance insights across your support team" />

      {/* KPI Cards */}
      <StatRow>
        <StatCol><StatCard icon={<TrendingUpRoundedIcon />} label="Total Tickets" value={report?.total_tickets || tickets.length} colorKey="primary" /></StatCol>
        <StatCol><StatCard icon={<WarningAmberRoundedIcon />} label="SLA Breached" value={report?.total_breached || 0} colorKey="error" /></StatCol>
        <StatCol><StatCard icon={<SpeedRoundedIcon />} label="Avg Resolution" value={resolutionData.average} sub={`${resolutionData.count} tickets`} colorKey="info" /></StatCol>
        <StatCol><StatCard icon={<StarRoundedIcon />} label="Avg Rating" value={satData.average} sub={`${satData.count} reviews`} colorKey="warning" /></StatCol>
      </StatRow>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 1 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {TABS.map((t, i) => (
              <Tab
                key={i}
                label={t.label}
                icon={t.icon}
                iconPosition="start"
                sx={{ minHeight: 48, gap: 0.5 }}
              />
            ))}
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {/* SLA Tab */}
          {tab === 0 && (
            <Box sx={{ p: 3 }}>
              {!report || !report.breached_tickets?.length ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <VerifiedRoundedIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={700} color="success.main">No SLA Breaches</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>All tickets are within SLA limits.</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>SLA Deadline</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.breached_tickets.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell><Typography variant="body2" fontWeight={600}>{t.title}</Typography></TableCell>
                          <TableCell><Chip label={t.priority} color={PRIORITY_COLOR[t.priority] || 'default'} size="small" /></TableCell>
                          <TableCell><Typography variant="caption">{t.category}</Typography></TableCell>
                          <TableCell><Chip label={t.status} size="small" variant="outlined" /></TableCell>
                          <TableCell><Typography variant="caption" color="error.main">{new Date(t.sla_deadline).toLocaleString()}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Volume Tab */}
          {tab === 1 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>Tickets Created Per Day</Typography>
                <Button size="small" startIcon={<DownloadRoundedIcon />} variant="outlined" onClick={() => exportCSV('volume')}>Export</Button>
              </Box>
              {volumeData.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No data available</Typography>
              ) : (
                <Box>
                  {volumeData.map(([date, count]) => (
                    <Box key={date} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>{date}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (count / Math.max(...volumeData.map(d => d[1]))) * 100)}
                        sx={{ flex: 1, height: 8 }}
                      />
                      <Typography variant="caption" fontWeight={700} sx={{ width: 24, textAlign: 'right' }}>{count}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Agents Tab */}
          {tab === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Agent Performance</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Agent</TableCell>
                      <TableCell align="center">Total</TableCell>
                      <TableCell align="center">Resolved</TableCell>
                      <TableCell align="center">Open</TableCell>
                      <TableCell align="right">Resolution Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {agentData.map(([uid, s]) => {
                      const rate = s.total > 0 ? ((s.resolved / s.total) * 100).toFixed(0) : 0;
                      return (
                        <TableRow key={uid}>
                          <TableCell><Typography variant="body2" fontWeight={600}>{userCache[uid] || uid}</Typography></TableCell>
                          <TableCell align="center"><Typography variant="body2">{s.total}</Typography></TableCell>
                          <TableCell align="center">
                            <Chip label={s.resolved} color="success" size="small" sx={{ height: 20 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={s.open} color="warning" variant="outlined" size="small" sx={{ height: 20 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                              <LinearProgress
                                variant="determinate"
                                value={Number(rate)}
                                color={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'error'}
                                sx={{ width: 60, height: 6 }}
                              />
                              <Typography variant="caption" fontWeight={700}>{rate}%</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Categories Tab */}
          {tab === 3 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>Distribution</Typography>
                <Button size="small" startIcon={<DownloadRoundedIcon />} variant="outlined" onClick={() => exportCSV('category')}>Export</Button>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>By Category</Typography>
                  {categoryData.map(([cat, count]) => (
                    <Box key={cat} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>{cat}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {count} · {tickets.length > 0 ? ((count / tickets.length) * 100).toFixed(1) : 0}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={tickets.length > 0 ? (count / tickets.length) * 100 : 0}
                        sx={{ height: 8 }}
                      />
                    </Box>
                  ))}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>By Priority</Typography>
                  {priorityData.map(([priority, count]) => (
                    <Box key={priority} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Chip label={priority} size="small" color={PRIORITY_COLOR[priority] || 'default'} sx={{ height: 20 }} />
                        <Typography variant="caption" color="text.secondary">
                          {count} · {tickets.length > 0 ? ((count / tickets.length) * 100).toFixed(1) : 0}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={tickets.length > 0 ? (count / tickets.length) * 100 : 0}
                        color={PRIORITY_COLOR[priority] || 'primary'}
                        sx={{ height: 8 }}
                      />
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Satisfaction Tab */}
          {tab === 4 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Customer Satisfaction</Typography>
              {satData.count === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <StarRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No ratings yet</Typography>
                </Box>
              ) : (
                <Grid container spacing={3} alignItems="flex-start">
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ textAlign: 'center', py: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="h2" fontWeight={800} sx={{ color: '#FFA726', lineHeight: 1 }}>
                        {satData.average}
                      </Typography>
                      <Stack direction="row" justifyContent="center" spacing={0.25} sx={{ mt: 1 }}>
                        {[1,2,3,4,5].map(s => (
                          <StarRoundedIcon key={s} sx={{ fontSize: 18, color: s <= Math.round(parseFloat(satData.average)) ? '#FFA726' : 'text.disabled' }} />
                        ))}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {satData.count} total ratings
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    {Array.from(satData.dist.entries()).reverse().map(([r, count]) => (
                      <Box key={r} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Stack direction="row" spacing={0.1} sx={{ width: 80, flexShrink: 0 }}>
                          {[1,2,3,4,5].map(s => (
                            <StarRoundedIcon key={s} sx={{ fontSize: 14, color: s <= r ? '#FFA726' : 'text.disabled' }} />
                          ))}
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={satData.count > 0 ? (count / satData.count) * 100 : 0}
                          sx={{ flex: 1, height: 8 }}
                          color="warning"
                        />
                        <Typography variant="caption" fontWeight={700} sx={{ width: 24 }}>{count}</Typography>
                      </Box>
                    ))}
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}