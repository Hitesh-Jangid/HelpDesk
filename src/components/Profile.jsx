import { useState, useEffect, useCallback } from 'react';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  updatePassword, 
  updateEmail, 
  updateProfile, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from 'firebase/auth';
import { useAuth } from '../AuthContext';
import {
  Box, Grid, Typography, Card, CardContent,
  Avatar, Button, TextField, Chip, Divider,
  IconButton, Alert, Snackbar, useTheme, alpha, Stack, InputAdornment, Tooltip
} from '@mui/material';
import { PageContainer, PageHeader, StatRow, StatCol, StatCard } from './PageLayout';
import ManageAccountsRoundedIcon   from '@mui/icons-material/ManageAccountsRounded';
import EmailOutlinedIcon          from '@mui/icons-material/EmailOutlined';
import FingerprintRoundedIcon     from '@mui/icons-material/FingerprintRounded';
import ShieldRoundedIcon          from '@mui/icons-material/ShieldRounded';
import SaveRoundedIcon            from '@mui/icons-material/SaveRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import CalendarTodayRoundedIcon   from '@mui/icons-material/CalendarTodayRounded';
import VerifiedUserRoundedIcon    from '@mui/icons-material/VerifiedUserRounded';
import AccessTimeRoundedIcon      from '@mui/icons-material/AccessTimeRounded';
import CheckCircleOutlineIcon     from '@mui/icons-material/CheckCircleOutline';
import VpnKeyRoundedIcon          from '@mui/icons-material/VpnKeyRounded';
import PersonRoundedIcon          from '@mui/icons-material/PersonRounded';
import AlternateEmailRoundedIcon   from '@mui/icons-material/AlternateEmailRounded';
import BusinessCenterRoundedIcon   from '@mui/icons-material/BusinessCenterRounded';
import InfoRoundedIcon             from '@mui/icons-material/InfoRounded';
import LocationOnRoundedIcon       from '@mui/icons-material/LocationOnRounded';
import BusinessRoundedIcon         from '@mui/icons-material/BusinessRounded';
import LocalPhoneRoundedIcon       from '@mui/icons-material/LocalPhoneRounded';
import LanguageRoundedIcon         from '@mui/icons-material/LanguageRounded';
import VisibilityIcon              from '@mui/icons-material/Visibility';
import VisibilityOffIcon           from '@mui/icons-material/VisibilityOff';
import LockRoundedIcon             from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon         from '@mui/icons-material/LockOpenRounded';
import EditRoundedIcon            from '@mui/icons-material/EditRounded';
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded';
import GitHubIcon                 from '@mui/icons-material/GitHub';
import SmartphoneRoundedIcon      from '@mui/icons-material/SmartphoneRounded';

const ROLE_META = {
  admin: { label: 'Administrator', color: '#ef4444', light: '#fef2f2' },
  agent: { label: 'Support Agent', color: '#f59e0b', light: '#fffbeb' },
  user:  { label: 'Client User', color: '#3b82f6', light: '#eff6ff' },
};

function getAvatarColor(name) {
  if (!name) return '#5C6BC0';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#5C6BC0', '#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26A69A', '#EC407A'];
  return colors[Math.abs(hash) % colors.length];
}

