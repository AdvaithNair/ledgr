"use client";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function TransactionsPage() {
  return (
    <div>
      <PageHeader
        title="Transactions"
        description="All your spending in one place"
      />
      <EmptyState
        icon={<span>📋</span>}
        title="No transactions yet"
        description="Import a CSV file to see your transactions here."
        action={{ label: "Import CSV", href: "/import" }}
      />
    </div>
  );
}
