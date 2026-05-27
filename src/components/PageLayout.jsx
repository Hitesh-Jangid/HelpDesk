/**
 * Shared layout primitives for consistent project-wide sizing.
 * Import these instead of repeating the same patterns per page.
 */

import { Box, Card, CardContent, Container, Grid, Typography, useTheme, alpha } from '@mui/material';

// ─── Standard page Container (xl, py:3) ─────────────────────────────────────
export function PageContainer({ children, maxWidth = 'xl' }) {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 3 }}>
      {children}
    </Container>
  );
}

// ─── Standard page header row (Premium card banner layout) ───────────────────
export function PageHeader({ title, subtitle, action }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        mb: 4,
        p: { xs: 2.5, md: 3 },
        borderRadius: 3,
        background: isDark
          ? `linear-gradient(135deg, ${alpha('#5C6BC0', 0.15)}, ${alpha('#3b82f6', 0.08)})`
          : `linear-gradient(135deg, ${alpha('#5C6BC0', 0.06)}, ${alpha('#3b82f6', 0.03)})`,
        border: `1px solid ${isDark ? alpha('#5C6BC0', 0.15) : alpha('#5C6BC0', 0.08)}`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute',
          top: -60, right: -60, width: 220, height: 220,
          borderRadius: '50%',
          border: `1.5px dashed ${alpha('#5C6BC0', isDark ? 0.25 : 0.12)}`,
          background: 'transparent',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""', position: 'absolute',
          top: -30, right: -30, width: 140, height: 140,
          borderRadius: '50%',
          background: alpha('#5C6BC0', isDark ? 0.08 : 0.04),
          boxShadow: `0 0 25px ${alpha('#5C6BC0', isDark ? 0.25 : 0.12)}`,
          pointerEvents: 'none',
        },
      }}
    >
      {/* Concentric rings for visual consistency with Dashboard */}
      <Box sx={{
        position: 'absolute', bottom: -80, left: '20%', width: 200, height: 200,
        borderRadius: '50%', border: `1px solid ${alpha('#3b82f6', isDark ? 0.12 : 0.06)}`,
        pointerEvents: 'none', zIndex: 0,
      }} />
      <Box sx={{
        position: 'absolute', bottom: -60, left: '20%', width: 160, height: 160,
        borderRadius: '50%', border: `1px dashed ${alpha('#3b82f6', isDark ? 0.08 : 0.04)}`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, position: 'relative', zIndex: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px" lineHeight={1.2}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
    </Box>
  );
}

// ─── Standard stat/KPI card with rotating watermark background ─────────────────
export function StatCard({ icon, label, value, sub, colorKey = 'primary' }) {
  const theme = useTheme();
  const color  = theme.palette[colorKey]?.main  || theme.palette.primary.main;
  const bgColor = theme.palette[colorKey]?.light || alpha(color, 0.12);
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card
      sx={{
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 10px 24px ${alpha(color, 0.15)}`,
          borderColor: color,
          '& .stat-watermark': {
            opacity: 0.16,
            transform: 'scale(1.12)',
            bgcolor: alpha(color, 0.08),
            '& svg': { transform: 'rotate(15deg) scale(1.12)' },
          },
        },
      }}
    >
      {/* Dynamic Watermark Background icon */}
      <Box
        className="stat-watermark"
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
          bgcolor: alpha(color, 0.03),
          color: color,
          opacity: 0.06,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
          zIndex: 0,
          '& svg': { fontSize: 44, transform: 'rotate(-10deg)', transition: 'all 0.3s ease' },
        }}
      >
        {icon}
      </Box>

      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Icon box */}
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2.5,
              bgcolor: isDark ? alpha(color, 0.15) : bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: isDark ? theme.palette[colorKey]?.light : color,
            }}
          >
            <Box sx={{ display: 'flex' }}>{icon}</Box>
          </Box>

          {/* Text */}
          <Box>
            <Typography
              variant="h5"
              fontWeight={800}
              lineHeight={1}
              letterSpacing="-0.5px"
              mb={0.3}
            >
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {label}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.1 }}>
                {sub}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Standard 4-column stat row ──────────────────────────────────────────────
export function StatRow({ children }) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {children}
    </Grid>
  );
}

// ─── Standard stat column (xs=6, sm=3) ───────────────────────────────────────
export function StatCol({ children }) {
  return (
    <Grid item xs={6} sm={3}>
      {children}
    </Grid>
  );
}

// ─── Empty state box ─────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      {icon && (
        <Box sx={{ color: 'text.disabled', mb: 1.5 }}>{icon}</Box>
      )}
      {title && (
        <Typography variant="body1" fontWeight={700} color="text.secondary">
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5, maxWidth: 320 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}
