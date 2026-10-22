import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Target,
  Users,
  Compass,
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHealth } from '../../hooks/useHealth';
import { getNotifications } from '../../services/notificationService';
import { checkAdminStatus } from '../../services/adminService';
import Badge from '../ui/Badge';
import ThemeToggle from '../common/ThemeToggle';
import LogoutConfirmModal from '../common/LogoutConfirmModal';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected, isHealthLoading } = useHealth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

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

  const dropdownRef = useRef(null);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  // Click outside and escape key handling for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileDropdownOpen]);

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

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Goals', path: '/goals', icon: Target },
    { label: 'Roadmaps', path: '/roadmaps', icon: Map },
    { label: 'Matches', path: '/matches', icon: Users },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
    { label: 'Sessions', path: '/sessions', icon: Calendar },
    { label: 'Search', path: '/search', icon: Search },
    ...(isAdminUser ? [{ label: 'Admin', path: '/admin', icon: ShieldCheck }] : []),
  ];

  const displayName = user?.name?.trim() || 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Platform Identity */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-extrabold shadow-sm group-hover:bg-teal-700 transition-colors">
                  <Compass className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100 leading-none tracking-tight">
                    Enhance<span className="text-teal-600 dark:text-teal-400">Us</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Goal-Driven Exchange</span>
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              {isAuthenticated ? (
                <nav className="hidden xl:flex items-center gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-300'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
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

            {/* Right Action Bar */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Live API Connectivity Indicator (Responsive) */}
              <div className="hidden sm:block">
                {isHealthLoading ? (
                  <Badge variant="slate" className="animate-pulse">Connecting API...</Badge>
                ) : isConnected ? (
                  <Badge variant="emerald" icon={Wifi}>API Live</Badge>
                ) : (
                  <Badge variant="rose" icon={WifiOff}>API Offline</Badge>
                )}
              </div>

              {/* Theme Toggle (accessible in both authenticated and guest states) */}
              <ThemeToggle />

              {/* Auth State Menu */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  {user?.isDemo && (
                    <Badge variant="amber" className="text-[10px] uppercase font-bold py-0.5 px-2 hidden sm:inline-flex">
                      Demo Mode
                    </Badge>
                  )}

                  {/* Notification Bell */}
                  <Link
                    to="/notifications"
                    className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Link>

                  {/* Top-Right Profile Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      id="profile-dropdown-button"
                      onClick={() => setProfileDropdownOpen((prev) => !prev)}
                      aria-expanded={profileDropdownOpen}
                      aria-haspopup="true"
                      aria-label="Account menu"
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                        profileDropdownOpen
                          ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-teal-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        {initial}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden md:inline max-w-[120px] truncate">
                        {displayName}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
                          profileDropdownOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Panel */}
                    {profileDropdownOpen && (
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
                                Demo Account
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Navigation Actions */}
                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                            role="menuitem"
                          >
                            <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>Profile</span>
                          </Link>

                          <Link
                            to="/settings"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                            role="menuitem"
                          >
                            <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>Settings</span>
                          </Link>

                          {isAdminUser && (
                            <Link
                              to="/admin"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                              role="menuitem"
                            >
                              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span>Admin Portal</span>
                            </Link>
                          )}
                        </div>

                        {/* Logout Confirmation Trigger */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setProfileDropdownOpen(false);
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
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3.5 py-2 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                type="button"
                className="xl:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Slide-down Navigation Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-3 pb-6 animate-in slide-in-from-top-2 duration-200 shadow-elevated">
            {isAuthenticated ? (
              <div className="space-y-1">
                {/* Mobile User Summary Card */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                      {initial}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{displayName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
                    </div>
                  </div>
                  {user?.isDemo && (
                    <Badge variant="amber" className="text-[9px] uppercase font-bold py-0.5 px-2">
                      Demo Mode
                    </Badge>
                  )}
                </div>

                {/* Primary Nav Links */}
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}

                {/* Account Section in Mobile Menu */}
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <NavLink
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Profile</span>
                  </NavLink>

                  <NavLink
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Settings</span>
                  </NavLink>
                </div>

                {/* Mobile Logout Action with Confirmation */}
                <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
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
    </>
  );
};

export default Navbar;
