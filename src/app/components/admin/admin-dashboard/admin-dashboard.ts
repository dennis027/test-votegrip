import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard {

  // Admin statistics
  adminStats = [
    {
      icon: 'users',
      value: '12,847',
      label: 'Total Users',
      sub: 'Active users',
      color: 'blue',
      trend: '+12%',
      trendUp: true
    },
    {
      icon: 'server',
      value: '68%',
      label: 'System Load',
      sub: 'Average CPU',
      color: 'green',
      trend: '-5%',
      trendUp: false
    },
    {
      icon: 'activity',
      value: '3,429',
      label: 'Active Sessions',
      sub: 'Current sessions',
      color: 'purple',
      trend: '+8%',
      trendUp: true
    },
    {
      icon: 'alert',
      value: '23',
      label: 'System Alerts',
      sub: 'Pending alerts',
      color: 'orange',
      trend: '-15%',
      trendUp: false
    }
  ];

  // Activity data for chart
  activityData = [
    { day: 'Mon', height: 100, value: 85 },
    { day: 'Tue', height: 100, value: 92 },
    { day: 'Wed', height: 100, value: 78 },
    { day: 'Thu', height: 100, value: 88 },
    { day: 'Fri', height: 100, value: 95 },
    { day: 'Sat', height: 100, value: 67 },
    { day: 'Sun', height: 100, value: 73 }
  ];

  // System health metrics
  healthMetrics = [
    { label: 'Database', value: 98, status: 'healthy' },
    { label: 'API Services', value: 95, status: 'healthy' },
    { label: 'File Storage', value: 87, status: 'warning' },
    { label: 'Network', value: 92, status: 'healthy' }
  ];

  // Recent activities
  recentActivities = [
    {
      id: 1,
      type: 'user',
      message: 'New user registration: john.doe@example.com',
      time: '2 minutes ago'
    },
    {
      id: 2,
      type: 'system',
      message: 'Database backup completed successfully',
      time: '15 minutes ago'
    },
    {
      id: 3,
      type: 'alert',
      message: 'High memory usage detected on server-2',
      time: '1 hour ago'
    },
    {
      id: 4,
      type: 'user',
      message: 'User profile updated: jane.smith@example.com',
      time: '2 hours ago'
    },
    {
      id: 5,
      type: 'system',
      message: 'Security scan completed - no issues found',
      time: '4 hours ago'
    }
  ];

  // Admin actions
  adminActions = [
    {
      id: 'add-user',
      icon: 'user-plus',
      label: 'Add User',
      color: 'blue'
    },
    {
      id: 'system-settings',
      icon: 'settings',
      label: 'Settings',
      color: 'purple'
    },
    {
      id: 'security-scan',
      icon: 'shield',
      label: 'Security',
      color: 'green'
    },
    {
      id: 'backup',
      icon: 'database',
      label: 'Backup',
      color: 'orange'
    }
  ];

  performAction(actionId: string) {
    // Implement action logic
  }

}
