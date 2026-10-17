import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Sparkles, MessageSquare, Calendar, Star, ArrowRight } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { getNotifications, markAsRead, markAllAsRead } from '../services/notificationService';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotificationsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications();
      if (res?.data?.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsList();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      fetchNotificationsList();
    } catch (e) {
      console.warn('[Mark Read Error]', e.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      fetchNotificationsList();
    } catch (e) {
      console.warn('[Mark All Read Error]', e.message);
    }
  };

  return (
    <PageContainer
      title="Activity Alerts & Notifications"
      subtitle="Updates on your reciprocal matches, session requests, and peer reviews."
      action={
        <Button variant="outline" size="sm" onClick={handleMarkAllRead} leftIcon={CheckCheck}>
          Mark All As Read
        </Button>
      }
    >
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Loading activity alerts..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">{error}</div>
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title="No Activity Alerts Yet"
            description="You will receive alerts here when peers match with your goals, send exchange requests, or complete sessions."
          />
        </Card>
      ) : (
        <div className="space-y-3 max-w-3xl mx-auto">
          {notifications.map((notif) => (
            <Card
              key={notif._id}
              className={`p-4 transition-colors ${
                notif.read ? 'bg-white border-slate-200' : 'bg-teal-50/40 border-teal-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-xs text-slate-900">{notif.title}</h4>
                      {!notif.read && <Badge variant="teal" className="text-[9px]">New</Badge>}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {notif.link && (
                    <Link to={notif.link}>
                      <Button variant="outline" size="sm" rightIcon={ArrowRight}>
                        View
                      </Button>
                    </Link>
                  )}
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkRead(notif._id)}
                      className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default NotificationsPage;
