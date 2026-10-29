import { useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MemberStatusBadge } from "../../../components/MemberStatusBadge";
import { useAuth } from "../../../shared/auth/useAuth";
import { MemberRequest, memberRequestsApi } from "../api";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data.error || "The member request could not be updated.";
  }
  return "The member request could not be updated.";
}

function formatRegistrationDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

export function MemberRequestsPage() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MemberRequest | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const requests = useQuery({
    queryKey: ["admin", "member-requests"],
    queryFn: memberRequestsApi.list,
  });
  const updateStatus = useMutation({
    mutationFn: ({ memberId, decision }: { memberId: string; decision: "approve" | "reject" }) =>
      decision === "approve" ? memberRequestsApi.approve(memberId) : memberRequestsApi.reject(memberId),
    onSuccess: async (_result, variables) => {
      setActionError("");
      setActionMessage(`Registration ${variables.decision === "approve" ? "approved" : "rejected"}.`);
      setConfirmReject(false);
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "member-requests"] });
    },
    onError: (error: unknown) => setActionError(getErrorMessage(error)),
  });
  const memberRequests = requests.data ?? [];
  const pendingCount = memberRequests.filter((request) => request.status === "pending").length;

  const handleDecision = (decision: "approve" | "reject") => {
    if (!selected || selected.status !== "pending" || updateStatus.isPending) return;
    setActionError("");
    updateStatus.mutate({ memberId: selected.memberId, decision });
  };

  return (
    <main className="min-h-screen bg-[#0b0a09] px-4 pb-10 pt-5 text-[#e7e5e4] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/librarian/catalog" className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400 hover:text-emerald-300">Library System</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Member Requests</h1>
            <p className="mt-1 text-sm text-[#99938e]">Review membership applications and account details.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/librarian/catalog" className="rounded-md border border-[#302d2b] px-3 py-2 text-sm text-[#c8c4c0] hover:bg-[#211f1d]">Catalog</Link>
            <Link to="/librarian/borrow-requests" className="rounded-md border border-[#302d2b] px-3 py-2 text-sm text-[#c8c4c0] hover:bg-[#211f1d]">Borrow Requests</Link>
            <button type="button" onClick={logout} className="rounded-md border border-[#302d2b] px-3 py-2 text-sm text-[#c8c4c0] hover:bg-[#211f1d]">Sign out</button>
          </div>
        </header>

        <section className="mb-4 flex items-center justify-between rounded-lg bg-[#1a1918] px-4 py-3">
          <span className="text-sm text-[#aaa6a2]">Pending registrations</span>
          <span className="rounded-full bg-amber-950 px-3 py-1 text-sm font-semibold text-amber-300">{requests.isPending ? "—" : pendingCount}</span>
        </section>

        {actionMessage && <div role="status" className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">{actionMessage}</div>}
        {actionError && <div role="alert" className="mb-4 rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{actionError}</div>}
        {requests.isError && <div role="alert" className="mb-4 rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">Member requests could not be loaded. Refresh to try again.</div>}

        <div className="overflow-hidden rounded-lg border border-[#302d2b] bg-[#141312]">
          {requests.isPending ? (
            <p role="status" className="px-5 py-12 text-center text-sm text-[#aaa6a2]">Loading member requests…</p>
          ) : requests.isError ? null : memberRequests.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-[#aaa6a2]">There are no member registrations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[690px] text-left text-sm">
                <thead className="bg-[#1d1b19] text-xs uppercase tracking-wide text-[#99938e]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Registered</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292624]">
                  {memberRequests.map((request) => (
                    <tr key={request.memberId} className="hover:bg-[#1a1918]">
                      <td className="px-4 py-3 font-medium text-[#e7e5e4]">{request.fullName}</td>
                      <td className="px-4 py-3 text-[#b8b2ad]">{request.email}</td>
                      <td className="px-4 py-3 text-[#99938e]">{formatRegistrationDate(request.createdAt)}</td>
                      <td className="px-4 py-3"><MemberStatusBadge status={request.status} /></td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => { setSelected(request); setConfirmReject(false); setActionError(""); }} className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !updateStatus.isPending) setSelected(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="request-details-title" className="w-full max-w-lg rounded-xl border border-[#393531] bg-[#171615] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="request-details-title" className="text-lg font-semibold">Registration details</h2>
                <p className="mt-1 text-sm text-[#99938e]">Review the submitted information before deciding.</p>
              </div>
              <MemberStatusBadge status={selected.status} />
            </div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wide text-[#85807b]">Full name</dt><dd className="mt-1 text-[#e7e5e4]">{selected.fullName}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[#85807b]">Email</dt><dd className="mt-1 break-all text-[#e7e5e4]">{selected.email}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[#85807b]">Phone</dt><dd className="mt-1 text-[#e7e5e4]">{selected.phone || "Not provided"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[#85807b]">Registered</dt><dd className="mt-1 text-[#e7e5e4]">{formatRegistrationDate(selected.createdAt)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-[#85807b]">Address</dt><dd className="mt-1 whitespace-pre-wrap text-[#e7e5e4]">{selected.address || "Not provided"}</dd></div>
            </dl>

            {confirmReject ? (
              <div role="alertdialog" aria-label="Confirm rejection" className="mt-6 rounded-lg border border-red-900 bg-red-950/30 p-4">
                <p className="text-sm font-medium text-red-200">Reject this member registration?</p>
                <p className="mt-1 text-xs text-red-300/80">This account will not be able to sign in.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" disabled={updateStatus.isPending} onClick={() => setConfirmReject(false)} className="rounded-md border border-[#49433e] px-3 py-2 text-sm text-[#d0cbc6] disabled:opacity-50">Cancel</button>
                  <button type="button" disabled={updateStatus.isPending} onClick={() => handleDecision("reject")} className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">{updateStatus.isPending ? "Rejecting…" : "Confirm rejection"}</button>
                </div>
              </div>
            ) : (
              <div className="mt-7 flex flex-wrap justify-end gap-2">
                <button type="button" disabled={updateStatus.isPending} onClick={() => setSelected(null)} className="rounded-md border border-[#49433e] px-3 py-2 text-sm text-[#d0cbc6] disabled:opacity-50">Close</button>
                {selected.status === "pending" && (
                  <>
                    <button type="button" disabled={updateStatus.isPending} onClick={() => setConfirmReject(true)} className="rounded-md border border-red-900 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/50 disabled:opacity-50">Reject</button>
                    <button type="button" disabled={updateStatus.isPending} onClick={() => handleDecision("approve")} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">{updateStatus.isPending ? "Approving…" : "Approve member"}</button>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
