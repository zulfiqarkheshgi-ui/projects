import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { PageTemplate } from '@/components/page-template';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter
} from 'recharts';
import {
  TrendingUp, BarChart3, PieChart as PieChartIcon, Activity,
  Download, Scale, Users, Gavel, FileText, Calendar,
  DollarSign, Clock, Target, Award, Briefcase, AlertTriangle, CheckCircle2
} from 'lucide-react';

interface AnalyticsProps {
  kpiMetrics: {
    activeCases: number;
    activeClients: number;
    totalRevenue: number;
    pendingTasks: number;
    caseSuccessRate: number;
    avgResolutionTime: number;
    collectionRate: number;
    billableHours: number;
  };
  dashboardWidgets: {
    recentCases: Array<any>;
    upcomingHearings: Array<any>;
    overdueInvoices: Array<any>;
    tasksByPriority: Array<{ priority: string; count: number }>;
  };
  financialReports: {
    yearlyRevenue: Array<{ year: number; month: number; month_name: string; revenue: number }>;
    outstandingAmount: number;
  };
  revenueAnalytics: any;
  caseAnalytics: {
    casesByType: Array<any>;
    casesByYear: Array<{ year: number; month: number; month_name: string; critical: number; high: number; medium: number; low: number }>;
  };
  customReports: any;
  planInfo: {
    name: string;
    storage_limit: number;
    max_users: number;
  };
  is_demo?: boolean;
}

export default function Analytics({
  kpiMetrics,
  dashboardWidgets,
  financialReports,
  revenueAnalytics,
  caseAnalytics,
  customReports,
  planInfo,
  is_demo = false
}: AnalyticsProps) {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTaskMonth, setSelectedTaskMonth] = useState(new Date().getMonth() + 1);
  const [selectedCaseYear, setSelectedCaseYear] = useState(new Date().getFullYear());

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  // Debug logging
  React.useEffect(() => {

  }, [is_demo, selectedCaseYear, caseAnalytics]);

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Analytics & Reports') }
  ];

  return (
    <PageTemplate
      title={t('Analytics & Reports')}
      breadcrumbs={breadcrumbs}
      description={t('Comprehensive analytics and reporting for your legal practice.')}
    >
      <Head title={t('Analytics & Reports')} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('Comprehensive insights into your legal practice')}</p>
            </div>
            <Badge variant="outline">{planInfo?.name || 'Free Plan'}</Badge>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: t('Success Rate'),    value: `${kpiMetrics?.caseSuccessRate || 0}%`,          icon: CheckCircle2,  iconCls: 'text-green-600',  blobCls: 'bg-green-50 dark:bg-green-900/30' },
            { label: t('Avg Resolution'),  value: `${kpiMetrics?.avgResolutionTime || 0} ${t('days')}`, icon: Clock,    iconCls: 'text-blue-600',   blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: t('Collection Rate'), value: `${kpiMetrics?.collectionRate || 0}%`,            icon: Target,       iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
            { label: t('Billable Hours'),  value: `${kpiMetrics?.billableHours || 0}h`,             icon: Activity,     iconCls: 'text-indigo-600', blobCls: 'bg-indigo-50 dark:bg-indigo-900/30' },
          ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
            <Card key={label} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
              <CardContent className="relative p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                  </div>
                  <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5`}>
                    <Icon className={`h-5 w-5 ${iconCls}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Financial Analytics */}
        <div className="grid gap-6 lg:grid-cols-1">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  {t('Yearly Revenue Trend')}
                </CardTitle>
                <Select value={selectedYear.toString()} onValueChange={(value) => {
                  setSelectedYear(parseInt(value));
                  router.get(route('analytics.index'), { year: parseInt(value) }, { preserveState: true });
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {(financialReports?.yearlyRevenue || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={financialReports.yearlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month_name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">{t('No revenue data available for')} {selectedYear}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


        </div>

        {/* Dashboard Widgets */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-blue-600" />
                  {t('Recent Cases')}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => router.get(route('cases.index'))}>
                  {t('View All')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(dashboardWidgets?.recentCases || []).length > 0 ? (
                  (dashboardWidgets.recentCases || []).slice(0, 5).map((caseItem, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{caseItem.title}</p>
                        <p className="text-xs text-muted-foreground">{caseItem.client?.name}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        caseItem.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        caseItem.status === 'pending' ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' :
                        caseItem.status === 'closed' ? 'bg-gray-50 text-gray-700 ring-gray-600/20' :
                        caseItem.status === 'on_hold' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                        'bg-blue-50 text-blue-700 ring-blue-600/20'
                      }`}>
                        {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center">
                      <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">{t('No recent cases')}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-red-600" />
                  {t('Overdue Invoices')}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => router.get(route('billing.invoices.index'))}>
                  {t('View All')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(dashboardWidgets?.overdueInvoices || []).length > 0 ? (
                  (dashboardWidgets.overdueInvoices || []).slice(0, 5).map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{invoice.client?.name}</p>
                      </div>
                     <span className="text-red-600 font-mono">
                        ${invoice.total_amount.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">{t('No overdue invoices')}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Case Analytics */}
        <div className="grid gap-6 lg:grid-cols-1">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  {t('Cases by Year')}
                </CardTitle>
                <Select value={selectedCaseYear.toString()} onValueChange={(value) => {
                  setSelectedCaseYear(parseInt(value));
                  router.get(route('analytics.index'), { case_year: parseInt(value) }, { preserveState: true });
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {(caseAnalytics?.casesByYear || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={caseAnalytics.casesByYear}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month_name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="critical"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      name="Critical"
                    />
                    <Line
                      type="monotone"
                      dataKey="high"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                      name="High"
                    />
                    <Line
                      type="monotone"
                      dataKey="medium"
                      stroke="#10b77f"
                      strokeWidth={3}
                      dot={{ fill: '#10b77f', strokeWidth: 2, r: 4 }}
                      name="Medium"
                    />
                    <Line
                      type="monotone"
                      dataKey="low"
                      stroke="#6b7280"
                      strokeWidth={3}
                      dot={{ fill: '#6b7280', strokeWidth: 2, r: 4 }}
                      name="Low"
                    />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">{t('No case data available for')} {selectedCaseYear}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks by Priority */}
        <div className="grid gap-6 lg:grid-cols-1">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  {t('Tasks by Priority')}
                </CardTitle>
                <Select value={selectedYear.toString()} onValueChange={(value) => {
                  setSelectedYear(parseInt(value));
                  router.get(route('analytics.index'), { year: parseInt(value) }, { preserveState: true });
                }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {(dashboardWidgets?.tasksByPriority || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboardWidgets.tasksByPriority}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Bar dataKey="critical" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="high" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="medium" fill="#10b77f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">{t('No task priority data')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Amount Alert */}
        {(financialReports?.outstandingAmount || 0) > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-10 w-10 text-orange-600" />
                <div>
                  <h3 className="font-medium text-orange-900 dark:text-orange-100">
                    {t('Amount Alert')}
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-200 font-mono">
                    ${(financialReports?.outstandingAmount || 0).toLocaleString()} {t('in unpaid invoices')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  );
}
