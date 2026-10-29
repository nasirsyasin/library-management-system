import { BorrowingStatus, ReservationStatus } from '../types';

interface StatusBadgeProps {
  status: BorrowingStatus | ReservationStatus;
}

const styleMap: Record<string, string> = {
  active: 'bg-sky-100 text-sky-700 border-sky-200',
  'due-soon': 'bg-amber-100 text-amber-700 border-amber-200',
  overdue: 'bg-rose-100 text-rose-700 border-rose-200',
  returned: 'bg-slate-100 text-slate-700 border-slate-200',
  waiting: 'bg-violet-100 text-violet-700 border-violet-200',
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  notified: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  cancelled: 'bg-slate-200 text-slate-700 border-slate-300',
};

const labelMap: Record<string, string> = {
  active: 'Active',
  'due-soon': 'Due Soon',
  overdue: 'Overdue',
  returned: 'Returned',
  waiting: 'Waiting',
  available: 'Available',
  notified: 'Notified',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styleMap[status] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {labelMap[status] || status}
    </span>
  );
}
