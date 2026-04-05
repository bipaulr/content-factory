'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { GradientButton } from '@/components/gradient-button';
import { StatusBadge } from '@/components/status-badge';
import { ToastProvider } from '@/components/toast-provider';
import { getCampaigns, type Campaign } from '@/lib/api';
import type { CampaignStatus } from '@/lib/types';

type SortField = 'created_at' | 'status' | 'duration';
type SortDirection = 'asc' | 'desc';

export default function HistoryPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const data = await getCampaigns();
        setCampaigns(data);
      } catch (error) {
        console.log('[v Error loading campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  const filteredAndSortedCampaigns = useMemo(() => {
    let result = [...campaigns];

    // Filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [campaigns, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-[#808080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Campaign History</h1>
              <p className="text-[#b0b0b0]">
                View and manage all your content campaigns.
              </p>
            </div>
            <Link href="/campaign/new">
              <GradientButton variant="primary">
                New Campaign
              </GradientButton>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#808080]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
                className="bg-[#1a1a1a] border border-[#3a3a3a] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <span className="text-sm text-[#808080]">
              Showing {filteredAndSortedCampaigns.length} of {campaigns.length} campaigns
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin h-8 w-8 border-b-2 border-[#00d4ff]" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-24 bg-[#1a1a1a] border border-[#3a3a3a]">
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
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">
                        Campaign ID
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          Status
                          <SortIcon field="status" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">
                        <button
                          onClick={() => handleSort('created_at')}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          Created
                          <SortIcon field="created_at" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">
                        <button
                          onClick={() => handleSort('duration')}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          Duration
                          <SortIcon field="duration" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-[#808080]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedCampaigns.map((campaign) => (
                      <tr
                        key={campaign.id}
                        className="border-b border-[#3a3a3a] last:border-b-0 hover:bg-[#1e2021] transition-colors"
                      >
                        <td className="px-4 py-4">
                          <code className="text-sm text-[#00d4ff] font-mono">
                            {campaign.id}
                          </code>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="px-4 py-4 text-sm text-[#b0b0b0]">
                          {new Date(campaign.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-[#b0b0b0]">
                          {campaign.duration ? `${campaign.duration.toFixed(1)}s` : '-'}
                        </td>
                        <td className="px-4 py-4">
                          <Link href={`/campaign/${campaign.id}`}>
                            <GradientButton variant="outline" size="sm">
                              View Details
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
        </main>
      </div>
    </ToastProvider>
  );
}
