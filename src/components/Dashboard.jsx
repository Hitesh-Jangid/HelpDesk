import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';
import { onSnapshot, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Toast from './Toast';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'Medium', category: 'General' });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [filters, setFilters] = useState({ priority: '', status: '', category: '', slaStatus: '', agent: '', dateFrom: '', dateTo: '' });
  const [userCache, setUserCache] = useState({});
  const [agents, setAgents] = useState([]);
  const [, setTimerTick] = useState(0);

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  }, []);

  // Real-time timer updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(tick => tick + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to fetch user details and format display
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

  // Fetch user details for all tickets
  useEffect(() => {
    tickets.forEach(ticket => {
      if (ticket.created_by) getUserDisplay(ticket.created_by);
      if (ticket.assigned_to) getUserDisplay(ticket.assigned_to);
    });
  }, [tickets, getUserDisplay]);

  // Fetch tickets with real-time updates from Firestore
  const fetchTickets = useCallback(() => {
    if (!user) return () => {};
    
    const q = collection(db, 'tickets');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const allTickets = [];
      querySnapshot.forEach((doc) => {
        const ticket = doc.data();
        ticket.id = doc.id;
        allTickets.push(ticket);
      });
      // Filter based on role and params
      let filtered = allTickets;
      console.log('User role:', user.role, 'Total tickets:', allTickets.length);
      
      if (user.role === 'user') {
        filtered = allTickets.filter(t => t.created_by === user.uid);
        console.log('User filtered tickets:', filtered.length, 'User UID:', user.uid);
      } else if (user.role === 'agent' && searchParams.get('assigned') === 'true') {
        filtered = allTickets.filter(t => t.assigned_to === user.uid);
        console.log('Agent assigned tickets:', filtered.length);
      } else {
        console.log('Showing all tickets for role:', user.role);
      }
      
      // UNIVERSAL SEARCH: ticket_id, title, description, category, username, date
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(t => {
          // Basic fields
          const matchesBasic = 
            (t.ticket_id || '').toLowerCase().includes(searchLower) ||
            (t.title || '').toLowerCase().includes(searchLower) ||
            (t.description || '').toLowerCase().includes(searchLower) ||
            (t.category || '').toLowerCase().includes(searchLower) ||
            (t.priority || '').toLowerCase().includes(searchLower) ||
            (t.status || '').toLowerCase().includes(searchLower);
          
          // Username search - check userCache for formatted display
          const createdByDisplay = userCache[t.created_by] || '';
          const assignedToDisplay = userCache[t.assigned_to] || '';
          const matchesUsername = 
            createdByDisplay.toLowerCase().includes(searchLower) ||
            assignedToDisplay.toLowerCase().includes(searchLower);
          
          // Date search - allow searching by formatted date
          let matchesDate = false;
          if (t.created_at) {
            const ticketDate = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at);
            const dateStr = ticketDate.toLocaleDateString();
            const dateTimeStr = ticketDate.toLocaleString();
            matchesDate = dateStr.includes(searchLower) || dateTimeStr.toLowerCase().includes(searchLower);
          }
          
          return matchesBasic || matchesUsername || matchesDate;
        });
      }
      
      // Apply filters
      if (filters.priority) {
        filtered = filtered.filter(t => t.priority === filters.priority);
      }
      if (filters.status) {
        filtered = filtered.filter(t => t.status === filters.status);
      }
      if (filters.category) {
        filtered = filtered.filter(t => t.category === filters.category);
      }
      if (filters.agent) {
        filtered = filtered.filter(t => t.assigned_to === filters.agent);
      }
      // Date range filter
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filtered = filtered.filter(t => {
          const ticketDate = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at || 0);
          return ticketDate >= fromDate;
        });
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(t => {
          const ticketDate = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at || 0);
          return ticketDate <= toDate;
        });
      }
      // SLA status filter
      if (filters.slaStatus) {
        const now = new Date();
        filtered = filtered.filter(t => {
          let deadline;
          if (typeof t.sla_deadline === 'number') {
            deadline = new Date(t.sla_deadline * 1000);
          } else if (t.sla_deadline?.toDate) {
            deadline = t.sla_deadline.toDate();
          } else {
            deadline = new Date(t.sla_deadline);
          }
          const diff = deadline - now;
          const hours = diff / (1000 * 60 * 60);
          
          if (filters.slaStatus === 'overdue') return diff <= 0;
          if (filters.slaStatus === 'at-risk') return hours > 0 && hours <= 4;
          if (filters.slaStatus === 'on-time') return hours > 4;
          return true;
        });
      }
      // Sort: Critical priority first, then by newest date
      const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      filtered.sort((a, b) => {
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
        return dateB - dateA;
      });
      // Simple pagination
      const start = (page - 1) * 10;
      const end = start + 10;
      setTickets(filtered.slice(start, end));
      setLoading(false);
    }, () => {
      showToast('Failed to load tickets');
      setLoading(false);
    });
    return unsubscribe;
  }, [search, page, user, searchParams, showToast, filters]);

  // Set up real-time listener on component mount
  useEffect(() => {
    if (user) {
      const unsubscribe = fetchTickets();
      return () => unsubscribe();
    }
  }, [fetchTickets, user]);

  // Fetch agents list for filter dropdown
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/users/`, {
          params: { role: 'agent', user_role: user.role, uid: user.uid }
        });
        setAgents(response.data.users || []);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };
    if (user && (user.role === 'agent' || user.role === 'admin')) {
      fetchAgents();
    }
  }, [user]);

  // Create a new ticket with validation
  const createTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      showToast('Please fill in title and description');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/tickets/`, newTicket, { params: { uid: user.uid } });
      setNewTicket({ title: '', description: '', priority: 'Medium', category: 'General' });
      setShowCreate(false);
      showToast('Ticket created successfully', 'success');
    } catch {
      showToast('Failed to create ticket');
    }
  };

  const isAssignedView = user.role === 'agent' && searchParams.get('assigned') === 'true';

  if (!user) return <div>Please login</div>;

  return (
    <>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="header-left">
            <h1 className="dashboard-title">Tickets</h1>
            <select className="view-selector">
              <option>All Tickets</option>
              {user.role === 'agent' && <option>My Assigned Tickets</option>}
              {user.role === 'user' && <option>My Tickets</option>}
            </select>
          </div>
          <div className="header-right">
            <button onClick={() => setShowCreate(!showCreate)} className="create-btn">
              <span className="plus-icon">+</span> Create
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrapper">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <div className="toolbar-right">
            <button className="toolbar-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 7L8 2L3 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 2V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="toolbar-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4H14M4 8H12M6 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Filter
              {(filters.priority || filters.status || filters.category) && (
                <span className="filter-count">1</span>
              )}
            </button>
            <button className="toolbar-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4H6M6 4V2M6 4V6M10 12H14M10 12V10M10 12V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Sort
              <span className="sort-count">1</span>
            </button>
            <button className="toolbar-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="2" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Columns
            </button>
          </div>
        </div>

        <div className="filters-expanded">
          <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">All Categories</option>
            <option value="General">General</option>
            <option value="Technical">Technical</option>
            <option value="Payment">Payment</option>
            <option value="Support">Support</option>
          </select>
          <select value={filters.slaStatus} onChange={(e) => setFilters({ ...filters, slaStatus: e.target.value })}>
            <option value="">All SLA Status</option>
            <option value="on-time">On Time</option>
            <option value="at-risk">At Risk (&lt;4h)</option>
            <option value="overdue">Overdue</option>
          </select>
          {(user.role === 'agent' || user.role === 'admin') && (
            <select value={filters.agent} onChange={(e) => setFilters({ ...filters, agent: e.target.value })}>
              <option value="">All Agents</option>
              {agents.map(agent => (
                <option key={agent.uid} value={agent.uid}>
                  {agent.username || agent.email?.split('@')[0] || agent.uid}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            placeholder="From Date"
            className="date-filter"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            placeholder="To Date"
            className="date-filter"
          />
          {(filters.priority || filters.status || filters.category || filters.slaStatus || filters.agent || filters.dateFrom || filters.dateTo) && (
            <button 
              onClick={() => setFilters({ priority: '', status: '', category: '', slaStatus: '', agent: '', dateFrom: '', dateTo: '' })}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>

        {showCreate && (
          <>
            <div className="overlay" onClick={() => setShowCreate(false)}></div>
            <div className="create-form">
            <input
              type="text"
              placeholder="Title"
              value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
            />
            <textarea
              placeholder="Description"
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
            />
            <select
              value={newTicket.priority}
              onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
            <select
              value={newTicket.category}
              onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
            >
              <option>General</option>
              <option>Technical</option>
              <option>Payment</option>
              <option>Support</option>
            </select>
            <button onClick={createTicket}>Submit</button>
            <button onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
          </>
        )}

      <div className="tickets-table-container">
        {loading ? (
          <div className="loading">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <p className="no-tickets">No tickets found.</p>
        ) : (
          <table className="tickets-table">
            <thead>
              <tr>
                <th className="th-checkbox"><input type="checkbox" /></th>
                <th className="th-id">ID</th>
                <th className="th-subject">Subject</th>
                <th className="th-created">Created</th>
                <th className="th-status">Status</th>
                <th className="th-priority">Priority</th>
                <th className="th-category">Type</th>
                <th className="th-assigned">Assigned To</th>
                <th className="th-contact">Created By</th>
                <th className="th-sla">SLA Timer</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => {
                const now = new Date();
                let deadline;
                if (typeof ticket.sla_deadline === 'number') {
                  deadline = new Date(ticket.sla_deadline * 1000);
                } else if (ticket.sla_deadline?.toDate) {
                  deadline = ticket.sla_deadline.toDate();
                } else {
                  deadline = new Date(ticket.sla_deadline);
                }
                
                // IMPORTANT: Check if ticket is resolved/closed first
                let timeRemaining = '';
                let isOverdue = false;
                
                if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
                  // Calculate completion time
                  let createdAt, completedAt;
                  
                  if (ticket.created_at?.toDate) {
                    createdAt = ticket.created_at.toDate();
                  } else if (typeof ticket.created_at === 'number') {
                    createdAt = new Date(ticket.created_at * 1000);
                  } else {
                    createdAt = new Date(ticket.created_at);
                  }
                  
                  // Use resolved_at or closed_at
                  if (ticket.resolved_at?.toDate) {
                    completedAt = ticket.resolved_at.toDate();
                  } else if (typeof ticket.resolved_at === 'number') {
                    completedAt = new Date(ticket.resolved_at * 1000);
                  } else if (ticket.resolved_at) {
                    completedAt = new Date(ticket.resolved_at);
                  } else if (ticket.closed_at?.toDate) {
                    completedAt = ticket.closed_at.toDate();
                  } else if (typeof ticket.closed_at === 'number') {
                    completedAt = new Date(ticket.closed_at * 1000);
                  } else if (ticket.closed_at) {
                    completedAt = new Date(ticket.closed_at);
                  } else {
                    completedAt = new Date(ticket.updated_at?.toDate ? ticket.updated_at.toDate() : ticket.updated_at);
                  }
                  
                  const timeTaken = completedAt - createdAt;
                  const days = Math.floor(timeTaken / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((timeTaken % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const minutes = Math.floor((timeTaken % (1000 * 60 * 60)) / (1000 * 60));
                  
                  let timeStr = '';
                  if (days > 0) timeStr += `${days}d `;
                  if (hours > 0) timeStr += `${hours}h `;
                  timeStr += `${minutes}m`;
                  
                  timeRemaining = `Completed (${timeStr.trim()})`;
                  isOverdue = false;
                } else {
                  // Active ticket - calculate remaining time
                  isOverdue = deadline && !isNaN(deadline.getTime()) && now > deadline;
                  const diff = deadline - now;
                  
                  if (diff <= 0) {
                    timeRemaining = 'Overdue';
                  } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    
                    if (days > 0) {
                      timeRemaining = `${days}d ${hours}h ${minutes}m`;
                    } else if (hours > 0) {
                      timeRemaining = `${hours}h ${minutes}m ${seconds}s`;
                    } else {
                      timeRemaining = `${minutes}m ${seconds}s`;
                    }
                  }
                }
                
                // Format created date
                const createdDate = ticket.created_at?.toDate ? ticket.created_at.toDate() : new Date(ticket.created_at || Date.now());
                const createdTime = createdDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                return (
                  <tr key={ticket.id}>
                    <td className="td-checkbox"><input type="checkbox" /></td>
                    <td className="td-id">
                      <Link to={`/tickets/${ticket.id}`} className="ticket-link">
                        {ticket.ticket_id || `#${ticket.id.substring(0, 8)}`}
                      </Link>
                    </td>
                    <td className="td-subject">
                      <Link to={`/tickets/${ticket.id}`} className="ticket-link">
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="td-created">{createdTime}</td>
                    <td className="td-status">
                      <span className={`status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="td-priority">
                      <span className={`priority-badge priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                    </td>
                    <td className="td-category">{ticket.category}</td>
                    <td className="td-assigned">{userCache[ticket.assigned_to] || 'Unassigned'}</td>
                    <td className="td-contact">{userCache[ticket.created_by] || 'Unknown'}</td>
                    <td className="td-sla">
                      <span className={`sla-timer ${isOverdue ? 'sla-overdue' : ''}`}>
                        {timeRemaining}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="pagination">
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>Prev</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
    </>
  );
};

export default Dashboard;