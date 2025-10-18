import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './AdminLayout.css';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching current user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while fetching user data
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#6c757d'
      }}>
        Loading...
      </div>
    );
  }

  // Redirect if not admin or moderator
  if (!currentUser || !['admin', 'moderator'].includes(currentUser.role)) {
    navigate('/');
    return null;
  }

  const menuItems = [
    {
      path: '/admin',
      label: 'Dashboard',
      icon: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811298/Dashboard_admin_panel_omb7cw.svg',
      adminOnly: false
    },
    {
      path: '/admin/users',
      label: 'Users',
      icon: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811397/Users_admin_panel_lzwnqx.svg',
      adminOnly: false
    },
    {
      path: '/admin/forums',
      label: 'Forums',
      icon: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811442/Forums_admin_panel_bmseel.svg',
      adminOnly: false
    },
    {
      path: '/admin/reports',
      label: 'Reports',
      icon: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811440/Reports_admin_panel_mun0ix.svg',
      adminOnly: false
    },
        {
          path: '/admin/user-history',
          label: 'User History',
          icon: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811353/Users_Hirstory_admin_panel_eqvfdf.svg',
          adminOnly: false
        },
        {
          path: '/admin/settings',
          label: 'Settings',
          icon: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811439/Settings_admin_panel_cpayja.svg',
          adminOnly: true
        },
    {
      path: '/admin/email',
      label: 'Email',
      icon: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811297/Email_admin_panel_zjmkz7.svg',
      adminOnly: true
    },
    {
      path: '/admin/analytics',
      label: 'Analytics',
      icon: 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811310/Analytics_admin_panel_en0409.svg',
      adminOnly: false
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.adminOnly || currentUser.role === 'admin'
  );

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-sidebar-header">
          <h2> Admin Panel</h2>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        
        <nav className="admin-nav">
          {filteredMenuItems.map((item) => (
            <button
              key={item.path}
              className={`admin-nav-item ${
                location.pathname === item.path ? 'active' : ''
              }`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">
                <img 
                  src={item.icon} 
                  alt={item.label}
                  style={{
                    width: "20px",
                    height: "20px",
                    objectFit: "contain"
                  }}
                />
              </span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
        
        <div className="admin-sidebar-footer">
          <button 
            className="back-to-site"
            onClick={() => navigate('/')}
          >
            <span className="nav-icon"></span>
            {sidebarOpen && <span className="nav-label">Back to Site</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        <div className="admin-header">
          <div className="admin-header-left">
            <h1>Admin Panel</h1>
            <span className="user-role">
              {currentUser.role === 'admin' ? '👑 Admin' : '🛡️ Moderator'}
            </span>
          </div>
          <div className="admin-header-right">
            <span className="welcome-text">
              Welcome, {currentUser.username}
            </span>
          </div>
        </div>
        
        <div className="admin-main">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
