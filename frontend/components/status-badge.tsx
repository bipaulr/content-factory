import { cn } from '@/lib/utils';
import type { CampaignStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  completed: {
    label: 'Completed',
    className: 'bg-[#06ffa5]/10 text-[#06ffa5] border-[#06ffa5]/50',
  },
  processing: {
    label: 'In Progress',
    className: 'bg-[#ffd60a]/10 text-[#ffd60a] border-[#ffd60a]/50',
  },
  'in_progress': {
    label: 'In Progress',
    className: 'bg-[#ffd60a]/10 text-[#ffd60a] border-[#ffd60a]/50',
  },
  failed: {
    label: 'Failed',
    className: 'bg-[#ff006e]/10 text-[#ff006e] border-[#ff006e]/50',
  },
  pending: {
    label: 'Pending',
    className: 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/50',
  },
} as const;

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['pending'];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
