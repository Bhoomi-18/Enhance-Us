import React from 'react';
import { Settings, Sliders, Bell, Shield } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export const SettingsPage = () => {
  return (
    <PageContainer
      title="Platform Settings"
      subtitle="Configure application preferences, notifications, and environment settings."
    >
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-base">Exchange & Match Preferences</CardTitle>
            </div>
            <CardDescription>Configure how EnhanceUs pairs your goals with potential exchange partners.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Matching algorithm criteria and skill depth filters will be configurable here.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-base">Notifications & Activity Alerts</CardTitle>
            </div>
            <CardDescription>Manage updates for goal milestones and match proposals.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Notification preferences configured for future sprint integrations.</p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default SettingsPage;
