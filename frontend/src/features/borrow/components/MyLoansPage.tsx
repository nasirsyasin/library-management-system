import { getBorrowErrorMessage, useLoans, useReturnLoan } from "../hooks/useLoans";
import { LoanRow } from "./LoanRow";

interface MyLoansPageProps {
  memberId: string;
}

export function MyLoansPage({ memberId }: MyLoansPageProps) {
  const loansQuery = useLoans(memberId);
  const returnLoan = useReturnLoan(memberId);
  const loans = loansQuery.data ?? [];
  const activeLoans = loans.filter((loan) => loan.returnDate === null);
  const returnedLoans = loans.filter((loan) => loan.returnDate !== null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">My Borrowed Books</h1>
      {loansQuery.isPending ? <p role="status" className="mt-5">Loading Loans...</p> : null}
      {loansQuery.isError ? (
        <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          Loans could not be loaded. Check your connection and try again.
        </p>
      ) : null}
      {returnLoan.isError ? (
        <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          {getBorrowErrorMessage(returnLoan.error)}
        </p>
      ) : null}
      {!loansQuery.isPending && !loansQuery.isError && activeLoans.length === 0 ? (
        <p className="mt-5 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
          You have no active Loans. Browse the Catalog to borrow a Book.
        </p>
      ) : null}
      <section aria-label="Active Loans" className="mt-3">
        {activeLoans.map((loan) => (
          <LoanRow
            key={loan.borrowId}
            loan={loan}
            pending={returnLoan.isPending && returnLoan.variables === loan.borrowId}
            onReturn={(borrowId) => returnLoan.mutate(borrowId)}
          />
        ))}
      </section>
      {returnedLoans.length > 0 ? (
        <section aria-label="Returned Books" className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900">Returned Books</h2>
          {returnedLoans.map((loan) => (
            <LoanRow key={loan.borrowId} loan={loan} pending={false} onReturn={() => undefined} />
          ))}
        </section>
      ) : null}
    </main>
  );
}