export default function Profile() {
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Profile database backup state
  const [profile, setProfile] = useState({
    name: '',
    username: '',
    email: '',
    role: 'user',
    joined_at: '',
    profession: '',
    bio: '',
    address: '',
    company: '',
    phone: '',
    mobile: '',
    github: '',
    website: '',
    custom_uid: '',
  });
  
  // Unified Form State for all user metadata fields
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    profession: '',
    bio: '',
    address: '',
    company: '',
    email: '',
    phone: '',
    mobile: '',
    github: '',
    website: '',
    custom_uid: '',
  });
  
  // Security credentials state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Alert feedback state
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'success' });

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const d = snap.data();
        const pData = {
          name: d.name || user.name || user.displayName || '',
          username: d.username || '',
          email: d.email || user.email || '',
          role: d.role || user.role || 'user',
          profession: d.profession || '',
          bio: d.bio || '',
          address: d.address || '',
          company: d.company || '',
          phone: d.phone || '',
          mobile: d.mobile || '',
          github: d.github || '',
          website: d.website || '',
          joined_at: d.joined_at || d.created_at || '',
          custom_uid: d.custom_uid || d.customUid || '',
        };
        setProfile(pData);
        setFormData({
          name: pData.name,
          username: pData.username,
          profession: pData.profession,
          bio: pData.bio,
          address: pData.address,
          company: pData.company,
          email: pData.email,
          phone: pData.phone,
          mobile: pData.mobile,
          github: pData.github,
          website: pData.website,
          custom_uid: pData.custom_uid,
        });
      } else {
        const pData = {
          name: user.name || user.displayName || '',
          username: '',
          email: user.email || '',
          role: user.role || 'user',
          profession: '',
          bio: '',
          address: '',
          company: '',
          phone: '',
          mobile: '',
          github: '',
          website: '',
          joined_at: '',
          custom_uid: '',
        };
        setProfile(pData);
        setFormData({
          name: pData.name,
          username: pData.username,
          profession: pData.profession,
          bio: pData.bio,
          address: pData.address,
          company: pData.company,
          email: pData.email,
          phone: pData.phone,
          mobile: pData.mobile,
          github: pData.github,
          website: pData.website,
          custom_uid: pData.custom_uid,
        });
      }
    } catch (e) {
      console.error(e);
      setAlert({ show: true, msg: 'Failed to retrieve profile configuration details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (saving) return;
    if (!formData.name.trim()) {
      setAlert({ show: true, msg: 'Full Display Name is required.', type: 'error' });
      return;
    }
    
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Authentication session not found.');

      // 1. Password credentials update
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match.');
        }
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const isPasswordProvider = currentUser.providerData.some(p => p.providerId === 'password');
        if (isPasswordProvider) {
          if (!oldPassword) {
            throw new Error('Current password is required to change credentials.');
          }
          const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
          await reauthenticateWithCredential(currentUser, credential);
        }
        await updatePassword(currentUser, newPassword);
      }

      // 2. Email credentials update
      if (formData.email.trim().toLowerCase() !== (profile.email || '').trim().toLowerCase()) {
        const isPasswordProvider = currentUser.providerData.some(p => p.providerId === 'password');
        if (isPasswordProvider && !newPassword) {
          if (!oldPassword) {
            throw new Error('Current password is required to change email.');
          }
          const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
          await reauthenticateWithCredential(currentUser, credential);
        }
        await updateEmail(currentUser, formData.email.trim());
      }

      // 3. User display name update
      if (formData.name.trim() !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: formData.name.trim() });
      }

      // 4. Update the complete suite of fields in Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      const updateData = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        profession: formData.profession.trim(),
        bio: formData.bio.trim(),
        address: formData.address.trim(),
        company: formData.company.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        mobile: formData.mobile.trim(),
        github: formData.github.trim(),
        website: formData.website.trim(),
        custom_uid: formData.custom_uid,
      };
      await setDoc(userRef, updateData, { merge: true });

      // 5. Update local storage user session
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        const newUserData = {
          ...userData,
          name: formData.name.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
        };
        localStorage.setItem('user', JSON.stringify(newUserData));
      }

      // Reset security credentials states
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setProfile(prev => ({
        ...prev,
        ...updateData,
      }));

      setIsEditing(false);
      setAlert({ show: true, msg: 'Profile details saved successfully.', type: 'success' });
    } catch (err) {
      console.error(err);
      let errMsg = err.message || 'Failed to update profile settings.';
      if (err.code === 'auth/wrong-password') {
        errMsg = 'Incorrect current password.';
      } else if (err.code === 'auth/requires-recent-login') {
        errMsg = 'Authentication timeout. Please re-login to update credentials.';
      }
      setAlert({ show: true, msg: errMsg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile.name,
      username: profile.username,
      profession: profile.profession,
      bio: profile.bio,
      address: profile.address,
      company: profile.company,
      email: profile.email,
      phone: profile.phone,
      mobile: profile.mobile,
      github: profile.github,
      website: profile.website,
      custom_uid: profile.custom_uid,
    });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <PageContainer maxWidth="md">
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <Alert severity="info" sx={{ borderRadius: 3, px: 4 }}>Loading profile settings console...</Alert>
        </Box>
      </PageContainer>
    );
  }

  const roleMeta = ROLE_META[profile.role] || ROLE_META.user;
  const avatarBg = getAvatarColor(formData.name || formData.username || formData.email);
  const initials = ((formData.name || formData.username || formData.email || 'U')[0]).toUpperCase();

  const joinedDate = profile.joined_at
    ? (profile.joined_at.toDate ? profile.joined_at.toDate() : new Date(profile.joined_at))
    : new Date();
  const joinedStr = joinedDate.toLocaleDateString();
  const accountAgeDays = Math.max(1, Math.ceil((Date.now() - joinedDate.getTime()) / 86400000));

  // Completeness score over the 11 metadata fields
  const filledFieldsCount = [
    formData.name, formData.username, formData.profession, formData.bio, formData.address,
    formData.company, formData.email, formData.phone, formData.mobile, formData.github, formData.website
  ].filter(val => val && val.trim() !== '').length;
  const completenessPercentage = Math.round((filledFieldsCount / 11) * 100);

  return (
    <PageContainer>
      
      <PageHeader
        title="My Profile"
        subtitle="Manage your user profile details, contact information, and security credentials"
      />

      <StatRow>
        <StatCol>
          <StatCard
            icon={<CalendarTodayRoundedIcon />}
            label="Days Active"
            value={`${accountAgeDays} Day${accountAgeDays !== 1 ? 's' : ''}`}
            sub="Since registration"
            colorKey="primary"
          />
        </StatCol>
        <StatCol>
          <StatCard
            icon={<VerifiedUserRoundedIcon />}
            label="Account Status"
            value="Active"
            sub="Security verified"
            colorKey="success"
          />
        </StatCol>
        <StatCol>
          <StatCard
            icon={<WorkspacePremiumRoundedIcon />}
            label="Profile Completion"
            value={`${completenessPercentage}%`}
            sub={`${filledFieldsCount} of 11 details set`}
            colorKey="info"
          />
        </StatCol>
        <StatCol>
          <StatCard
            icon={<AccessTimeRoundedIcon />}
            label="Session Status"
            value="Optimal"
            sub="Response status active"
            colorKey="warning"
          />
        </StatCol>
      </StatRow>

      <Grid container spacing={3.5}>
        
        {/* LEFT SIDEBAR COLUMN */}
        <Grid item xs={12} md={4.25}>
          <Stack spacing={3.5}>
            
            <Card
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderLeft: `4px solid ${roleMeta.color}`,
                boxShadow: `0 8px 24px ${alpha(roleMeta.color, 0.05)}`,
                transition: 'all 0.25s',
                '&:hover': {
                  boxShadow: `0 12px 32px ${alpha(roleMeta.color, 0.08)}`,
                }
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -20,
                  right: -20,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(roleMeta.color, 0.03),
                  color: roleMeta.color,
                  opacity: 0.08,
                  pointerEvents: 'none',
                  zIndex: 0,
                  '& svg': { fontSize: 80, transform: 'rotate(-12deg)' }
                }}
              >
                <WorkspacePremiumRoundedIcon />
              </Box>

              <CardContent sx={{ p: 3, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                
                <Box sx={{ display: 'inline-block', position: 'relative', mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: avatarBg,
                      color: '#fff',
                      fontSize: '2rem',
                      fontWeight: 800,
                      border: `3px solid ${isDark ? theme.palette.background.paper : '#fff'}`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {initials}
                  </Avatar>
                  
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 2,
                      right: 2,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      bgcolor: '#10b981',
                      border: `2.5px solid ${isDark ? '#161B27' : '#fff'}`,
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                    }}
                  />
                </Box>

                <Typography variant="subtitle1" fontWeight={800} letterSpacing="-0.3px" color="text.primary">
                  {formData.name || 'Support Member'}
                </Typography>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, fontWeight: 700, display: 'block' }}>
                  {formData.username ? `@${formData.username}` : 'No username set'}
                </Typography>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, fontWeight: 500, display: 'block', wordBreak: 'break-all' }}>
                  {formData.email}
                </Typography>
                
                <Typography variant="caption" sx={{ mt: 0.75, fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.disabled', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LockRoundedIcon sx={{ fontSize: 10, color: 'warning.main' }} /> UID: {formData.custom_uid || 'N/A'}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.62rem', opacity: 0.8 }}>
                    System ID: {user.uid}
                  </Box>
                </Typography>

                <Chip
                  label={roleMeta.label}
                  sx={{
                    mt: 2,
                    height: 22,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    bgcolor: isDark ? alpha(roleMeta.color, 0.18) : roleMeta.light,
                    color: roleMeta.color,
                    border: `1px solid ${alpha(roleMeta.color, 0.25)}`,
                  }}
                />
              </CardContent>
            </Card>

            <Card sx={{ boxShadow: `0 4px 12px ${alpha(theme.palette.divider, 0.05)}` }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.disabled" fontWeight={800} display="block" sx={{ mb: 2, letterSpacing: '0.8px' }}>
                  SECURITY CLEARANCES
                </Typography>

                <Stack spacing={1.5}>
                  {[
                    { label: 'Read personal profile data', checked: true },
                    { label: 'Write personal details', checked: true },
                    { label: 'Update security credentials', checked: true },
                    { label: 'Select interface color scheme', checked: true },
                  ].map(item => (
                    <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 16 }} />
                      <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary', fontWeight: 500 }}>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ boxShadow: `0 4px 12px ${alpha(theme.palette.divider, 0.05)}` }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.disabled" fontWeight={800} display="block" sx={{ mb: 2, letterSpacing: '0.8px' }}>
                  SECURITY METADATA
                </Typography>

                <Stack spacing={1.75}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <VpnKeyRoundedIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
                    <Box>
                      <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" sx={{ lineHeight: 1 }}>USER ID (UID)</Typography>
                      <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                        {formData.custom_uid || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FingerprintRoundedIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
                    <Box>
                      <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" sx={{ lineHeight: 1 }}>SYSTEM ID</Typography>
                      <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ mt: 0.25, display: 'block', wordBreak: 'break-all' }}>
                        {user.uid}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ShieldRoundedIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
                    <Box>
                      <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" sx={{ lineHeight: 1 }}>PROTOCOL STATUS</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.primary', fontWeight: 600, mt: 0.25 }}>
                        Active SSL session
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

          </Stack>
        </Grid>

        {/* RIGHT MAIN PANEL COLUMN */}
        <Grid item xs={12} md={7.75}>
          <Stack spacing={3.5}>
            
            <Alert 
              severity={isEditing ? "success" : "info"}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600,
                border: `1px solid ${isEditing ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.divider, 0.15)}`,
                bgcolor: isDark 
                  ? (isEditing ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.action.hover, 0.05))
                  : (isEditing ? alpha(theme.palette.success.main, 0.03) : alpha(theme.palette.action.hover, 0.03))
              }}
              icon={isEditing ? <LockOpenRoundedIcon /> : <LockRoundedIcon />}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => { if (isEditing) handleCancel(); else setIsEditing(true); }}
                  startIcon={isEditing ? <CloseRoundedIcon /> : <EditRoundedIcon />}
                  sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              }
            >
              {isEditing 
                ? "Edit mode enabled. Update your information and click Save Settings." 
                : "Profile fields are read-only. Click Edit Profile to enable updates."
              }
            </Alert>

            {/* Card 1: Identity Details */}
            <Card sx={{ boxShadow: `0 4px 12px ${alpha(theme.palette.divider, 0.05)}` }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" fontWeight={800} letterSpacing="-0.2px" sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ManageAccountsRoundedIcon sx={{ color: 'primary.main', fontSize: 20 }} /> Profile Identity Details
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Display Name"
                      value={formData.name}
                      onChange={handleChange('name')}
                      placeholder="e.g. John Doe"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username Handle"
                      value={formData.username}
                      onChange={handleChange('username')}
                      placeholder="e.g. johndoe"
                      disabled={true}
                      InputProps={{
                        sx: { 
                          borderRadius: 2,
                          bgcolor: isDark ? alpha('#fff', 0.015) : alpha('#000', 0.01) 
                        },
                        startAdornment: (
                          <InputAdornment position="start">
                            <AlternateEmailRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Account handle is locked and cannot be changed">
                              <LockRoundedIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                            </Tooltip>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="User ID (UID)"
                      value={formData.custom_uid || ''}
                      disabled={true}
                      InputProps={{
                        sx: { 
                          borderRadius: 2,
                          bgcolor: isDark ? alpha('#fff', 0.015) : alpha('#000', 0.01),
                          fontFamily: 'monospace'
                        },
                        startAdornment: (
                          <InputAdornment position="start">
                            <VpnKeyRoundedIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="User ID is permanently locked and verified">
                              <LockRoundedIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                            </Tooltip>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="System ID"
                      value={user.uid}
                      disabled={true}
                      InputProps={{
                        sx: { 
                          borderRadius: 2,
                          bgcolor: isDark ? alpha('#fff', 0.015) : alpha('#000', 0.01),
                          fontFamily: 'monospace'
                        },
                        startAdornment: (
                          <InputAdornment position="start">
                            <FingerprintRoundedIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="System ID is permanently locked and verified">
                              <LockRoundedIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                            </Tooltip>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Profession / Job Title"
                      value={formData.profession}
                      onChange={handleChange('profession')}
                      placeholder="e.g. Lead Software Engineer"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessCenterRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Company / Department"
                      value={formData.company}
                      onChange={handleChange('company')}
                      placeholder="e.g. Acme Tech Solutions"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Physical Address / Location"
                      value={formData.address}
                      onChange={handleChange('address')}
                      placeholder="e.g. 1600 Amphitheatre Pkwy, Mountain View, CA"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOnRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Biography (Bio)"
                      value={formData.bio}
                      onChange={handleChange('bio')}
                      placeholder="Enter profile summary description..."
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                            <InfoRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Card 2: Contact & Network Details */}
            <Card sx={{ boxShadow: `0 4px 12px ${alpha(theme.palette.divider, 0.05)}` }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" fontWeight={800} letterSpacing="-0.2px" sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} /> Contact & Network Details
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={formData.email}
                      onChange={handleChange('email')}
                      placeholder="e.g. john.doe@example.com"
                      disabled={true}
                      InputProps={{
                        sx: { 
                          borderRadius: 2,
                          bgcolor: isDark ? alpha('#fff', 0.015) : alpha('#000', 0.01)
                        },
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Account email is locked and cannot be changed">
                              <LockRoundedIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                            </Tooltip>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={formData.phone}
                      onChange={handleChange('phone')}
                      placeholder="e.g. +1 (555) 019-2834"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocalPhoneRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Mobile Number"
                      value={formData.mobile}
                      onChange={handleChange('mobile')}
                      placeholder="e.g. +1 (555) 091-8842"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <SmartphoneRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Personal Website"
                      value={formData.website}
                      onChange={handleChange('website')}
                      placeholder="e.g. https://johndoe.dev"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <LanguageRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="GitHub Profile"
                      value={formData.github}
                      onChange={handleChange('github')}
                      placeholder="e.g. https://github.com/johndoe"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <GitHubIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Card 3: Security Settings */}
            <Card sx={{ boxShadow: `0 4px 12px ${alpha(theme.palette.divider, 0.05)}` }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" fontWeight={800} letterSpacing="-0.2px" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShieldRoundedIcon sx={{ color: 'primary.main', fontSize: 20 }} /> Security & Credentials Settings
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.5, fontWeight: 500 }}>
                  Enter your current password to authorize changes to your credentials. Leaving New Password blank will keep your current security status.
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Current Password"
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowOldPassword(!showOldPassword)}
                              edge="end"
                              size="small"
                              disabled={!isEditing || saving}
                            >
                              {showOldPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={!isEditing || saving}
                      helperText="Must be at least 6 characters"
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOpenRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              edge="end"
                              size="small"
                              disabled={!isEditing || saving}
                            >
                              {showNewPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Confirm New Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={!isEditing || saving}
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOpenRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              size="small"
                              disabled={!isEditing || saving}
                            >
                              {showConfirmPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Bottom Actions Form */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
              {isEditing ? (
                <>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleCancel}
                    startIcon={<CloseRoundedIcon />}
                    disabled={saving}
                    sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    startIcon={<SaveRoundedIcon />}
                    disabled={saving || !formData.name.trim()}
                    sx={{
                      borderRadius: 2,
                      px: 4.5,
                      py: 1.15,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      bgcolor: theme.palette.primary.main,
                      '&:hover': { bgcolor: theme.palette.primary.dark },
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => setIsEditing(true)}
                  startIcon={<EditRoundedIcon />}
                  sx={{
                    borderRadius: 2,
                    px: 4.5,
                    py: 1.15,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    bgcolor: theme.palette.primary.main,
                    '&:hover': { bgcolor: theme.palette.primary.dark },
                  }}
                >
                  Edit Profile Settings
                </Button>
              )}
            </Box>

          </Stack>
        </Grid>

      </Grid>

      {/* Dynamic Feedback Alert Snackbars */}
      <Snackbar
        open={alert.show}
        autoHideDuration={4000}
        onClose={() => setAlert(prev => ({ ...prev, show: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setAlert(prev => ({ ...prev, show: false }))}
          severity={alert.type}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2.5, fontWeight: 600 }}
        >
          {alert.msg}
        </Alert>
      </Snackbar>

    </PageContainer>
  );
}
