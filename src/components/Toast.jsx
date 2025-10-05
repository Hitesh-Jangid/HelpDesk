import './Toast.css';

const Toast = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      {message}
    </div>
  );
};

export default Toast;
