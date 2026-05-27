import { Alert, Snackbar } from '@mui/material';

const Toast = ({ message, type = 'info', onClose }) => {
  const severity = type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
  return (
    <Snackbar
      open={!!message}
      autoHideDuration={3500}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={severity} variant="filled" sx={{ minWidth: 300 }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;
