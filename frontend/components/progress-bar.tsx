import { cn } from '@/lib/utils';

type ProgressVariant = 'cyan' | 'green' | 'pink' | 'yellow' | 'orange';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  className?: string;
}

const variantStyles: Record<ProgressVariant, string> = {
  cyan: 'bg-gradient-to-r from-[#00d4ff] to-[#3a86ff]',
  green: 'bg-gradient-to-r from-[#06ffa5] to-[#00d4ff]',
  pink: 'bg-gradient-to-r from-[#ff006e] to-[#ff8c42]',
  yellow: 'bg-gradient-to-r from-[#ffd60a] to-[#ff8c42]',
  orange: 'bg-gradient-to-r from-[#ff8c42] to-[#ffd60a]',
};

export function ProgressBar({
  value,
  max = 100,
  variant = 'cyan',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-[#808080] mt-1 text-right">{Math.round(percentage)}%</p>
      )}
    </div>
  );
}
