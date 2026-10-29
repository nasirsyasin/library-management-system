import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router-dom";
import { useBook } from "../../catalog/hooks/useBooks";
import { borrowRequestsApi } from "../api";
import { useAuth } from "../../../shared/auth/useAuth";

function RequestBookTitle({ bookId }: { bookId: string }) {
  const book = useBook(bookId);
  return <span>{book.data?.title ?? (book.isError ? "Book details unavailable" : "Loading book…")}</span>;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data.error || "The borrow request could not be updated.";
  }
  return "The borrow request could not be updated.";
}

export function BorrowRequestsPage() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ["admin", "borrow-requests"],
    queryFn: borrowRequestsApi.list,
    refetchInterval: 10_000,
  });
  const updateRequest = useMutation({
    mutationFn: ({ borrowId, decision }: { borrowId: string; memberId: string; decision: "approve" | "reject" }) =>
      decision === "approve" ? borrowRequestsApi.approve(borrowId) : borrowRequestsApi.reject(borrowId),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "borrow-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["borrow", "loans", variables.memberId] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "books"] }),
      ]);
    },
  });
  const borrowRequests = requests.data ?? [];

  return (
    <main className="min-h-screen bg-[#0b0a09] px-4 pb-10 pt-5 text-[#e7e5e4] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/librarian/catalog" className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400 hover:text-emerald-300">Library System</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Borrow Requests</h1>
            <p className="mt-1 text-sm text-[#99938e]">Approve a request to assign an available copy to the member.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/librarian/catalog" className="rounded-md border border-[#302d2b] px-3 py-2 text-sm text-[#c8c4c0] hover:bg-[#211f1d]">Catalog</Link>
            <Link to="/librarian/member-requests" className="rounded-md border border-[#302d2b] px-3 py-2 text-sm text-[#c8c4c0] hover:bg-[#211f1d]">Member Requests</Link>
            <button type="button" onClick={logout} className="rounded-md border border-[#302d2b] px-3 py-2 text-sm text-[#c8c4c0] hover:bg-[#211f1d]">Sign out</button>
          </div>
        </header>

        <section className="mb-4 flex items-center justify-between rounded-lg bg-[#1a1918] px-4 py-3">
          <span className="text-sm text-[#aaa6a2]">Pending borrow requests</span>
          <span className="rounded-full bg-amber-950 px-3 py-1 text-sm font-semibold text-amber-300">{requests.isPending ? "—" : borrowRequests.length}</span>
        </section>

        {updateRequest.isSuccess ? (
          <div role="status" className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            Request {updateRequest.variables?.decision === "approve" ? "approved and book assigned" : "rejected"}.
          </div>
        ) : null}
        {updateRequest.isError ? (
          <div role="alert" className="mb-4 rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {getErrorMessage(updateRequest.error)}
          </div>
        ) : null}
        {requests.isError ? (
          <div role="alert" className="mb-4 rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            Borrow requests could not be loaded. Refresh to try again.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-[#302d2b] bg-[#141312]">
          {requests.isPending ? (
            <p role="status" className="px-5 py-12 text-center text-sm text-[#aaa6a2]">Loading borrow requests…</p>
          ) : requests.isError ? null : borrowRequests.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-[#aaa6a2]">There are no pending borrow requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[690px] text-left text-sm">
                <thead className="bg-[#1d1b19] text-xs uppercase tracking-wide text-[#99938e]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member ID</th>
                    <th className="px-4 py-3 font-medium">Book ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292624]">
                  {borrowRequests.map((request) => (
                    <tr key={request.borrowId} className="hover:bg-[#1a1918]">
                      <td className="px-4 py-3 font-medium text-[#e7e5e4]">{request.memberId}</td>
                      <td className="px-4 py-3 text-[#b8b2ad]">
                        <RequestBookTitle bookId={request.bookId} />
                        <span className="mt-1 block text-xs text-[#85807b]">{request.bookId}</span>
                      </td>
                      <td className="px-4 py-3 text-amber-300">Pending</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updateRequest.isPending}
                            onClick={() => updateRequest.mutate({ borrowId: request.borrowId, memberId: request.memberId, decision: "approve" })}
                            className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                          >
                            {updateRequest.isPending && updateRequest.variables?.borrowId === request.borrowId ? "Approving…" : "Approve & assign"}
                          </button>
                          <button
                            type="button"
                            disabled={updateRequest.isPending}
                            onClick={() => updateRequest.mutate({ borrowId: request.borrowId, memberId: request.memberId, decision: "reject" })}
                            className="rounded-md border border-red-900 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-950/50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
