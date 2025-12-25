import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertCircle, TrendingUp, Package, Zap, Filter, Plus, Search, X, CheckCircle2, Clock } from 'lucide-react';
import './App.css';

const API_URL = 'https://issue-overflow-backend.onrender.com';

const COLORS = {
  Equipment: '#ef4444',
  Quality: '#f59e0b',
  'Supply Chain': '#3b82f6',
  Technical: '#8b5cf6',
  Other: '#6b7280'
};

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#65a30d'
};

export default function IssueFlow() {
  const [issues, setIssues] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchIssues();
    fetchAnalytics();
  }, [filterCategory, filterSeverity]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `${API_URL}/issues`;
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch issues');
      const data = await response.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError('Failed to load issues. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });
      
      if (!response.ok) throw new Error('Failed to submit issue');
      
      setInputText('');
      setShowInput(false);
      setSuccessMessage('Issue submitted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchIssues();
      await fetchAnalytics();
    } catch (error) {
      console.error('Failed to submit issue:', error);
      setError('Failed to submit issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(issue =>
    searchTerm === '' || 
    issue.raw_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.entities.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categoryData = analytics?.by_category ? 
    Object.entries(analytics.by_category).map(([name, value]) => ({ name, value })) : [];

  const severityData = analytics?.by_severity ?
    Object.entries(analytics.by_severity).map(([name, value]) => ({ name, value })) : [];

  const trendData = analytics?.trend || [];

  return (
    <div className="app-background">
      {/* Animated Background Orbs */}
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>
      <div className="floating-orb orb-3"></div>

      {/* Header */}
      <header className="app-header glass-effect">
        <div className="header-content">
          <div className="logo-section animate-slide-in">
            <div className="logo-icon">
              <AlertCircle color="white" size={28} />
            </div>
            <div className="logo-text">
              <h1>IssueFlow</h1>
              <p>Self-organizing operational intelligence</p>
            </div>
          </div>
          <button onClick={() => setShowInput(!showInput)} className="report-button">
            <Plus size={20} />
            <span>Report Issue</span>
          </button>
        </div>
      </header>

      <div className="main-content">
        {/* Success Toast */}
        {successMessage && (
          <div className="success-toast animate-slide-in">
            <CheckCircle2 color="#22c55e" size={24} />
            <span className="success-toast-text">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message animate-fade-in-up">
            <div className="error-content">
              <div className="error-text">
                <AlertCircle color="#ef4444" size={24} />
                <span className="error-message-text">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="error-close">
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Modal for Input */}
        {showInput && (
          <div className="modal-overlay" onClick={() => setShowInput(false)}>
            <div className="modal-content animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Report New Issue</h2>
                <button onClick={() => setShowInput(false)} className="modal-close">
                  <X size={24} />
                </button>
              </div>
              <div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Describe the issue in natural language...

Examples:
• Motor overheating after 3 hours
• PCB board version 2 failed QA
• Delay in shipment from vendor X"
                  className="modal-textarea"
                />
                <div className="modal-buttons">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !inputText.trim()}
                    className="submit-button"
                  >
                    {loading ? (
                      <>
                        <span className="spinner animate-spin"></span>
                        Processing...
                      </>
                    ) : 'Submit Issue'}
                  </button>
                  <button onClick={() => setShowInput(false)} className="cancel-button">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {analytics && (
          <div className="stats-grid">
            <div className="stat-card animate-fade-in-up">
              <div className="stat-content">
                <div className="stat-icon blue">
                  <AlertCircle color="white" size={28} />
                </div>
                <div className="stat-info">
                  <p>Total Issues</p>
                  <h3>{analytics.total_issues}</h3>
                </div>
              </div>
            </div>

            <div className="stat-card animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              <div className="stat-content">
                <div className="stat-icon red animate-pulse">
                  <Zap color="white" size={28} />
                </div>
                <div className="stat-info">
                  <p>Critical Issues</p>
                  <h3>{analytics.by_severity.critical || 0}</h3>
                </div>
              </div>
            </div>

            <div className="stat-card animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              <div className="stat-content">
                <div className="stat-icon purple">
                  <Package color="white" size={28} />
                </div>
                <div className="stat-info">
                  <p>Categories</p>
                  <h3>{Object.keys(analytics.by_category).length}</h3>
                </div>
              </div>
            </div>

            <div className="stat-card animate-fade-in-up" style={{animationDelay: '0.3s'}}>
              <div className="stat-content">
                <div className="stat-icon green">
                  <TrendingUp color="white" size={28} />
                </div>
                <div className="stat-info">
                  <p>Last 7 Days</p>
                  <h3>{trendData.reduce((sum, d) => sum + d.count, 0)}</h3>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        {analytics && categoryData.length > 0 && (
          <div className="charts-grid">
            <div className="chart-card animate-fade-in-up">
              <h3 className="chart-title">Issues by Category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS.Other} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              <h3 className="chart-title">Severity Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card full-width animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              <h3 className="chart-title">7-Day Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-card animate-fade-in-up">
          <div className="filters-content">
            <div className="filter-label">
              <Filter size={20} color="#6366f1" />
              <span>Filters</span>
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              <option value="Equipment">Equipment</option>
              <option value="Quality">Quality</option>
              <option value="Supply Chain">Supply Chain</option>
              <option value="Technical">Technical</option>
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <div className="search-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search issues..."
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Issues List */}
        <div className="issues-card animate-fade-in-up">
          <div className="issues-header">
            <h2>
              <Clock size={24} color="#6366f1" />
              Recent Issues
            </h2>
            <p>{filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'} found</p>
          </div>
          
          <div className="issues-list">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner animate-spin"></div>
                <p className="loading-text">Loading issues...</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="empty-state">
                <AlertCircle className="empty-state-icon" size={48} />
                <p className="empty-state-title">No issues found</p>
                <p className="empty-state-subtitle">Click "Report Issue" to create your first one!</p>
              </div>
            ) : (
              filteredIssues.map((issue, index) => (
                <div key={issue.id} className="issue-item animate-slide-in" style={{animationDelay: `${index * 0.05}s`}}>
                  <div className="issue-badges">
                    <span
                      className="category-badge"
                      style={{
                        backgroundColor: `${COLORS[issue.category]}20`,
                        color: COLORS[issue.category],
                        borderColor: `${COLORS[issue.category]}40`
                      }}
                    >
                      {issue.category}
                    </span>
                    <span
                      className="severity-badge"
                      style={{ backgroundColor: SEVERITY_COLORS[issue.severity] }}
                    >
                      {issue.severity.toUpperCase()}
                    </span>
                    <span className="timestamp">
                      <Clock size={14} />
                      {new Date(issue.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className="issue-text">{issue.raw_text}</p>
                  
                  {issue.entities.length > 0 && (
                    <div className="entities-list">
                      {issue.entities.map((entity, idx) => (
                        <span key={idx} className="entity-badge">
                          {entity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}