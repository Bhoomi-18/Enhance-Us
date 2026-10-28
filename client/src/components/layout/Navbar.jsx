import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Target,
  Users,
  MessageSquare,
  User,
  Settings,
  LayoutDashboard,
  LogOut,
  Bell,
  Calendar,
  Search,
  Wifi,
  WifiOff,
  Map,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Compass,
  Sparkles,
  TrendingUp,
  BookOpen,
  RotateCcw,
  Layers,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHealth } from '../../hooks/useHealth';
import { getNotifications } from '../../services/notificationService';
import { checkAdminStatus } from '../../services/adminService';
import Badge from '../ui/Badge';
import ThemeToggle from '../common/ThemeToggle';
import LogoutConfirmModal from '../common/LogoutConfirmModal';
import ResetDemoModal from '../demo/ResetDemoModal';
import NavDropdown from './NavDropdown';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected, isHealthLoading } = useHealth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'learn' | 'community' | 'explore' | 'profile' | null
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isResetDemoModalOpen, setIsResetDemoModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const profileDropdownRef = useRef(null);

  // Check admin privileges for authenticated real users
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && user && !user.isDemo && user.emailVerified) {
      checkAdminStatus()
        .then((res) => {
          if (isMounted) setIsAdminUser(Boolean(res?.data?.isAdmin));
        })
        .catch(() => {
          if (isMounted) setIsAdminUser(false);
        });
    } else {
      setIsAdminUser(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  // Close menus on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  // Outside click and Escape key handler for profile dropdown
  useEffect(() => {
    if (activeDropdown !== 'profile') return;

    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDropdown]);

  // Periodic notification count sync
  useEffect(() => {
    if (isAuthenticated) {
      const checkUnread = async () => {
        try {
          const res = await getNotifications();
          if (res?.data?.notifications) {
            const unread = res.data.notifications.filter((n) => !n.read).length;
            setUnreadCount(unread);
          }
        } catch (e) {
          console.warn('[Notif Check Error]', e.message);
        }
      };
      checkUnread();
    }
  }, [isAuthenticated]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsLogoutModalOpen(false);
      navigate('/login');
    } catch (err) {
      console.error('[Logout Error]', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleDropdown = (name) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  // Active state helpers for grouped parents
  const isLearnActive =
    location.pathname.startsWith('/coach') ||
    location.pathname.startsWith('/goals') ||
    location.pathname.startsWith('/roadmaps');

  const isCommunityActive =
    location.pathname.startsWith('/challenges') ||
    location.pathname.startsWith('/circles') ||
    location.pathname.startsWith('/workspaces') ||
    location.pathname.startsWith('/matches') ||
    location.pathname.startsWith('/messages');

  const isExploreActive =
    location.pathname.startsWith('/search') ||
    location.pathname.startsWith('/insights');

  // Navigation Items Definitions
  const learnItems = [
    {
      label: 'AI Coach',
      path: '/coach',
      icon: Sparkles,
      description: 'Personalized next steps & practice guidance',
      badge: 'V3.2',
    },
    {
      label: 'Goals',
      path: '/goals',
      icon: Target,
      description: 'Competency goals & AI skill gap decomposition',
    },
    {
      label: 'Roadmaps',
      path: '/roadmaps',
      icon: Map,
      description: 'Interactive milestone stages & learning paths',
    },
  ];

  const communityItems = [
    {
      label: 'Challenges',
      path: '/challenges',
      icon: Trophy,
      description: 'Community skill sprints, team milestones & badges',
      badge: 'V3.8',
    },
    {
      label: 'Workspaces',
      path: '/workspaces',
      icon: Layers,
      description: 'Collaborative spaces for shared goals, notes & milestones',
      badge: 'V3.7',
    },
    {
      label: 'Circles',
      path: '/circles',
      icon: Compass,
      description: 'Collaborative peer groups & study cohorts',
    },
    {
      label: 'Matches',
      path: '/matches',
      icon: Users,
      description: 'Intelligent reciprocal skill exchange partners',
    },
    {
      label: 'Messages',
      path: '/messages',
      icon: MessageSquare,
      description: 'Direct conversations with learning peers',
    },
  ];

  const exploreItems = [
    {
      label: 'Search',
      path: '/search',
      icon: Search,
      description: 'Search skills, community members & goals',
    },
    {
      label: 'Community Insights',
      path: '/insights',
      icon: TrendingUp,
      description: 'In-demand skills, mentor deficits & circle opportunities',
      badge: 'V3.2',
    },
  ];

  const displayName = user?.name?.trim() || 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Left Brand Area & Desktop Navigation */}
            <div className="flex items-center gap-4 lg:gap-6 min-w-0">
              {/* Logo & Platform Name */}
              <Link to="/" className="flex items-center gap-2.5 shrink-0 group focus:outline-none focus:ring-2 focus:ring-teal-500/40 rounded-xl p-1">
                <img
                  src="/favicon.png"
                  alt="EnhanceUs Logo"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-sm group-hover:scale-105 transition-transform"
                />
                <div className="flex flex-col">
                  <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-none tracking-tight">
                    Enhance<span className="text-teal-600 dark:text-teal-400">Us</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide hidden sm:block">
                    Goal-Driven Exchange
                  </span>
                </div>
              </Link>

              {/* Desktop Grouped Navigation Bar (Accessible, Compact & Non-Overflowing) */}
              {isAuthenticated ? (
                <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Main Navigation">
                  {/* Destination 1: Dashboard */}
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <LayoutDashboard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Dashboard</span>
                  </NavLink>

                  {/* Destination 2: Learn Dropdown */}
                  <NavDropdown
                    id="learn"
                    label="Learn"
                    icon={BookOpen}
                    isActive={isLearnActive}
                    isOpen={activeDropdown === 'learn'}
                    onToggle={() => toggleDropdown('learn')}
                    onClose={() => setActiveDropdown(null)}
                    items={learnItems}
                    align="left"
                  />

                  {/* Destination 3: Community Dropdown */}
                  <NavDropdown
                    id="community"
                    label="Community"
                    icon={Users}
                    isActive={isCommunityActive}
                    isOpen={activeDropdown === 'community'}
                    onToggle={() => toggleDropdown('community')}
                    onClose={() => setActiveDropdown(null)}
                    items={communityItems}
                    align="left"
                  />

                  {/* Destination 4: Sessions */}
                  <NavLink
                    to="/sessions"
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Sessions</span>
                  </NavLink>

                  {/* Destination 5: Explore Dropdown */}
                  <NavDropdown
                    id="explore"
                    label="Explore"
                    icon={Compass}
                    isActive={isExploreActive}
                    isOpen={activeDropdown === 'explore'}
                    onToggle={() => toggleDropdown('explore')}
                    onClose={() => setActiveDropdown(null)}
                    items={exploreItems}
                    align="left"
                  />
                </nav>
              ) : (
                <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <a href="/#how-it-works" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                    How It Works
                  </a>
                  <a href="/#how-it-works" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                    Features
                  </a>
                  <a href="/#how-it-works" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                    About
                  </a>
                </nav>
              )}
            </div>

            {/* Right Action & Account Toolbar */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* API Connectivity Indicator (Responsive: pill on lg, compact dot on small) */}
              <div className="hidden sm:flex items-center">
                {isHealthLoading ? (
                  <Badge variant="slate" className="animate-pulse text-[11px] py-1">
                    Connecting...
                  </Badge>
                ) : isConnected ? (
                  <Badge variant="emerald" icon={Wifi} className="text-[11px] py-1">
                    API Live
                  </Badge>
                ) : (
                  <Badge variant="rose" icon={WifiOff} className="text-[11px] py-1">
                    API Offline
                  </Badge>
                )}
              </div>

              {/* Theme Toggle (Accessible in both dark and light modes) */}
              <ThemeToggle />

              {/* Authenticated Controls */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2 sm:gap-2.5">
                  {/* Demo Account Indicator */}
                  {user?.isDemo && (
                    <Badge variant="amber" className="text-[10px] uppercase font-bold py-0.5 px-2 hidden sm:inline-flex">
                      Demo
                    </Badge>
                  )}

                  {/* Notification Center Trigger */}
                  <Link
                    to="/notifications"
                    className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    title={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                    aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>

                  {/* User Profile & Account Dropdown */}
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      type="button"
                      id="profile-dropdown-button"
                      onClick={() => toggleDropdown('profile')}
                      aria-expanded={activeDropdown === 'profile'}
                      aria-haspopup="true"
                      aria-label="Account menu"
                      className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                        activeDropdown === 'profile'
                          ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-teal-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        {initial}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden md:inline max-w-[110px] truncate">
                        {displayName}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 hidden sm:block ${
                          activeDropdown === 'profile' ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
                        }`}
                      />
                    </button>

                    {/* Account Dropdown Panel */}
                    {activeDropdown === 'profile' && (
                      <div
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="profile-dropdown-button"
                      >
                        {/* Current User Header */}
                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {user?.email || ''}
                          </p>
                          {user?.isDemo && (
                            <div className="mt-1.5">
                              <Badge variant="amber" className="text-[9px] uppercase font-bold py-0.5 px-1.5">
                                Demo Mode
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Navigation Actions */}
                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setActiveDropdown(null)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                            role="menuitem"
                          >
                            <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>Profile & Trust</span>
                          </Link>

                          <Link
                            to="/settings"
                            onClick={() => setActiveDropdown(null)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                            role="menuitem"
                          >
                            <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>Account Settings</span>
                          </Link>

                          {user?.isDemo && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdown(null);
                                setIsResetDemoModalOpen(true);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-left"
                              role="menuitem"
                            >
                              <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" />
                              <span>Reset Demo Data</span>
                            </button>
                          )}

                          {isAdminUser && (
                            <Link
                              to="/admin"
                              onClick={() => setActiveDropdown(null)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                              role="menuitem"
                            >
                              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span>Admin Portal</span>
                            </Link>
                          )}
                        </div>

                        {/* Logout Trigger */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdown(null);
                              setIsLogoutModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                            role="menuitem"
                          >
                            <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                            <span>Log Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile/Tablet Menu Toggle Button (shown on screens < lg) */}
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                type="button"
                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation drawer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-slate-700 dark:text-slate-200" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile & Tablet Slide-Down Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-3 pb-6 animate-in slide-in-from-top-2 duration-200 shadow-xl max-h-[85vh] overflow-y-auto">
            {isAuthenticated ? (
              <div className="space-y-4">
                {/* Mobile User Summary Card */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                  {user?.isDemo && (
                    <Badge variant="amber" className="text-[9px] uppercase font-bold py-0.5 px-2 shrink-0">
                      Demo
                    </Badge>
                  )}
                </div>

                {/* Primary Quick Links */}
                <div className="grid grid-cols-2 gap-2">
                  <NavLink
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`
                    }
                  >
                    <LayoutDashboard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Dashboard</span>
                  </NavLink>

                  <NavLink
                    to="/sessions"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`
                    }
                  >
                    <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Sessions</span>
                  </NavLink>
                </div>

                {/* Group 1: LEARN */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    LEARN & ROADMAPS
                  </span>
                  {learnItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          <ItemIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="teal" size="sm" className="text-[9px]">
                            {item.badge}
                          </Badge>
                        )}
                      </NavLink>
                    );
                  })}
                </div>

                {/* Group 2: COMMUNITY */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    COMMUNITY & EXCHANGES
                  </span>
                  {communityItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`
                        }
                      >
                        <ItemIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>

                {/* Group 3: EXPLORE */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    EXPLORE & DISCOVERY
                  </span>
                  {exploreItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          <ItemIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="teal" size="sm" className="text-[9px]">
                            {item.badge}
                          </Badge>
                        )}
                      </NavLink>
                    );
                  })}
                </div>

                {/* Account Section in Mobile Menu */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <NavLink
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Profile & Trust Profile</span>
                  </NavLink>

                  <NavLink
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </NavLink>

                  {user?.isDemo && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setIsResetDemoModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-left"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Reset Demo Sandbox</span>
                    </button>
                  )}

                  {isAdminUser && (
                    <NavLink
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : 'text-purple-600 dark:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Admin Portal</span>
                    </NavLink>
                  )}
                </div>

                {/* Mobile Drawer Footer: Connectivity Status & Logout */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isHealthLoading ? (
                      <Badge variant="slate" className="text-[10px] animate-pulse">Connecting API...</Badge>
                    ) : isConnected ? (
                      <Badge variant="emerald" icon={Wifi} className="text-[10px]">API Live</Badge>
                    ) : (
                      <Badge variant="rose" icon={WifiOff} className="text-[10px]">API Offline</Badge>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <a
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  How It Works
                </a>
                <a
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Features
                </a>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-1">
                  <span className="text-[11px] text-slate-500">Backend Status:</span>
                  {isHealthLoading ? (
                    <Badge variant="slate" className="text-[10px] animate-pulse">Connecting API...</Badge>
                  ) : isConnected ? (
                    <Badge variant="emerald" icon={Wifi} className="text-[10px]">API Live</Badge>
                  ) : (
                    <Badge variant="rose" icon={WifiOff} className="text-[10px]">API Offline</Badge>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Confirmation Modal for Session Termination */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => {
          if (!isLoggingOut) setIsLogoutModalOpen(false);
        }}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />

      {/* Confirmation Modal for Isolated Demo Workspace Reset */}
      <ResetDemoModal
        isOpen={isResetDemoModalOpen}
        onClose={() => setIsResetDemoModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
