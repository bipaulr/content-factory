'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaSearch, FaEdit, FaCheck, FaFileExport } from 'react-icons/fa';
import { Navigation } from '@/components/navigation';
import { GradientButton } from '@/components/gradient-button';
import { MetricCard } from '@/components/metric-card';
import { StatusBadge } from '@/components/status-badge';
import { ToastProvider } from '@/components/toast-provider';
import { getCampaigns, getAnalytics, type Campaign, type Analytics } from '@/lib/api';

const features = [
  {
    title: 'AI Research',
    description: 'Automatically extract key facts and insights from your product descriptions.',
    icon: <FaSearch className="w-6 h-6" />,
    color: 'cyan',
  },
  {
    title: 'Content Generation',
    description: 'Create blog posts, social threads, and email teasers automatically.',
    icon: <FaEdit className="w-6 h-6" />,
    color: 'green',
  },
  {
    title: 'Quality Review',
    description: 'AI editor reviews and refines all content for consistency and quality.',
    icon: <FaCheck className="w-6 h-6" />,
    color: 'yellow',
  },
  {
    title: 'Multi-Channel Export',
    description: 'Export content ready for your blog, social media, and email campaigns.',
    icon: <FaFileExport className="w-6 h-6" />,
    color: 'pink',
  },
];

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  cyan: {
    bg: 'bg-[#0EBEF2]',
    border: '',
    text: 'text-black font-bold',
  },
  green: {
    bg: 'bg-[#06ffa5] opacity-90',
    border: ' ',
    text: 'text-black font-bold',
  },
  pink: {
    bg: 'bg-[#FFA9A8]',
    border: '',
    text: 'text-black font-bold',
  },
  yellow: {
    bg: 'bg-[#F6D25E]',
    border: ' ',
    text: 'text-black font-bold',
  },
  orange: {
    bg: 'bg-gradient-to-br from-[#ff8c42]/20 to-[#ff8c42]/5',
    border: 'border-[#ff8c42]/30',
    text: 'text-[#ff8c42]',
  },
  purple: {
    bg: 'bg-gradient-to-br from-[#8338ec]/20 to-[#8338ec]/5',
    border: 'border-[#8338ec]/30',
    text: 'text-[#8338ec]',
  },
  blue: {
    bg: 'bg-gradient-to-br from-[#3a86ff]/20 to-[#3a86ff]/5',
    border: 'border-[#3a86ff]/30',
    text: 'text-[#3a86ff]',
  },
};

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [campaignsData, analyticsData] = await Promise.all([
          getCampaigns(),
          getAnalytics(),
        ]);
        setCampaigns(campaignsData.slice(0, 5));
        setAnalytics(analyticsData);
      } catch (error) {
        console.log('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Hero Section */}
          <section className="text-center py-8 px-4">
            <h1 className="text-4xl md:text-[17rem] font-extrabold text-white -mb-4 text-balance">
              cofy.
            </h1>
            <p className="text-lg py-4 text-[#b0b0b0] mb-6">
              The AI-powered content factory for effortless multi-channel campaigns.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/campaign/new">
                <GradientButton variant="primary" size="lg">
                  Create New Campaign
                </GradientButton>
              </Link>
              <Link href="/history">
                <GradientButton variant="outline" size="lg">
                  View Campaign History
                </GradientButton>
              </Link>
            </div>
          </section>

          {/* Quick Stats */}
          {analytics && (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <MetricCard
                label="Total Campaigns"
                value={analytics.total_campaigns}
                variant="cyan"
              />
              <MetricCard
                label="Completed"
                value={analytics.completed_campaigns}
                variant="green"
              />
              <MetricCard
                label="Success Rate"
                value={`${(analytics.success_rate ?? 0).toFixed(1)}%`}
                variant="yellow"
              />
              <MetricCard
                label="Avg. Time"
                value={`${(analytics.avg_completion_time_seconds ?? 0).toFixed(1)}s`}
                variant="pink"
              />
            </section>
          )}

          {/* Features Grid */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => {
                const colors = colorClasses[feature.color];
                return (
                  <div
                    key={index}
                    className={`p-6 rounded-lg border ${colors.bg} ${colors.border} transition-all duration-300 hover:scale-[1.02]`}
                  >
                    <div className={`w-12 h-12 rounded-lg ${colors.bg} text-black flex items-center justify-center mb-4`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-bold text-black  mb-2">{feature.title}</h3>
                    <p className="text-sm text-black">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Campaigns */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Campaigns</h2>
              <Link href="/history" className="text-sm text-[#00d4ff] hover:underline">
                View All
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d4ff]" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 bg-[#1a1a1a] rounded-lg border border-[#3a3a3a]">
                <p className="text-[#808080] mb-4">No campaigns yet. Create one to get started.</p>
                <Link href="/campaign/new">
                  <GradientButton variant="primary">Create Campaign</GradientButton>
                </Link>
              </div>
            ) : (
              <div className="bg-[#1a1a1a] rounded-lg border border-[#3a3a3a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#3a3a3a]">
                        <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">Campaign ID</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">Status</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">Created</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr
                          key={campaign.id}
                          className="border-b border-[#3a3a3a] last:border-b-0 hover:bg-[#252525] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <code className="text-sm text-[#00d4ff] font-mono">
                              {campaign.id}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={campaign.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-[#b0b0b0]">
                            {new Date(campaign.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/campaign/${campaign.id}`}>
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
    </ToastProvider>
  );
}
