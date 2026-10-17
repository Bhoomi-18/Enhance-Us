import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Target, Users, Compass, MessageSquare, User, Settings, LayoutDashboard, LogOut, Bell, Calendar, Search, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHealth } from '../../hooks/useHealth';
import { getNotifications } from '../../services/notificationService';
import Badge from '../ui/Badge';

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected, isHealthLoading } = useHealth();

  const [unreadCount, setUnreadCount] = useState(0);

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

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Goals', path: '/goals', icon: Target },
    { label: 'Matches', path: '/matches', icon: Users },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
    { label: 'Sessions', path: '/sessions', icon: Calendar },
    { label: 'Search', path: '/search', icon: Search },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Identity */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-extrabold shadow-sm group-hover:bg-teal-700 transition-colors">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-slate-900 leading-none tracking-tight">
                  Enhance<span className="text-teal-600">Us</span>
                </span>
                <span className="text-[10px] text-slate-600 font-medium tracking-wide">Goal-Driven Exchange</span>
              </div>
            </Link>

            {/* Main Nav Links */}
            {isAuthenticated ? (
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-slate-100 text-teal-700'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
              <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-600">
                <a href="/#how-it-works" className="hover:text-slate-900 transition-colors">
                  How It Works
                </a>
                <a href="/#how-it-works" className="hover:text-slate-900 transition-colors">
                  Features
                </a>
                <a href="/#how-it-works" className="hover:text-slate-900 transition-colors">
                  About
                </a>
              </nav>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Live API Connectivity Indicator */}
            <div className="hidden lg:block">
              {isHealthLoading ? (
                <Badge variant="slate" className="animate-pulse">Connecting API...</Badge>
              ) : isConnected ? (
                <Badge variant="emerald" icon={Wifi}>API Live</Badge>
              ) : (
                <Badge variant="rose" icon={WifiOff}>API Offline</Badge>
              )}
            </div>

            {/* Auth State Menu */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {user?.isDemo && (
                  <Badge variant="amber" className="text-[10px] uppercase font-bold py-1 px-2">
                    Demo Mode
                  </Badge>
                )}

                {/* Notification Bell */}
                <Link
                  to="/notifications"
                  className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <Link to="/profile" className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 hidden sm:inline">{user?.name}</span>
                </Link>

                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
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
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
