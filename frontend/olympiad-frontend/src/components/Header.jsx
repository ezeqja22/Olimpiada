import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { colors, spacing, typography, shadows, borderRadius } from "../designSystem";
import { getUserInitial } from "../utils";
import NotificationBell from "./NotificationBell";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { useFeatureSettings } from "../hooks/useFeatureSettings";

function Header({ showHomeButton = false }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
    const [myForums, setMyForums] = useState([]);
    const [loadingForums, setLoadingForums] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [pinnedForums, setPinnedForums] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Site settings
    const { siteSettings, loading: settingsLoading } = useSiteSettings();
    
    // Feature settings
    const { checkFeatureEnabled, showFeatureDisabledAlert } = useFeatureSettings();
    
    // Smart navigation hiding logic (mobile only)
    const shouldHideFeedButton = isMobile && (location.pathname === '/feed' || location.pathname.startsWith('/feed'));
    const shouldHideForumsButton = isMobile && (location.pathname === '/forums' || location.pathname.startsWith('/forum/'));
    const shouldHideSubjectDropdown = isMobile && (location.pathname.startsWith('/subject/'));
    
    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Update document title, favicon, and theme when site settings change
    useEffect(() => {
        if (siteSettings.site_name) {
            document.title = siteSettings.site_name;
        }
        
        if (siteSettings.site_favicon) {
            // Update favicon
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = siteSettings.site_favicon;
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        
        // Apply theme
        if (siteSettings.site_theme) {
            document.documentElement.setAttribute('data-theme', siteSettings.site_theme);
            document.body.className = `theme-${siteSettings.site_theme}`;
        }
    }, [siteSettings.site_name, siteSettings.site_favicon, siteSettings.site_theme]);

    // Subjects list
    const subjects = [
        "Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "Computer Science",
        "Other"
    ];

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem("token");
        if (token) {
            fetchCurrentUser();
        }
        
        // Load pinned forums from localStorage
        const savedPinnedForums = localStorage.getItem('pinnedForums');
        if (savedPinnedForums) {
            setPinnedForums(JSON.parse(savedPinnedForums));
        }
    }, []);

    useEffect(() => {
        // Handle responsive behavior
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        handleResize(); // Set initial value
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error("Error fetching current user:", error);
            setCurrentUser(null);
        }
    };

    const fetchMyForums = async () => {
        if (!currentUser) return;
        
        setLoadingForums(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/forums/my-forums`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyForums(response.data);
        } catch (error) {
            console.error("Error fetching my forums:", error);
            setMyForums([]);
        } finally {
            setLoadingForums(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        setCurrentUser(null);
        navigate("/homepage", { replace: true });
    };

    const handleSubjectClick = (subject) => {
        navigate(`/subject/${subject.toLowerCase().replace(/\s+/g, '-')}`);
        setShowSubjectDropdown(false);
    };

    // Get icon based on subject
    const getSubjectIcon = (subject) => {
        const subjectLower = subject?.toLowerCase() || '';
        if (subjectLower.includes('biology')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/Biology_subject_pcxmoa.svg';
        if (subjectLower.includes('chemistry')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/chemistry_subject_r4n7jq.svg';
        if (subjectLower.includes('mathematics') || subjectLower.includes('math')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/math_subject_iqigfx.svg';
        if (subjectLower.includes('physics')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/physics_subject_m90gto.svg';
        if (subjectLower.includes('computer')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/computer_engineerin_subject_u2m2ze.svg';
        if (subjectLower.includes('other')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/other_subject_nkoxvo.svg';
        return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/other_subject_nkoxvo.svg';
    };

    const handleHamburgerClick = () => {
        if (!showHamburgerMenu) {
            fetchMyForums();
        }
        setShowHamburgerMenu(!showHamburgerMenu);
    };

    const handleForumClick = (forumId) => {
        // Check if forums are enabled
        if (!checkFeatureEnabled('forums_enabled')) {
            showFeatureDisabledAlert('Forums');
            return;
        }
        navigate(`/forum/${forumId}`);
        setShowHamburgerMenu(false);
    };

    const handleMenuClose = () => {
        setShowHamburgerMenu(false);
    };

    const handleUserDropdownClose = () => {
        setShowUserDropdown(false);
    };

    const handlePinToggle = (forumId, e) => {
        e.stopPropagation(); // Prevent forum click
        
        setPinnedForums(prev => {
            const isPinned = prev.includes(forumId);
            let newPinnedForums;
            
            if (isPinned) {
                // Unpin the forum
                newPinnedForums = prev.filter(id => id !== forumId);
            } else {
                // Pin the forum
                newPinnedForums = [...prev, forumId];
            }
            
            // Save to localStorage
            localStorage.setItem('pinnedForums', JSON.stringify(newPinnedForums));
            return newPinnedForums;
        });
    };

    return (
        <header style={{
            backgroundColor: colors.primary,
            color: colors.white,
            padding: isMobile ? `${spacing.xs} ${spacing.sm}` : `${spacing.md} ${spacing.xl}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: shadows.md,
            position: "sticky",
            top: 0,
            zIndex: 1000,
            minHeight: isMobile ? "50px" : "auto"
        }}>
            {/* Logo and Hamburger Menu */}
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                {/* Hamburger Menu Button */}
                {currentUser && (
                    <button
                        onClick={handleHamburgerClick}
                        style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: colors.white,
                            cursor: "pointer",
                            padding: spacing.sm,
                            borderRadius: "4px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                            transition: "background-color 0.2s",
                            zIndex: 1001,
                            position: "relative"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        <img
                            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1761040303/sanwich_icon_hlmeja.svg"
                            alt="Menu"
                            style={{
                                width: "20px",
                                height: "20px",
                                objectFit: "contain"
                            }}
                        />
                    </button>
                )}
                
                <Link to="/homepage" style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: isMobile ? "4px" : spacing.sm, 
                        marginLeft: isMobile ? "4px" : spacing.lg 
                    }}>
                        {/* Site Logo */}
                        {siteSettings.site_logo && (
                            <img 
                                src={siteSettings.site_logo} 
                                alt={siteSettings.site_name}
                                style={{
                                    height: isMobile ? "20px" : "32px",
                                    width: "auto",
                                    maxWidth: isMobile ? "80px" : "200px",
                                    objectFit: "contain"
                                }}
                                onError={(e) => {
                                    console.error('Failed to load site logo:', siteSettings.site_logo);
                                    e.target.style.display = 'none';
                                }}
                            />
                        )}
                        
                        {/* Site Name */}
                        <h1 style={{
                            margin: 0,
                            fontSize: isMobile ? "16px" : typography.fontSize["2xl"],
                            fontWeight: typography.fontWeight.bold,
                            cursor: "pointer",
                            display: "block"
                        }}>
                            {siteSettings.site_name || 'Olimpiada'}
                        </h1>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav style={{ 
                display: isMobile ? "none" : "flex", 
                alignItems: "center", 
                gap: spacing.md 
            }}>
                {/* Home Button (if requested) */}
                {showHomeButton && (
                    <Link to="/homepage" style={{ 
                        color: colors.white, 
                        textDecoration: "none", 
                        fontWeight: typography.fontWeight.medium,
                        padding: `${spacing.sm} ${spacing.md}`,
                        borderRadius: "6px",
                        transition: "background-color 0.2s",
                        display: "flex",
                        alignItems: "center"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        <img 
                            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795078/Home_icon_gezrca.svg" 
                            alt="Home"
                            style={{
                                height: "16px",
                                width: "16px",
                                objectFit: "contain",
                                marginRight: "6px"
                            }}
                        />
                        Home
                    </Link>
                )}

                {/* Feed Link */}
                <Link to="/feed" style={{ 
                    color: colors.white, 
                    textDecoration: "none", 
                    fontWeight: typography.fontWeight.medium,
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: "6px",
                    transition: "background-color 0.2s",
                    display: "flex",
                    alignItems: "center"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                    Feed
                </Link>

                {/* Subject Dropdown */}
                <div style={{ position: "relative" }}>
                    <span
                        onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                        style={{
                            backgroundColor: "transparent",
                            color: colors.white,
                            textDecoration: "none",
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: typography.fontWeight.medium,
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    >
                        Subject
                        <span style={{ fontSize: typography.fontSize.xs }}>▼</span>
                    </span>
                    
                    {showSubjectDropdown && (
                        <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            backgroundColor: colors.white,
                            border: `1px solid ${colors.gray[300]}`,
                            borderRadius: "6px",
                            boxShadow: shadows.lg,
                            zIndex: 1000,
                            minWidth: "200px",
                            marginTop: spacing.xs
                        }}>
                            {subjects.map((subject) => {
                                // Get icon based on subject
                                const getSubjectIcon = (subject) => {
                                    const subjectLower = subject?.toLowerCase() || '';
                                    if (subjectLower.includes('biology')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/Biology_subject_pcxmoa.svg';
                                    if (subjectLower.includes('chemistry')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/chemistry_subject_r4n7jq.svg';
                                    if (subjectLower.includes('mathematics') || subjectLower.includes('math')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/math_subject_iqigfx.svg';
                                    if (subjectLower.includes('physics')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/physics_subject_m90gto.svg';
                                    if (subjectLower.includes('computer')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/computer_engineerin_subject_u2m2ze.svg';
                                    if (subjectLower.includes('other')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/other_subject_nkoxvo.svg';
                                    return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/other_subject_nkoxvo.svg';
                                };

                                return (
                                    <button
                                        key={subject}
                                        onClick={() => handleSubjectClick(subject)}
                                        style={{
                                            width: "100%",
                                            padding: `${spacing.md} ${spacing.md}`,
                                            border: "none",
                                            backgroundColor: "transparent",
                                            color: colors.dark,
                                            textAlign: "left",
                                            cursor: "pointer",
                                            fontSize: typography.fontSize.base,
                                            transition: "background-color 0.2s",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                        <img
                                            src={getSubjectIcon(subject)}
                                            alt={subject}
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                objectFit: "contain"
                                            }}
                                        />
                                        {subject}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Forums Link */}
                <span 
                    onClick={() => {
                        if (checkFeatureEnabled('forums_enabled')) {
                            navigate('/forums');
                        } else {
                            showFeatureDisabledAlert('Forums');
                        }
                    }}
                    style={{ 
                        color: colors.white, 
                        textDecoration: "none", 
                        fontWeight: typography.fontWeight.medium,
                        padding: `${spacing.sm} ${spacing.md}`,
                        borderRadius: "6px",
                        transition: "background-color 0.2s",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                    Forums
                </span>

                {/* Authentication Section */}
                {!currentUser ? (
                    <div style={{ display: "flex", gap: spacing.sm }}>
                        <Link to="/login" style={{ 
                            color: colors.white, 
                            textDecoration: "none", 
                            fontWeight: typography.fontWeight.medium,
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: "6px",
                            transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            Login
                        </Link>
                        <span 
                            onClick={() => {
                                if (checkFeatureEnabled('registration_enabled')) {
                                    navigate('/signup');
                                } else {
                                    showFeatureDisabledAlert('Registration');
                                }
                            }}
                            style={{ 
                                backgroundColor: colors.accent,
                                color: colors.white, 
                                textDecoration: "none", 
                                fontWeight: typography.fontWeight.medium,
                                padding: `${spacing.sm} ${spacing.md}`,
                                borderRadius: "6px",
                                transition: "background-color 0.2s",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#218838"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = colors.accent}
                        >
                            Signup
                        </span>
                    </div>
                ) : (
                    /* Authenticated User Section */
                    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                        {/* Notification Bell */}
                        <NotificationBell />
                        
                        {/* Removed WebSocket Status Indicator */}
                        
                        {/* User Dropdown */}
                        <div style={{ position: "relative" }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('User dropdown clicked');
                                setShowUserDropdown(!showUserDropdown);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: spacing.sm,
                                backgroundColor: "transparent",
                                border: "none",
                                color: colors.white,
                                cursor: "pointer",
                                padding: `${spacing.sm} ${spacing.md}`,
                                borderRadius: "6px",
                                transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = colors.secondary}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            {currentUser.profile_picture ? (
                                <img
                                    src={currentUser.profile_picture}
                                    alt="Profile"
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        objectFit: "cover"
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: "32px",
                                    height: "32px",
                                    backgroundColor: colors.secondary,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: typography.fontSize.sm,
                                    fontWeight: typography.fontWeight.bold
                                }}>
                                    {getUserInitial(currentUser.username)}
                                </div>
                            )}
                            <span style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium }}>
                                {currentUser.username}
                            </span>
                            <span style={{ fontSize: typography.fontSize.xs }}>▼</span>
                        </button>

                        {showUserDropdown && (
                            <div style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                backgroundColor: colors.white,
                                border: `1px solid ${colors.gray[300]}`,
                                borderRadius: "6px",
                                boxShadow: shadows.lg,
                                zIndex: 1001,
                                minWidth: "200px",
                                marginTop: spacing.xs
                            }}>
                                <Link to="/profile" style={{ textDecoration: "none" }}>
                                    <div style={{
                                        padding: `${spacing.md} ${spacing.md}`,
                                        color: colors.dark,
                                        cursor: "pointer",
                                        transition: "background-color 0.2s",
                                        borderBottom: `1px solid ${colors.gray[200]}`,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                        <img
                                            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Profile_Icon_Green_t3zoz5.svg"
                                            alt="Profile"
                                            style={{
                                                width: "16px",
                                                height: "16px",
                                                objectFit: "contain"
                                            }}
                                        />
                                        My Profile
                                    </div>
                                </Link>
                                <Link to="/settings" style={{ textDecoration: "none" }}>
                                    <div style={{
                                        padding: `${spacing.md} ${spacing.md}`,
                                        color: colors.dark,
                                        cursor: "pointer",
                                        transition: "background-color 0.2s",
                                        borderBottom: `1px solid ${colors.gray[200]}`,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                        <img
                                            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Settings_Icon_rzokwo.svg"
                                            alt="Settings"
                                            style={{
                                                width: "16px",
                                                height: "16px",
                                                objectFit: "contain"
                                            }}
                                        />
                                        Settings
                                    </div>
                                </Link>
                                {(currentUser.role === 'admin' || currentUser.role === 'moderator') && (
                                    <Link to="/admin" style={{ textDecoration: "none" }}>
                                        <div style={{
                                            padding: `${spacing.md} ${spacing.md}`,
                                            color: colors.primary,
                                            cursor: "pointer",
                                            transition: "background-color 0.2s",
                                            borderBottom: `1px solid ${colors.gray[200]}`,
                                            fontWeight: typography.fontWeight.medium
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                        >
                                        Admin Panel
                                        </div>
                                    </Link>
                                )}
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        width: "100%",
                                        padding: `${spacing.md} ${spacing.md}`,
                                        border: "none",
                                        backgroundColor: "transparent",
                                        color: colors.danger,
                                        cursor: "pointer",
                                        fontSize: typography.fontSize.base,
                                        transition: "background-color 0.2s",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: spacing.sm
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[100]}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                >
                                    <img
                                        src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760802149/LOG_OUT_RED_d1wwc3.svg"
                                        alt="Logout"
                                        style={{
                                            height: "16px",
                                            width: "16px",
                                            objectFit: "contain"
                                        }}
                                    />
                                    Logout
                                </button>
                            </div>
                        )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Mobile Navigation */}
            {isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {/* Mobile Navigation Links - Smart Hiding */}
                    {!shouldHideFeedButton && (
                        <Link to="/feed" style={{ 
                            color: "white", 
                            textDecoration: "none", 
                            fontSize: "11px",
                            fontWeight: "500",
                            padding: "4px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(255, 255, 255, 0.1)"
                        }}>
                            Feed
                        </Link>
                    )}
                    {!shouldHideForumsButton && (
                        <Link to="/forums" style={{ 
                            color: "white", 
                            textDecoration: "none", 
                            fontSize: "11px",
                            fontWeight: "500",
                            padding: "4px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(255, 255, 255, 0.1)"
                        }}>
                            Forums
                        </Link>
                    )}
                    
                    {/* Mobile Subject Dropdown - Smart Hiding */}
                    {!shouldHideSubjectDropdown && (
                        <div style={{ position: "relative" }}>
                            <button
                                onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                                style={{ 
                                    color: "white", 
                                    textDecoration: "none", 
                                    fontSize: "11px",
                                    fontWeight: "500",
                                    padding: "4px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px"
                                }}
                            >
                                Subject
                                <span style={{ fontSize: "9px" }}>▼</span>
                            </button>
                            
                            {showSubjectDropdown && (
                                <div style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    backgroundColor: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                                    zIndex: 1000,
                                    minWidth: "150px",
                                    marginTop: "4px"
                                }}>
                                    {subjects.map((subject) => (
                                        <button
                                            key={subject}
                                            onClick={() => {
                                                navigate(`/subject/${subject.toLowerCase().replace(/\s+/g, '-')}`);
                                                setShowSubjectDropdown(false);
                                            }}
                                            style={{
                                                width: "100%",
                                                padding: "12px 16px",
                                                border: "none",
                                                backgroundColor: "transparent",
                                                color: "#374151",
                                                textAlign: "left",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px"
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                        >
                                            <img
                                                src={getSubjectIcon(subject)}
                                                alt={subject}
                                                style={{
                                                    width: "20px",
                                                    height: "20px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                            {subject}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {currentUser ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative" }}>
                            <NotificationBell />
                            <button
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                style={{
                                    backgroundColor: "transparent",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    padding: "4px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    backgroundColor: colors.secondary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: colors.white,
                                    fontWeight: "bold",
                                    fontSize: "10px"
                                }}>
                                    {getUserInitial(currentUser.username)}
                                </div>
                            </button>
                            
                            {/* Mobile User Dropdown */}
                            {showUserDropdown && (
                                <div style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: "0",
                                    backgroundColor: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                                    zIndex: 1001,
                                    minWidth: "140px",
                                    marginTop: "4px"
                                }}>
                                    <Link to="/profile" style={{ textDecoration: "none" }}>
                                        <div style={{
                                            padding: "8px 12px",
                                            color: "#374151",
                                            cursor: "pointer",
                                            fontSize: "12px",
                                            borderBottom: "1px solid #f3f4f6",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px"
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                        >
                                            <img
                                                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Profile_Icon_Green_t3zoz5.svg"
                                                alt="Profile"
                                                style={{
                                                    width: "14px",
                                                    height: "14px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                            Profile
                                        </div>
                                    </Link>
                                    <Link to="/settings" style={{ textDecoration: "none" }}>
                                        <div style={{
                                            padding: "8px 12px",
                                            color: "#374151",
                                            cursor: "pointer",
                                            fontSize: "12px",
                                            borderBottom: "1px solid #f3f4f6",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px"
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                        >
                                            <img
                                                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Settings_Icon_rzokwo.svg"
                                                alt="Settings"
                                                style={{
                                                    width: "14px",
                                                    height: "14px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                            Settings
                                        </div>
                                    </Link>
                                    {/* Admin Panel Link - Mobile */}
                                    {(currentUser.role === 'admin' || currentUser.role === 'moderator') && (
                                        <Link to="/admin" style={{ textDecoration: "none" }}>
                                            <div style={{
                                                padding: "8px 12px",
                                                color: "#667eea",
                                                cursor: "pointer",
                                                fontSize: "12px",
                                                borderBottom: "1px solid #f3f4f6",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                fontWeight: "500"
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                            >
                                                <img
                                                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Settings_Icon_rzokwo.svg"
                                                    alt="Admin"
                                                    style={{
                                                        width: "14px",
                                                        height: "14px",
                                                        objectFit: "contain"
                                                    }}
                                                />
                                                Admin Panel
                                            </div>
                                        </Link>
                                    )}
                                    <div 
                                        onClick={handleLogout}
                                        style={{
                                            padding: "8px 12px",
                                            color: "#dc2626",
                                            cursor: "pointer",
                                            fontSize: "12px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px"
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#fef2f2"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                        <img
                                            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760802149/LOG_OUT_RED_d1wwc3.svg"
                                            alt="Logout"
                                            style={{
                                                width: "14px",
                                                height: "14px",
                                                objectFit: "contain"
                                            }}
                                        />
                                        Logout
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" style={{ 
                            color: "white", 
                            textDecoration: "none", 
                            fontSize: "11px",
                            fontWeight: "500",
                            padding: "4px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(255, 255, 255, 0.1)"
                        }}>
                            Login
                        </Link>
                    )}
                </div>
            )}

            {/* Click outside to close user dropdown */}
            {showUserDropdown && (
                <div 
                    onClick={handleUserDropdownClose}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                    }}
                />
            )}
            
            {/* Hamburger Menu Overlay */}
            {showHamburgerMenu && (
                <div
                    onClick={handleMenuClose}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        zIndex: 999
                    }}
                />
            )}
            
            {/* Sliding Menu */}
            <div style={{
                position: "fixed",
                top: 0,
                left: showHamburgerMenu ? "0" : "-100%",
                width: isMobile ? "60%" : "25%",
                height: "100vh",
                backgroundColor: colors.white,
                boxShadow: shadows.xl,
                zIndex: 1000,
                transition: "left 0.3s ease-in-out",
                display: showHamburgerMenu ? "block" : "none",
                overflowY: "auto",
                padding: spacing.lg
            }}>
                {checkFeatureEnabled('forums_enabled') ? (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: spacing.lg,
                        paddingBottom: spacing.md,
                        borderBottom: `1px solid ${colors.gray[200]}`,
                        backgroundColor: colors.primary,
                        margin: `-${spacing.lg} -${spacing.lg} ${spacing.lg} -${spacing.lg}`,
                        padding: spacing.lg,
                        borderRadius: `${borderRadius.lg} ${borderRadius.lg} 0 0`,
                        position: "relative"
                    }}>
                        <button
                            onClick={handleMenuClose}
                            style={{
                                backgroundColor: "transparent",
                                border: "none",
                                color: colors.white,
                                cursor: "pointer",
                                padding: spacing.sm,
                                borderRadius: borderRadius.sm,
                                display: "flex",
                                flexDirection: "column",
                                gap: "3px",
                                transition: "background-color 0.2s",
                                position: "absolute",
                                left: spacing.lg
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            <img
                                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1761040303/sanwich_icon_hlmeja.svg"
                                alt="Close Menu"
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    objectFit: "contain"
                                }}
                            />
                        </button>
                        <h3 style={{
                            margin: 0,
                            fontSize: typography.fontSize.lg,
                            fontWeight: typography.fontWeight.bold,
                            color: colors.white
                        }}>
                            My Forums
                        </h3>
                    </div>
                ) : (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: spacing.lg,
                        paddingBottom: spacing.md,
                        borderBottom: `1px solid ${colors.gray[200]}`,
                        backgroundColor: colors.primary,
                        margin: `-${spacing.lg} -${spacing.lg} ${spacing.lg} -${spacing.lg}`,
                        padding: spacing.lg,
                        borderRadius: `${borderRadius.lg} ${borderRadius.lg} 0 0`,
                        position: "relative"
                    }}>
                        <button
                            onClick={handleMenuClose}
                            style={{
                                backgroundColor: "transparent",
                                border: "none",
                                color: colors.white,
                                cursor: "pointer",
                                padding: spacing.sm,
                                borderRadius: borderRadius.sm,
                                display: "flex",
                                flexDirection: "column",
                                gap: "3px",
                                transition: "background-color 0.2s",
                                position: "absolute",
                                left: spacing.lg
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                            <img
                                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1761040303/sanwich_icon_hlmeja.svg"
                                alt="Close Menu"
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    objectFit: "contain"
                                }}
                            />
                        </button>
                        <h3 style={{
                            margin: 0,
                            fontSize: typography.fontSize.lg,
                            fontWeight: typography.fontWeight.bold,
                            color: colors.white
                        }}>
                            Forums Disabled
                        </h3>
                    </div>
                )}
                
                {checkFeatureEnabled('forums_enabled') && (
                    <>
                        {loadingForums ? (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: spacing.xl,
                        color: colors.gray[500]
                    }}>
                        Loading forums...
                    </div>
                ) : myForums.length === 0 ? (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: spacing.xl,
                        color: colors.gray[500],
                        textAlign: "center"
                    }}>
                        No forums found.<br />
                        Join or create a forum to see it here.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                        {myForums
                            .sort((a, b) => {
                                const aPinned = pinnedForums.includes(a.id);
                                const bPinned = pinnedForums.includes(b.id);
                                
                                if (aPinned && !bPinned) return -1;
                                if (!aPinned && bPinned) return 1;
                                return 0;
                            })
                            .map((forum) => {
                            // Get icon based on subject
                            const getForumIcon = (subject) => {
                                const subjectLower = subject?.toLowerCase() || '';
                                if (subjectLower.includes('biology')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/Biology_subject_pcxmoa.svg';
                                if (subjectLower.includes('chemistry')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/chemistry_subject_r4n7jq.svg';
                                if (subjectLower.includes('mathematics') || subjectLower.includes('math')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/math_subject_iqigfx.svg';
                                if (subjectLower.includes('physics')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/physics_subject_m90gto.svg';
                                if (subjectLower.includes('computer')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/computer_engineerin_subject_u2m2ze.svg';
                                if (subjectLower.includes('education') || subjectLower.includes('academic')) return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/other_subject_nkoxvo.svg';
                                return 'https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/other_subject_nkoxvo.svg';
                            };

                            return (
                                <button
                                    key={forum.id}
                                    onClick={() => handleForumClick(forum.id)}
                                    style={{
                                        width: "100%",
                                        padding: spacing.md,
                                        backgroundColor: "transparent",
                                        border: "none",
                                        borderRadius: borderRadius.lg,
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: typography.fontSize.base,
                                        color: colors.dark,
                                        transition: "all 0.2s ease",
                                        borderBottom: `1px solid ${colors.gray[100]}`,
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: spacing.sm,
                                        position: "relative",
                                        overflow: "hidden"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = "#e8f5e8";
                                        e.target.style.transform = "scale(1.02)";
                                        e.target.style.boxShadow = "0 4px 12px rgba(26, 77, 58, 0.15)";
                                        e.target.style.borderColor = colors.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = "transparent";
                                        e.target.style.transform = "scale(1)";
                                        e.target.style.boxShadow = "none";
                                        e.target.style.borderColor = colors.gray[100];
                                    }}
                                >
                                    {/* Forum Icon */}
                                    <div style={{
                                        marginTop: "2px",
                                        flexShrink: 0,
                                        pointerEvents: "none",
                                        display: "flex",
                                        alignItems: "center"
                                    }}>
                                        <img 
                                            src={getForumIcon(forum.subject)}
                                            alt={forum.subject}
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                objectFit: "contain"
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Forum Content */}
                                    <div style={{ 
                                        flex: 1, 
                                        minWidth: 0,
                                        pointerEvents: "none"
                                    }}>
                                        <div style={{
                                            fontWeight: typography.fontWeight.semibold,
                                            marginBottom: spacing.xs,
                                            fontSize: typography.fontSize.base,
                                            color: colors.dark,
                                            lineHeight: 1.3
                                        }}>
                                            {forum.title}
                                        </div>
                                        {forum.description && (
                                            <div style={{
                                                fontSize: typography.fontSize.sm,
                                                color: colors.gray[600],
                                                lineHeight: 1.4,
                                                marginBottom: spacing.xs
                                            }}>
                                                {forum.description.length > 50 
                                                    ? `${forum.description.substring(0, 50)}...` 
                                                    : forum.description
                                                }
                                            </div>
                                        )}
                                        
                                        {/* Subject Badge */}
                                        {forum.subject && (
                                            <div style={{
                                                display: "inline-block",
                                                backgroundColor: colors.primary + "20",
                                                color: colors.primary,
                                                padding: `${spacing.xs} ${spacing.sm}`,
                                                borderRadius: borderRadius.sm,
                                                fontSize: typography.fontSize.xs,
                                                fontWeight: typography.fontWeight.medium,
                                                marginTop: spacing.xs
                                            }}>
                                                {forum.subject}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Pin Button/Icon */}
                                    {pinnedForums.includes(forum.id) ? (
                                        // Pinned: Show pushpin emoji
                                        <button
                                            onClick={(e) => handlePinToggle(forum.id, e)}
                                            style={{
                                                backgroundColor: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                padding: spacing.xs,
                                                borderRadius: borderRadius.sm,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "16px",
                                                color: colors.primary,
                                                transition: "all 0.2s ease",
                                                flexShrink: 0,
                                                marginTop: "2px"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = colors.gray[100];
                                                e.target.style.transform = "scale(1.1)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = "transparent";
                                                e.target.style.transform = "scale(1)";
                                            }}
                                            title="Unpin forum"
                                        >
                                            <img 
                                                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811441/Pin_Icon_Green_ly3fxo.svg" 
                                                alt="Pin"
                                                style={{
                                                    height: "14px",
                                                    width: "14px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                        </button>
                                    ) : (
                                        // Unpinned: Show "Pin" button
                                        <button
                                            onClick={(e) => handlePinToggle(forum.id, e)}
                                            style={{
                                                backgroundColor: "transparent",
                                                border: `1px solid ${colors.gray[300]}`,
                                                cursor: "pointer",
                                                padding: `${spacing.xs} ${spacing.sm}`,
                                                borderRadius: borderRadius.sm,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: typography.fontSize.xs,
                                                fontWeight: typography.fontWeight.medium,
                                                color: colors.gray[500],
                                                transition: "all 0.2s ease",
                                                flexShrink: 0,
                                                marginTop: "2px",
                                                minWidth: "40px",
                                                height: "24px"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = colors.gray[100];
                                                e.target.style.borderColor = colors.primary;
                                                e.target.style.color = colors.primary;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = "transparent";
                                                e.target.style.borderColor = colors.gray[300];
                                                e.target.style.color = colors.gray[500];
                                            }}
                                            title="Pin forum"
                                        >
                                            Pin
                                        </button>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
                    </>
                )}
            </div>
        </header>
    );
}

export default Header;
