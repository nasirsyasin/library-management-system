import { MemberAccountStatus } from "../features/admin/api";

const statusClass: Record<MemberAccountStatus, string> = {
  pending: "border-amber-900 bg-amber-950/60 text-amber-300",
  approved: "border-emerald-900 bg-emerald-950/60 text-emerald-300",
  rejected: "border-red-900 bg-red-950/60 text-red-300",
};

export function MemberStatusBadge({ status }: { status: MemberAccountStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusClass[status]}`}>
      {status}
    </span>
  );
}
