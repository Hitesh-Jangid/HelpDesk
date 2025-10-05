import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Toast from './Toast';
import './TicketDetail.css';

const TicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [agents, setAgents] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState('');
  const milestonesTracked = useRef(new Set());
  const [toast, setToast] = useState({ message: '', type: '' });
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showAdminTransferForm, setShowAdminTransferForm] = useState(false);
  const [adminTransferTarget, setAdminTransferTarget] = useState('');
  const [adminTransferReason, setAdminTransferReason] = useState('');
  const [userCache, setUserCache] = useState({});
  const [contact, setContact] = useState('');
  const [github, setGithub] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [showGithubForm, setShowGithubForm] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // For threading: stores parent event index
  const [replyText, setReplyText] = useState(''); // Reply comment text

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  }, []);

  // Helper function to fetch and format user display
  const getUserDisplay = useCallback(async (uid) => {
    if (!uid) return 'Unassigned';
    if (userCache[uid]) return userCache[uid];
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const username = userData.username || userData.email?.split('@')[0] || 'User';
        const customUid = userData.custom_uid || uid.substring(0, 8);
        // custom_uid already includes role prefix like "User-U000001" or "AG00001"
        const display = `@${username} (${customUid})`;
        setUserCache(prev => ({ ...prev, [uid]: display }));
        return display;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
    return uid;
  }, [userCache]);

  const addTimelineEvent = useCallback(async (action) => {
    try {
      await axios.patch(`http://localhost:8000/api/tickets/${id}/`, { comment: action, version: ticket?.version }, { params: { role: user?.role, uid: user?.uid } });
    } catch {
      // Silent fail for timeline events
    }
  }, [id, ticket?.version, user?.role, user?.uid]);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/users/?role=admin');
      setAgents(response.data.users.filter(u => u.role === 'agent'));
    } catch {
      showToast('Failed to fetch agents');
    }
  }, [showToast]);

  const fetchTicket = useCallback(() => {
    const docRef = doc(db, 'tickets', id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Role-based access control
        if (user.role === 'user' && data.created_by !== user.uid) {
          showToast('You do not have permission to view this ticket');
          setTicket(null);
          return;
        }
        
        setTicket({ ...data, id: docSnap.id });
        setStatus(data.status);
        setAssignedTo(data.assigned_to || '');
      } else {
        showToast('Ticket not found');
      }
    }, (error) => {
      showToast('Failed to load ticket: ' + error.message);
    });
    return unsubscribe;
  }, [id, showToast, user]);

  useEffect(() => {
    if (user) {
      const unsubscribe = fetchTicket();
      if (user.role === 'admin') fetchAgents();
      return () => unsubscribe();
    }
  }, [fetchTicket, fetchAgents, user]);

  // Fetch user display names for ticket participants
  useEffect(() => {
    if (ticket) {
      if (ticket.created_by) getUserDisplay(ticket.created_by);
      if (ticket.assigned_to) getUserDisplay(ticket.assigned_to);
      if (ticket.resolved_by) getUserDisplay(ticket.resolved_by);
      if (ticket.timeline) {
        ticket.timeline.forEach(entry => {
          if (entry.user) getUserDisplay(entry.user);
        });
      }
    }
  }, [ticket, getUserDisplay]);

  // Timer for SLA countdown
  useEffect(() => {
    if (!ticket?.sla_deadline) {
      setTimeRemaining('No SLA Set');
      return;
    }

    // IMPORTANT: Stop timer if ticket is resolved or closed
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      let createdAt, resolvedAt;
      
      // Parse created_at
      if (ticket.created_at?.toDate) {
        createdAt = ticket.created_at.toDate();
      } else if (typeof ticket.created_at === 'number') {
        createdAt = new Date(ticket.created_at * 1000);
      } else {
        createdAt = new Date(ticket.created_at);
      }
      
      // Parse resolved_at
      if (ticket.resolved_at?.toDate) {
        resolvedAt = ticket.resolved_at.toDate();
      } else if (typeof ticket.resolved_at === 'number') {
        resolvedAt = new Date(ticket.resolved_at * 1000);
      } else if (ticket.resolved_at) {
        resolvedAt = new Date(ticket.resolved_at);
      } else {
        // If no resolved_at, use updated_at or current time
        if (ticket.updated_at?.toDate) {
          resolvedAt = ticket.updated_at.toDate();
        } else if (typeof ticket.updated_at === 'number') {
          resolvedAt = new Date(ticket.updated_at * 1000);
        } else {
          resolvedAt = new Date(ticket.updated_at);
        }
      }
      
      // Calculate time taken
      const timeTaken = resolvedAt - createdAt;
      const days = Math.floor(timeTaken / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeTaken % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeTaken % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeStr = '';
      if (days > 0) timeStr += `${days}d `;
      if (hours > 0) timeStr += `${hours}h `;
      timeStr += `${minutes}m`;
      
      setTimeRemaining(`SLA Fulfilled (${timeStr.trim()})`);
      return; // Don't run the timer
    }

    const updateTimer = () => {
      let deadline;
      
      // Handle Firestore Timestamp
      if (ticket.sla_deadline?.toDate) {
        deadline = ticket.sla_deadline.toDate();
      } 
      // Handle Unix timestamp (seconds)
      else if (typeof ticket.sla_deadline === 'number') {
        deadline = new Date(ticket.sla_deadline * 1000);
      } 
      // Handle ISO string or Date object
      else {
        deadline = new Date(ticket.sla_deadline);
      }
      
      // Check if deadline is valid
      if (!deadline || isNaN(deadline.getTime())) {
        setTimeRemaining('Invalid Deadline');
        console.error('Invalid SLA deadline:', ticket.sla_deadline);
        return;
      }
      
      const now = new Date();
      const diff = deadline - now;

      if (diff <= 0) {
        // Calculate how much time over SLA
        const overTime = -diff;
        const days = Math.floor(overTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((overTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((overTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((overTime % (1000 * 60)) / 1000);

        let overTimeStr = '';
        if (days > 0) overTimeStr += `${days}d `;
        if (hours > 0) overTimeStr += `${hours}h `;
        if (minutes > 0) overTimeStr += `${minutes}m `;
        overTimeStr += `${seconds}s`;

        setTimeRemaining(`Delayed +${overTimeStr.trim()}`);
        
        if (!milestonesTracked.current.has('overdue')) {
          milestonesTracked.current.add('overdue');
          addTimelineEvent('SLA Breached');
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`In Progress - ${days}d ${hours}h ${minutes}m ${seconds}s`);

      // Check milestones only once
      if (days === 0 && hours === 1 && minutes === 0 && seconds === 0 && !milestonesTracked.current.has('1h')) {
        milestonesTracked.current.add('1h');
        addTimelineEvent('1 hour remaining');
      } else if (days === 0 && hours === 0 && minutes === 30 && seconds === 0 && !milestonesTracked.current.has('30m')) {
        milestonesTracked.current.add('30m');
        addTimelineEvent('30 minutes remaining');
      } else if (days === 0 && hours === 0 && minutes === 10 && seconds === 0 && !milestonesTracked.current.has('10m')) {
        milestonesTracked.current.add('10m');
        addTimelineEvent('10 minutes remaining');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [ticket?.sla_deadline, addTimelineEvent]);

  const addComment = async () => {
    if (!comment.trim()) {
      showToast('Comment cannot be empty');
      return;
    }
    try {
      // If replying to an event, include parent_id
      const commentData = { 
        comment, 
        version: ticket.version 
      };
      
      // Add reply metadata if this is a reply
      if (replyTo !== null) {
        commentData.reply_to = replyTo; // Index of parent event in timeline
      }
      
      await axios.patch(`http://localhost:8000/api/tickets/${id}/`, commentData, { params: { role: user.role, uid: user.uid } });
      setComment('');
      setReplyTo(null); // Reset reply state
    } catch {
      showToast('Failed to add comment');
    }
  };

  const addReply = async (parentIndex) => {
    if (!replyText.trim()) {
      showToast('Reply cannot be empty');
      return;
    }
    try {
      await axios.patch(
        `http://localhost:8000/api/tickets/${id}/`, 
        { 
          comment: replyText, 
          version: ticket.version,
          reply_to: parentIndex
        }, 
        { params: { role: user.role, uid: user.uid } }
      );
      showToast('Reply added successfully', 'success');
      setReplyText('');
      setReplyTo(null);
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to add reply');
    }
  };

  const deleteComment = async (commentIndex) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    try {
      await axios.delete(
        `http://localhost:8000/api/tickets/${id}/`,
        { 
          params: { role: user.role, uid: user.uid },
          data: { comment_index: commentIndex }
        }
      );
      showToast('Comment deleted successfully', 'success');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to delete comment');
    }
  };

  const updateTicket = async () => {
    try {
      // Only send status update, NOT assigned_to (manual reassignment is separate)
      const updates = { status, version: ticket.version };
      await axios.patch(`http://localhost:8000/api/tickets/${id}/`, updates, { params: { role: user.role, uid: user.uid } });
      showToast('Ticket updated successfully', 'success');
    } catch {
      showToast('Failed to update ticket');
    }
  };

  const submitFeedback = async () => {
    if (rating === 0) {
      showToast('Please select a rating');
      return;
    }
    try {
      await axios.post(`http://localhost:8000/api/tickets/${id}/feedback/`, 
        { rating, feedback }, 
        { params: { uid: user.uid } }
      );
      showToast('Feedback submitted successfully', 'success');
      setShowFeedbackForm(false);
      setRating(0);
      setFeedback('');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to submit feedback');
    }
  };

  const transferTicket = async () => {
    if (!transferReason.trim()) {
      showToast('Please provide a reason for transfer');
      return;
    }
    try {
      await axios.post(`http://localhost:8000/api/tickets/${id}/transfer/`, 
        { reason: transferReason }, 
        { params: { role: user.role, uid: user.uid } }
      );
      showToast('Ticket transferred to admin successfully', 'success');
      setShowTransferForm(false);
      setTransferReason('');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to transfer ticket');
    }
  };

  const adminTransferTicket = async () => {
    if (!adminTransferTarget) {
      showToast('Please select a target user');
      return;
    }
    if (!adminTransferReason.trim()) {
      showToast('Please provide a reason for transfer');
      return;
    }
    try {
      await axios.post(`http://localhost:8000/api/tickets/${id}/admin-transfer/`, 
        { target_uid: adminTransferTarget, reason: adminTransferReason }, 
        { params: { role: user.role, uid: user.uid } }
      );
      showToast('Ticket transferred successfully', 'success');
      setShowAdminTransferForm(false);
      setAdminTransferTarget('');
      setAdminTransferReason('');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to transfer ticket');
    }
  };

  const addContactInfo = async () => {
    if (!contact.trim()) {
      showToast('Please enter contact information');
      return;
    }
    try {
      await axios.patch(`http://localhost:8000/api/tickets/${id}/`, 
        { contact, version: ticket.version }, 
        { params: { role: user.role, uid: user.uid } }
      );
      showToast('Contact added successfully', 'success');
      setShowContactForm(false);
      setContact('');
    } catch (error) {
      showToast('Failed to add contact');
    }
  };

  const addGithubInfo = async () => {
    if (!github.trim()) {
      showToast('Please enter GitHub link');
      return;
    }
    try {
      await axios.patch(`http://localhost:8000/api/tickets/${id}/`, 
        { github, version: ticket.version }, 
        { params: { role: user.role, uid: user.uid } }
      );
      showToast('GitHub link added successfully', 'success');
      setShowGithubForm(false);
      setGithub('');
    } catch (error) {
      showToast('Failed to add GitHub link');
    }
  };

  if (!user) return <div>Please login</div>;
  if (!ticket) return <div className="loading">Loading...</div>;

  const createdDate = ticket.created_at?.toDate ? ticket.created_at.toDate() : new Date(ticket.created_at);
  const timeAgo = createdDate ? Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24 * 30)) : 0;

  return (
    <>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <div className="ticket-detail-container">
        {/* Header */}
        <div className="ticket-header">
          <div className="header-breadcrumb">
            <Link to="/tickets" className="breadcrumb-link">Tickets</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">
              {ticket.ticket_id || `#${ticket.id.substring(0, 8)}`} - {ticket.title}
            </span>
          </div>
          <div className="header-actions">
            {ticket.github_link && (
              <button 
                className="btn-secondary"
                onClick={() => window.open(ticket.github_link, '_blank')}
              >
                Open GitHub
              </button>
            )}
            <div className="user-avatar">{user.email.charAt(0).toUpperCase()}</div>
            <span className={`status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
              {ticket.status}
            </span>
          </div>
        </div>

        <div className="ticket-content-wrapper">
          {/* Left: Activity Feed */}
          <div className="ticket-activity">
            <div className="activity-header">
              <h2 className="ticket-number">{ticket.ticket_id || `#${ticket.id.substring(0, 8)}`}</h2>
              <h3 className="ticket-title">{ticket.title}</h3>
            </div>

            {/* Activity Feed - No Tabs */}
            <div className="activity-feed">
              {/* Description Section */}
              <div className="description-section">
                <h4>Description</h4>
                <p className="description-text">{ticket.description}</p>
                <div className="meta-info">
                  <span className="meta-item">
                    <strong>Reporter:</strong> {userCache[ticket.created_by] || user.email.split('@')[0]}
                  </span>
                  <span className="meta-item">
                    <strong>Created:</strong> {(() => {
                      const createdDate = ticket.created_at?.toDate ? ticket.created_at.toDate() : 
                                        typeof ticket.created_at === 'number' ? new Date(ticket.created_at * 1000) : 
                                        new Date(ticket.created_at);
                      return createdDate.toLocaleString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                      });
                    })()}
                  </span>
                </div>
              </div>

              {/* Activity Timeline - Delivery App Style (All Events Chronological) */}
              <div className="activity-list">
                <h4>Activity</h4>
                
                {ticket.timeline && ticket.timeline.length > 0 && (() => {
                  // Show ALL events chronologically (OLDEST FIRST - top to bottom)
                  const allEvents = ticket.timeline
                    .map((entry, idx) => ({ ...entry, idx }))
                    .sort((a, b) => {
                      const timeA = a.timestamp?.seconds || a.timestamp || 0;
                      const timeB = b.timestamp?.seconds || b.timestamp || 0;
                      return (typeof timeA === 'number' ? timeA : timeA.seconds) - (typeof timeB === 'number' ? timeB : timeB.seconds);
                    });
                  
                  // Build nested structure for threaded replies
                  const buildThreads = () => {
                    const threads = [];
                    const eventMap = new Map();
                    
                    // First pass: create map of all events
                    allEvents.forEach(event => {
                      eventMap.set(event.idx, { ...event, replies: [] });
                    });
                    
                    // Second pass: organize into threads
                    allEvents.forEach(event => {
                      const eventData = eventMap.get(event.idx);
                      if (event.reply_to !== undefined && event.reply_to !== null) {
                        // This is a reply - add to parent's replies
                        const parent = eventMap.get(event.reply_to);
                        if (parent) {
                          parent.replies.push(eventData);
                        } else {
                          // Parent not found, treat as top-level
                          threads.push(eventData);
                        }
                      } else {
                        // Top-level event
                        threads.push(eventData);
                      }
                    });
                    
                    return threads;
                  };
                  
                  const threads = buildThreads();
                  
                  // Recursive function to render event and its replies
                  const renderEvent = (entry, depth = 0, isLastInParentList = false) => {
                    // Determine if this is a system action or user action
                    const isSystemAction = entry.action === 'auto_assigned' || (!entry.user && entry.action !== 'created');
                    
                    // Get display name with format: @username (Role-ID) or @System
                    let displayName = '@System';
                    if (isSystemAction) {
                      displayName = '@System';
                    } else {
                      // For all user actions, use userCache or construct the format
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
                    
                    // Delete permission: creator OR admin OR agent
                    const canDelete = !isSystemAction && ((entry.user === user.uid) || user.role === 'admin' || user.role === 'agent');
                    
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
                    
                    // Format timestamp
                    const formatTime = () => {
                      if (!entry.timestamp) return 'N/A';
                      const timestamp = entry.timestamp.seconds ? entry.timestamp.seconds * 1000 : (typeof entry.timestamp === 'number' ? entry.timestamp * 1000 : entry.timestamp);
                      const date = new Date(timestamp);
                      const now = new Date();
                      const diff = now - date;
                      const minutes = Math.floor(diff / 60000);
                      const hours = Math.floor(minutes / 60);
                      const days = Math.floor(hours / 24);
                      
                      if (minutes < 1) return 'Just now';
                      if (minutes < 60) return `${minutes}m ago`;
                      if (hours < 24) return `${hours}h ago`;
                      if (days < 7) return `${days}d ago`;
                      return date.toLocaleDateString();
                    };
                    
                    return (
                      <React.Fragment key={entry.idx}>
                        <div className={`activity-entry ${isReply ? 'is-reply' : ''}`} style={{ marginLeft: depth > 0 ? `${depth * 2.5}rem` : '0' }}>
                          <div className="activity-icon-wrapper">
                            {/* Roadmap connector - ONLY for top-level parent events (depth 0), and not the last one */}
                            {depth === 0 && !isLastInParentList && <div className="roadmap-connector"></div>}
                            <div className={`activity-icon ${isSystemAction ? 'system-icon' : 'user-icon'}`}>
                              {isSystemAction ? '🤖' : userInitial}
                            </div>
                          </div>
                          <div className="activity-body">
                            <div className="activity-header-line">
                              <strong>{displayName}</strong>
                              <span className="activity-action">{actionText}</span>
                              <span className="activity-time">{formatTime()}</span>
                            </div>
                            
                            {/* Comment/Description */}
                            {entry.comment && (
                              <div className="activity-comment">{entry.comment}</div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="activity-actions-bar">
                              {/* Reply Button - show on ALL events (can reply to anything) */}
                              <button 
                                className="reply-btn"
                                onClick={() => setReplyTo(replyTo === entry.idx ? null : entry.idx)}
                              >
                                💬 Reply
                              </button>
                              
                              {/* Delete Button - only for comments/replies by creator/admin/agent */}
                              {canDelete && (entry.action === 'commented' || isReply) && (
                                <button 
                                  className="delete-btn"
                                  onClick={() => deleteComment(entry.idx)}
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>
                            
                            {/* Reply Form */}
                            {replyTo === entry.idx && (
                              <div className="reply-form">
                                <textarea
                                  className="reply-textarea"
                                  placeholder={`Reply to this ${isReply ? 'reply' : 'action'}...`}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  rows="2"
                                />
                                <div className="reply-actions">
                                  <button 
                                    className="btn-reply" 
                                    onClick={() => addReply(entry.idx)}
                                    disabled={!replyText.trim()}
                                  >
                                    Send Reply
                                  </button>
                                  <button 
                                    className="btn-cancel-reply" 
                                    onClick={() => { setReplyTo(null); setReplyText(''); }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Render nested replies recursively - always pass false for isLastInParentList since replies are never part of main roadmap */}
                        {entry.replies && entry.replies.length > 0 && entry.replies.map((reply) => 
                          renderEvent(reply, depth + 1, false)
                        )}
                      </React.Fragment>
                    );
                  };
                  
                  // Render all top-level threads - only the LAST top-level thread gets isLastInParentList=true
                  return threads.map((thread, idx) => renderEvent(thread, 0, idx === threads.length - 1));
                })()}
              </div>

              {/* Add Comment Box - For Agent/Admin */}
              {(user.role === 'agent' || user.role === 'admin') && (
                <div className="add-comment-section">
                  <h4>Add Comment</h4>
                  <textarea
                    className="comment-textarea"
                    placeholder="Add a comment to describe the issue, solution, or any notes..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows="3"
                  />
                  <button 
                    className="btn-add-comment" 
                    onClick={addComment}
                    disabled={!comment.trim()}
                  >
                    Post Comment
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="ticket-sidebar">
            <div className="sidebar-section">
              <h3 className="sidebar-user-name">
                {user.username || user.name || user.email.split('@')[0]}
              </h3>
              {user.custom_uid && (
                <div className="sidebar-uid">{user.custom_uid}</div>
              )}
            </div>

            {/* Rating and Feedback - Only show if ticket is Resolved/Closed AND user is the creator */}
            {(ticket.status === 'Resolved' || ticket.status === 'Closed') && 
             ticket.created_by === user.uid && 
             ticket.rating && (
            <div className="sidebar-section">
              <div className="sidebar-label">Your Rating</div>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={star <= (ticket.rating || 0) ? 'star-filled' : 'star-empty'}>
                    {star <= (ticket.rating || 0) ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </div>
            )}

            {(ticket.status === 'Resolved' || ticket.status === 'Closed') && 
             ticket.created_by === user.uid && 
             ticket.feedback && (
            <div className="sidebar-section">
              <div className="sidebar-label">Your Feedback</div>
              <div className="sidebar-value">{ticket.feedback}</div>
            </div>
            )}

            <div className="sidebar-section">
              <div className="sidebar-label">SLA Status</div>
              <div className={`sidebar-value ${
                timeRemaining.includes('Fulfilled') ? 'sla-success' : 
                timeRemaining.includes('Delayed') ? 'sla-failed' : 
                timeRemaining.includes('In Progress') ? 'sla-progress' : 
                'sla-default'
              }`}>
                {timeRemaining}
              </div>
            </div>

            {/* Feedback Button (for users on resolved/closed tickets) - Right after SLA */}
            {user.role === 'user' && 
             ticket.created_by === user.uid && 
             (ticket.status === 'Resolved' || ticket.status === 'Closed') && 
             !ticket.rating && 
             !showFeedbackForm && (
              <div className="sidebar-actions">
                <button onClick={() => setShowFeedbackForm(true)} className="btn-primary-full">
                  ⭐ Submit Feedback
                </button>
              </div>
            )}

            {/* Feedback Form - Right after button */}
            {showFeedbackForm && (
              <div className="feedback-form">
                <label className="feedback-label">Rate your experience:</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      onClick={() => setRating(star)}
                      className={`star ${rating >= star ? 'star-filled' : 'star-empty'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <label className="feedback-label">Additional comments:</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="feedback-textarea"
                  placeholder="Tell us about your experience..."
                  rows={4}
                />
                <div className="feedback-actions">
                  <button onClick={submitFeedback} className="btn-primary-small">Submit Feedback</button>
                  <button onClick={() => { setShowFeedbackForm(false); setRating(0); setFeedback(''); }} className="btn-secondary-small">Cancel</button>
                </div>
              </div>
            )}

            <div className="sidebar-section">
              <div className="sidebar-label">Assigned To</div>
              <div className="sidebar-value">
                {userCache[ticket.assigned_to] || ticket.assigned_to || 'Unassigned'}
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-label">Created By</div>
              <div className="sidebar-value">
                {userCache[ticket.created_by] || ticket.created_by || 'Unknown'}
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-label">Source</div>
              <div className="sidebar-value">Portal</div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-label">Ticket type</div>
              <div className="sidebar-value">{ticket.category}</div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-label">Priority</div>
              <div className="sidebar-value priority-high">{ticket.priority}</div>
            </div>

            {/* Labels/Tags - Industry standard feature */}
            {ticket.labels && ticket.labels.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-label">Labels</div>
              <div className="label-list">
                {ticket.labels.map((label, idx) => (
                  <span key={idx} className="label-tag">{label}</span>
                ))}
              </div>
            </div>
            )}

            <div className="sidebar-section">
              <div className="sidebar-label">Created At</div>
              <div className="sidebar-value">
                {(() => {
                  let date;
                  if (ticket.created_at?.toDate) {
                    date = ticket.created_at.toDate();
                  } else if (typeof ticket.created_at === 'number') {
                    date = new Date(ticket.created_at * 1000);
                  } else {
                    date = new Date(ticket.created_at);
                  }
                  return date.toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                })()}
              </div>
            </div>

            {(ticket.status === 'Resolved' || ticket.status === 'Closed') && ticket.resolved_at && (
              <>
                <div className="sidebar-section">
                  <div className="sidebar-label">Resolved At</div>
                  <div className="sidebar-value sla-success">
                    {(() => {
                      let date;
                      if (ticket.resolved_at?.toDate) {
                        date = ticket.resolved_at.toDate();
                      } else if (typeof ticket.resolved_at === 'number') {
                        date = new Date(ticket.resolved_at * 1000);
                      } else {
                        date = new Date(ticket.resolved_at);
                      }
                      return date.toLocaleString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                    })()}
                  </div>
                </div>

                {ticket.resolved_by && (
                  <div className="sidebar-section">
                    <div className="sidebar-label">Resolved By</div>
                    <div className="sidebar-value">
                      {userCache[ticket.resolved_by] || ticket.resolved_by || 'Unknown'}
                    </div>
                  </div>
                )}
              </>
            )}

            {(ticket.status === 'Resolved' || ticket.status === 'Closed') && ticket.completed_at && (
              <div className="sidebar-section">
                <div className="sidebar-label">Completed At</div>
                <div className="sidebar-value sla-success">
                  {(() => {
                    let date;
                    if (ticket.completed_at?.toDate) {
                      date = ticket.completed_at.toDate();
                    } else if (typeof ticket.completed_at === 'number') {
                      date = new Date(ticket.completed_at * 1000);
                    } else {
                      date = new Date(ticket.completed_at);
                    }
                    return date.toLocaleString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                  })()}
                </div>
              </div>
            )}

            <div className="sidebar-section">
              <div className="sidebar-label">Assigned To</div>
              <div className="sidebar-value">
                {ticket.assigned_to ? (userCache[ticket.assigned_to] || 'Loading...') : 'Unassigned'}
              </div>
            </div>

            {/* Contact - Only visible to assigned agent/admin and ticket creator */}
            {(user.role === 'admin' || ticket.assigned_to === user.uid || ticket.created_by === user.uid) && (
            <div className="sidebar-section">
              <div className="sidebar-label">Contact</div>
              {ticket.contact ? (
                <div className="sidebar-value">{ticket.contact}</div>
              ) : (ticket.created_by === user.uid) && (showContactForm ? (
                <div className="inline-form">
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Phone or email"
                    className="inline-input"
                  />
                  <button onClick={addContactInfo} className="btn-save">Save</button>
                  <button onClick={() => setShowContactForm(false)} className="btn-cancel">×</button>
                </div>
              ) : (
                <button onClick={() => setShowContactForm(true)} className="btn-link">Add Contact</button>
              ))}
            </div>
            )}

            {/* GitHub - Only visible to assigned agent/admin and ticket creator */}
            {(user.role === 'admin' || ticket.assigned_to === user.uid || ticket.created_by === user.uid) && (
            <div className="sidebar-section">
              <div className="sidebar-label">GitHub</div>
              {ticket.github ? (
                <a href={ticket.github} target="_blank" rel="noopener noreferrer" className="sidebar-value github-link">
                  {ticket.github}
                </a>
              ) : (ticket.created_by === user.uid) && (showGithubForm ? (
                <div className="inline-form">
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="GitHub issue URL"
                    className="inline-input"
                  />
                  <button onClick={addGithubInfo} className="btn-save">Save</button>
                  <button onClick={() => setShowGithubForm(false)} className="btn-cancel">×</button>
                </div>
              ) : (
                <button onClick={() => setShowGithubForm(true)} className="btn-link">Add GitHub</button>
              ))}
            </div>
            )}

            {(user.role === 'agent' || user.role === 'admin') && (
              <div className="sidebar-actions">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="sidebar-select">
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                  {user.role === 'admin' && <option>Closed</option>}
                </select>
                {user.role === 'admin' && (
                  <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="sidebar-select">
                    <option value="">Unassigned</option>
                    {agents.map(agent => (
                      <option key={agent.uid} value={agent.uid}>{agent.email}</option>
                    ))}
                  </select>
                )}
                <button onClick={updateTicket} className="btn-primary-full">Update Ticket</button>
                
                {/* Transfer to Admin Button (for agents only) */}
                {user.role === 'agent' && !showTransferForm && !showAdminTransferForm && (
                  <button onClick={() => setShowTransferForm(true)} className="btn-warning-full">
                    Transfer to Admin
                  </button>
                )}
                
                {/* Admin Transfer Button */}
                {user.role === 'admin' && !showTransferForm && !showAdminTransferForm && (
                  <button onClick={() => setShowAdminTransferForm(true)} className="btn-info-full">
                    Transfer Ticket
                  </button>
                )}
                
                {/* Agent Transfer Form (to Admin) */}
                {showTransferForm && (
                  <div className="transfer-form">
                    <label className="transfer-label">Reason for escalation:</label>
                    <textarea
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      className="transfer-textarea"
                      placeholder="Explain why this ticket needs admin attention..."
                      rows={3}
                    />
                    <div className="transfer-actions">
                      <button onClick={transferTicket} className="btn-primary-small">Submit Transfer</button>
                      <button onClick={() => { setShowTransferForm(false); setTransferReason(''); }} className="btn-secondary-small">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Admin Transfer Form (to any agent) */}
                {showAdminTransferForm && (
                  <div className="transfer-form">
                    <label className="transfer-label">Transfer to:</label>
                    <select 
                      value={adminTransferTarget} 
                      onChange={(e) => setAdminTransferTarget(e.target.value)} 
                      className="transfer-select"
                    >
                      <option value="">Select a user...</option>
                      {agents.map(agent => (
                        <option key={agent.uid} value={agent.uid}>
                          {agent.username || agent.email} ({agent.role})
                        </option>
                      ))}
                    </select>
                    <label className="transfer-label">Reason for transfer:</label>
                    <textarea
                      value={adminTransferReason}
                      onChange={(e) => setAdminTransferReason(e.target.value)}
                      className="transfer-textarea"
                      placeholder="Explain why this ticket is being reassigned..."
                      rows={3}
                    />
                    <div className="transfer-actions">
                      <button onClick={adminTransferTicket} className="btn-primary-small">Transfer</button>
                      <button onClick={() => { setShowAdminTransferForm(false); setAdminTransferTarget(''); setAdminTransferReason(''); }} className="btn-secondary-small">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reopen Button (for users on closed tickets - one time only) */}
            {user.role === 'user' && 
             ticket.created_by === user.uid && 
             ticket.status === 'Closed' && 
             (ticket.reopen_count || 0) < 1 && (
              <div className="sidebar-actions">
                <button 
                  onClick={async () => {
                    try {
                      await axios.patch(
                        `http://localhost:8000/api/tickets/${id}/`, 
                        { status: 'Open', version: ticket.version }, 
                        { params: { role: user.role, uid: user.uid } }
                      );
                      showToast('Ticket reopened successfully', 'success');
                    } catch (error) {
                      showToast(error.response?.data?.error?.message || 'Failed to reopen ticket');
                    }
                  }} 
                  className="btn-warning-full"
                >
                  Reopen Ticket
                </button>
                <p className="reopen-note">You can reopen this ticket one time only</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TicketDetail;
``
