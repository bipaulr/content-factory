import { cn } from '@/lib/utils';
import type { CampaignStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  completed: {
    label: 'Completed',
    className: 'bg-[#06ffa5] text-black border-[#06ffa5]',
  },
  processing: {
    label: 'In Progress',
    className: 'bg-[#00d4ff] text-black border-[#00d4ff]',
  },
  failed: {
    label: 'Failed',
    className: 'bg-[#ff4757] text-black border-[#ff4757]',
  },
  pending: {
    label: 'Pending',
    className: 'bg-[#ffd60a] text-black border-[#ffd60a]  ',
  },
} as const;

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['pending'];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
