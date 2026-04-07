'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { GradientButton } from '@/components/gradient-button';
import { MetricCard } from '@/components/metric-card';
import { StatusBadge } from '@/components/status-badge';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { getAnalytics, getCampaigns, type Analytics, type Campaign } from '../../lib/api';
import { useRequireAuth } from '@/hooks/useAuth';
import { useLocalAuth } from '@/providers/auth-provider';

function AnalyticsContent() {
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { data: session } = useSession();
  const { localUser } = useLocalAuth();
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get a user identifier to detect user changes
  const userIdentifier = session?.user?.email || localUser?.email;

  const loadDataAsync = async (isRefresh: boolean = false) => {
    try {
      const [analyticsData, campaignsData] = await Promise.all([
        getAnalytics(),
        getCampaigns(),
      ]);
      setAnalytics(analyticsData);
      setRecentCampaigns(campaignsData.slice(0, 5));
    } catch (error) {
      console.log('Error loading analytics:', error);
      if (isRefresh) {
        showToast('error', 'Failed to refresh analytics data.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    // Reset state when user changes
    setAnalytics(null);
    setRecentCampaigns([]);
    setLoading(true);

    const abortController = new AbortController();

    const loadDataSafely = async () => {
      try {
        const [analyticsData, campaignsData] = await Promise.all([
          getAnalytics(),
          getCampaigns(),
        ]);
        if (!abortController.signal.aborted) {
          setAnalytics(analyticsData);
          setRecentCampaigns(campaignsData.slice(0, 5));
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.log('Error loading analytics:', error);
          showToast('error', 'Failed to load analytics data.');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadDataSafely();
    
    return () => {
      abortController.abort();
    };
  }, [isAuthenticated, authLoading, userIdentifier, showToast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDataAsync(true);
    showToast('info', 'Analytics refreshed!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin h-8 w-8 border-b-2 border-[#00d4ff]" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-[#b0b0b0]">
              Track your content generation performance and metrics.
            </p>
          </div>
          <GradientButton
            variant="secondary"
            onClick={handleRefresh}
            isLoading={refreshing}
          >
            Refresh Data
          </GradientButton>
        </div>

        {analytics && (
          <>
            {/* Key Metrics */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Key Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Campaigns"
                  value={analytics.total_campaigns}
                  variant="cyan"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Completed"
                  value={analytics.completed_campaigns}
                  variant="green"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Failed"
                  value={analytics.failed_campaigns}
                  variant="pink"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Success Rate"
                  value={`${(analytics.success_rate ?? 0).toFixed(1)}%`}
                  variant="yellow"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  }
                />
                {/* <MetricCard
                  label="Avg. Time"
                  value={`${(analytics.avg_completion_time_seconds ?? 0).toFixed(1)}s`}
                  variant="orange"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Avg. Revisions"
                  value={(analytics.avg_revisions ?? 0).toFixed(1)}
                  variant="purple"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                /> */}
              </div>
            </section>

            {/* Regeneration Stats */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Regeneration Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1e2021] border border-[#3a3a3a] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#00d4ff]/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#00d4ff]">{analytics.regenerations.blog}</p>
                      <p className="text-xs text-[#808080]">Blog Regenerations</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1e2021] border border-[#3a3a3a] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#3a86ff]/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#3a86ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#3a86ff]">{analytics.regenerations.social}</p>
                      <p className="text-xs text-[#808080]">Social Regenerations</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1e2021] border border-[#3a3a3a] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#8338ec]/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#8338ec]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#8338ec]">{analytics.regenerations.email}</p>
                      <p className="text-xs text-[#808080]">Email Regenerations</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1e2021] border border-[#3a3a3a] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#ffd60a]/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#ffd60a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#ffd60a]">{analytics.regenerations.total}</p>
                      <p className="text-xs text-[#808080]">Total Regenerations</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Recent Campaigns */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Campaigns</h2>
            <Link href="/history" className="text-sm text-[#00d4ff] hover:underline">
              View All
            </Link>
          </div>

          {recentCampaigns.length === 0 ? (
            <div className="text-center py-12 bg-[#1a1a1a] border border-[#3a3a3a]">
              <p className="text-[#808080] mb-4">No campaigns yet. Create one to get started.</p>
              <Link href="/campaign/new">
                <GradientButton variant="primary">Create Campaign</GradientButton>
              </Link>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#3a3a3a] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#3a3a3a]">
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">Campaign ID</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">Created</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">Duration</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCampaigns.map((campaign) => (
                      <tr
                        key={campaign.campaign_id}
                        className="border-b border-[#3a3a3a] last:border-b-0 hover:bg-[#1e2021] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <code className="text-sm text-[#00d4ff] font-mono">
                            {campaign.campaign_id}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#b0b0b0]">
                          {new Date(campaign.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#b0b0b0]">
                          {campaign.duration ? `${campaign.duration.toFixed(1)}s` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/campaign/${campaign.campaign_id}`}>
                            <GradientButton variant="outline" size="sm">
                              View
                            </GradientButton>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ToastProvider>
      <AnalyticsContent />
    </ToastProvider>
  );
}
