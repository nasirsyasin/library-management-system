import { BookAvailability } from '../types';

interface AvailabilityBadgeProps {
  availability: BookAvailability;
}

export function AvailabilityBadge({ availability }: AvailabilityBadgeProps) {
  const isAvailable = availability === 'available';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        isAvailable
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
    >
      {isAvailable ? 'Available' : 'Checked Out'}
    </span>
  );
}
