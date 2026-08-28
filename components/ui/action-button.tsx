// components/ui/action-button.tsx
'use client';

import { cn } from '@/lib/utils';
import { toast } from 'gooey-toast';
import { useRef, useState } from 'react';

interface ActionButtonProps {
  onAction: () => Promise<void>;
  idleLabel: React.ReactNode;
  loadingLabel?: React.ReactNode;
  successTitle: string;
  successDescription?: string;
  toastVariant?: 'success' | 'error' | 'warning' | 'info';
  errorTitle?: string;
  disabled?: boolean;
  highlighted?: boolean;
  className?: string;
  variant?: 'solid' | 'outline';
  size?: 'full' | 'icon';
}

export function ActionButton({
  onAction,
  idleLabel,
  loadingLabel = 'Processing...',
  successTitle,
  successDescription,
  toastVariant = 'success',
  errorTitle = 'Something went wrong',
  disabled = false,
  highlighted = false,
  className,
  variant = 'solid',
  size = 'full',
}: ActionButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBusy = status === 'loading';
  const isDisabled = disabled || isBusy;

  // The button's own fill color follows the toast variant too —
  // green for a normal success, red for a removal-type action.
  const fillColor = toastVariant === 'error' ? 'bg-red-500/80' : 'bg-green-500/80';
  const successBg = toastVariant === 'error' ? 'bg-red-500' : 'bg-green-500';

  const startFakeProgress = () => {
    setProgress(0);
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.15 : p));
    }, 120);
  };

  const stopFakeProgress = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) return;

    setStatus('loading');
    startFakeProgress();

    try {
      await onAction();

      stopFakeProgress();
      setProgress(100);
      setStatus('success');

      // Route to the matching toast method so the color matches the action's intent.
      toast[toastVariant]({ title: successTitle, description: successDescription });

      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 700);
    } catch (err) {
      stopFakeProgress();
      setProgress(0);
      setStatus('idle');

      const message = err instanceof Error ? err.message : errorTitle;
      toast.error({ title: errorTitle, description: message });
    }
  };

  if (size === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          'relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-colors duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variant === 'solid' && 'bg-orange-500 text-white hover:bg-orange-600',
          variant === 'outline' && 'bg-white text-orange-500 border border-orange-500 hover:bg-orange-50',
          highlighted && 'ring-2 ring-orange-500 ring-offset-1',
          className
        )}
      >
        {isBusy && (
          <span
            className={cn('absolute inset-x-0 bottom-0 transition-[height] duration-150 ease-out', fillColor)}
            style={{ height: `${progress}%` }}
            aria-hidden
          />
        )}
        {status === 'success' && <span className={cn('absolute inset-0', successBg)} aria-hidden />}
        <span className="relative z-10 flex items-center justify-center">
          {status === 'success' ? <CheckIcon /> : isBusy ? <Spinner /> : idleLabel}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        'relative w-full h-12 rounded-full overflow-hidden font-medium text-sm transition-colors duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variant === 'solid' && 'bg-orange-500 text-white hover:bg-orange-600',
        variant === 'outline' && 'bg-white text-orange-500 border border-orange-500 hover:bg-orange-50',
        highlighted && 'ring-2 ring-orange-500 ring-offset-2',
        className
      )}
    >
      {isBusy && (
        <span
          className={cn('absolute inset-y-0 left-0 transition-[width] duration-150 ease-out', fillColor)}
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      )}
      {status === 'success' && (
        <span className={cn('absolute inset-0 transition-opacity duration-300', successBg)} aria-hidden />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2 h-full">
        {status === 'success' ? (
          <>
            <CheckIcon />
            {successTitle}
          </>
        ) : isBusy ? (
          loadingLabel
        ) : (
          idleLabel
        )}
      </span>
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}