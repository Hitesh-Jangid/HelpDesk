import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './Reports.css';

const Reports = () => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [activeReport, setActiveReport] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [userCache, setUserCache] = useState({});

  // Fetch user display info
  const getUserDisplay = useCallback(async (uid) => {
    if (userCache[uid]) return userCache[uid];
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const displayName = `@${userData.username || userData.email?.split('@')[0]} (${userData.custom_uid || uid})`;
        setUserCache(prev => ({ ...prev, [uid]: displayName }));
        return displayName;
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
    return uid;
  }, [userCache]);

  const fetchAllTickets = useCallback(async () => {
    try {
      setLoading(true);
      const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
      const ticketsList = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTickets(ticketsList);
      
      // Fetch user info for all assigned agents
      const agentIds = [...new Set(ticketsList.map(t => t.assigned_to).filter(Boolean))];
      agentIds.forEach(agentId => getUserDisplay(agentId));
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [getUserDisplay]);

  const fetchSLAReport = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/reports/sla/', { params: { role: user.role } });
      setReport(response.data);
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAllTickets();
      if (activeReport === 'sla') fetchSLAReport();
    }
  }, [user, activeReport, fetchAllTickets, fetchSLAReport]);

  // Calculate ticket volume by date
  const getTicketVolumeData = () => {
    const volumeMap = {};
    tickets.forEach(ticket => {
      const date = ticket.created_at?.toDate ? ticket.created_at.toDate() : new Date(ticket.created_at);
      const dateKey = date.toLocaleDateString();
      volumeMap[dateKey] = (volumeMap[dateKey] || 0) + 1;
    });
    return Object.entries(volumeMap).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  };

  // Calculate average resolution time
  const getResolutionTimeData = () => {
    const resolvedTickets = tickets.filter(t => 
      (t.status === 'Resolved' || t.status === 'Closed') && t.resolved_at
    );
    
    if (resolvedTickets.length === 0) return { average: 'N/A', count: 0 };
    
    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      const created = ticket.created_at?.toDate ? ticket.created_at.toDate() : new Date(ticket.created_at);
      const resolved = ticket.resolved_at?.toDate ? ticket.resolved_at.toDate() : new Date(ticket.resolved_at);
      return sum + (resolved - created);
    }, 0);
    
    const avgTime = totalTime / resolvedTickets.length;
    const hours = Math.floor(avgTime / (1000 * 60 * 60));
    const minutes = Math.floor((avgTime % (1000 * 60 * 60)) / (1000 * 60));
    
    return { 
      average: `${hours}h ${minutes}m`, 
      count: resolvedTickets.length,
      avgMs: avgTime
    };
  };

  // Agent performance metrics
  const getAgentPerformance = () => {
    const agentStats = {};
    
    tickets.forEach(ticket => {
      if (ticket.assigned_to) {
        if (!agentStats[ticket.assigned_to]) {
          agentStats[ticket.assigned_to] = {
            total: 0,
            resolved: 0,
            open: 0,
            avgResolutionTime: 0
          };
        }
        
        agentStats[ticket.assigned_to].total++;
        
        if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
          agentStats[ticket.assigned_to].resolved++;
        } else {
          agentStats[ticket.assigned_to].open++;
        }
      }
    });
    
    return Object.entries(agentStats);
  };

  // Category distribution
  const getCategoryData = () => {
    const categoryMap = {};
    tickets.forEach(ticket => {
      const category = ticket.category || 'Uncategorized';
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });
    return Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  };

  // Priority distribution
  const getPriorityData = () => {
    const priorityMap = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    tickets.forEach(ticket => {
      const priority = ticket.priority || 'Medium';
      priorityMap[priority] = (priorityMap[priority] || 0) + 1;
    });
    return Object.entries(priorityMap);
  };

  // Customer satisfaction
  const getSatisfactionData = () => {
    const ratedTickets = tickets.filter(t => t.rating);
    if (ratedTickets.length === 0) return { average: 'N/A', count: 0, distribution: {} };
    
    const totalRating = ratedTickets.reduce((sum, t) => sum + t.rating, 0);
    const avgRating = (totalRating / ratedTickets.length).toFixed(2);
    
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratedTickets.forEach(t => {
      distribution[t.rating] = (distribution[t.rating] || 0) + 1;
    });
    
    return { average: avgRating, count: ratedTickets.length, distribution };
  };

  const exportToCSV = (reportType) => {
    let csv = '';
    let filename = '';
    
    switch(reportType) {
      case 'sla':
        csv = 'Title,Description,Priority,Category,Status,SLA Deadline\n' +
          report.breached_tickets.map(t => `${t.title},${t.description},${t.priority},${t.category},${t.status},${new Date(t.sla_deadline).toISOString()}`).join('\n');
        filename = 'sla_breached_tickets.csv';
        break;
      case 'volume':
        const volumeData = getTicketVolumeData();
        csv = 'Date,Ticket Count\n' + volumeData.map(([date, count]) => `${date},${count}`).join('\n');
        filename = 'ticket_volume.csv';
        break;
      case 'category':
        const categoryData = getCategoryData();
        csv = 'Category,Count\n' + categoryData.map(([cat, count]) => `${cat},${count}`).join('\n');
        filename = 'category_distribution.csv';
        break;
      default:
        return;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (!user || user.role !== 'admin') return <div>Access denied. Admin only.</div>;
  if (loading) return <div className="loading">Loading reports...</div>;

  const volumeData = getTicketVolumeData();
  const resolutionData = getResolutionTimeData();
  const agentData = getAgentPerformance();
  const categoryData = getCategoryData();
  const priorityData = getPriorityData();
  const satisfactionData = getSatisfactionData();

  return (
    <div className="reports">
      <h2>Reports & Analytics</h2>
      
      {/* Report Type Tabs */}
      <div className="report-tabs">
        <button 
          className={activeReport === 'overview' ? 'active' : ''}
          onClick={() => setActiveReport('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={activeReport === 'sla' ? 'active' : ''}
          onClick={() => setActiveReport('sla')}
        >
          ⏱️ SLA Reports
        </button>
        <button 
          className={activeReport === 'volume' ? 'active' : ''}
          onClick={() => setActiveReport('volume')}
        >
          📈 Ticket Volume
        </button>
        <button 
          className={activeReport === 'performance' ? 'active' : ''}
          onClick={() => setActiveReport('performance')}
        >
          👥 Agent Performance
        </button>
        <button 
          className={activeReport === 'categories' ? 'active' : ''}
          onClick={() => setActiveReport('categories')}
        >
          🏷️ Categories
        </button>
        <button 
          className={activeReport === 'satisfaction' ? 'active' : ''}
          onClick={() => setActiveReport('satisfaction')}
        >
          ⭐ Satisfaction
        </button>
      </div>

      {/* Overview Report */}
      {activeReport === 'overview' && (
        <div className="report-content">
          <div className="overview-grid">
            <div className="stat-card">
              <h3>Total Tickets</h3>
              <p className="stat-number">{tickets.length}</p>
            </div>
            <div className="stat-card">
              <h3>Open Tickets</h3>
              <p className="stat-number">{tickets.filter(t => t.status === 'Open').length}</p>
            </div>
            <div className="stat-card">
              <h3>Resolved Tickets</h3>
              <p className="stat-number">{tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length}</p>
            </div>
            <div className="stat-card">
              <h3>Avg Resolution Time</h3>
              <p className="stat-number">{resolutionData.average}</p>
            </div>
            <div className="stat-card">
              <h3>Customer Satisfaction</h3>
              <p className="stat-number">
                {satisfactionData.average === 'N/A' ? 'N/A' : `${satisfactionData.average} / 5`}
              </p>
              <small>{satisfactionData.count} rating{satisfactionData.count !== 1 ? 's' : ''}</small>
            </div>
            <div className="stat-card">
              <h3>SLA Breached</h3>
              <p className="stat-number">{report?.count || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* SLA Report */}
      {activeReport === 'sla' && report && (
        <div className="report-content">
          <div className="report-header">
            <h3>SLA Breached Tickets ({report.count})</h3>
            <button onClick={() => exportToCSV('sla')} className="export-btn">📥 Export CSV</button>
          </div>
          {report.breached_tickets.length === 0 ? (
            <p>No breached tickets.</p>
          ) : (
            <div className="tickets-grid">
              {report.breached_tickets.map(ticket => (
                <div key={ticket.id} className="ticket-card breached">
                  <h4>{ticket.title}</h4>
                  <p>{ticket.description}</p>
                  <p><strong>Priority:</strong> {ticket.priority}</p>
                  <p><strong>Deadline:</strong> {new Date(ticket.sla_deadline).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Volume Report */}
      {activeReport === 'volume' && (
        <div className="report-content">
          <div className="report-header">
            <h3>Ticket Volume Over Time</h3>
            <button onClick={() => exportToCSV('volume')} className="export-btn">📥 Export CSV</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Tickets Created</th>
              </tr>
            </thead>
            <tbody>
              {volumeData.map(([date, count]) => (
                <tr key={date}>
                  <td>{date}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Agent Performance */}
      {activeReport === 'performance' && (
        <div className="report-content">
          <h3>Agent Performance Metrics</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Total Assigned</th>
                <th>Resolved</th>
                <th>Open</th>
                <th>Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              {agentData.map(([agentId, stats]) => (
                <tr key={agentId}>
                  <td>{userCache[agentId] || agentId}</td>
                  <td>{stats.total}</td>
                  <td>{stats.resolved}</td>
                  <td>{stats.open}</td>
                  <td>{stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Category Distribution */}
      {activeReport === 'categories' && (
        <div className="report-content">
          <div className="report-header">
            <h3>Category Distribution</h3>
            <button onClick={() => exportToCSV('category')} className="export-btn">📥 Export CSV</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map(([category, count]) => (
                <tr key={category}>
                  <td>{category}</td>
                  <td>{count}</td>
                  <td>{((count / tickets.length) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <h3 style={{ marginTop: '2rem' }}>Priority Distribution</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {priorityData.map(([priority, count]) => (
                <tr key={priority}>
                  <td><span className={`priority-badge priority-${priority.toLowerCase()}`}>{priority}</span></td>
                  <td>{count}</td>
                  <td>{((count / tickets.length) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Satisfaction Report */}
      {activeReport === 'satisfaction' && (
        <div className="report-content">
          <h3>Customer Satisfaction Ratings</h3>
          <div className="satisfaction-overview">
            <div className="big-stat">
              <h2>{satisfactionData.average}</h2>
              <p>Average Rating</p>
              <small>{satisfactionData.count} total ratings</small>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rating</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(satisfactionData.distribution).reverse().map(([rating, count]) => (
                <tr key={rating}>
                  <td>{'⭐'.repeat(parseInt(rating))}</td>
                  <td>{count}</td>
                  <td>{satisfactionData.count > 0 ? ((count / satisfactionData.count) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;