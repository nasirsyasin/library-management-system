interface ErrorStateProps {
  title?: string;
  message?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again in a moment.',
}: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-rose-600">{message}</p>
    </div>
  );
}
