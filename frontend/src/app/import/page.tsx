"use client";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Import"
        description="Upload CSV files from your credit cards"
      />
      <EmptyState
        icon={<span>📤</span>}
        title="No imports yet"
        description="Upload a CSV file from your credit card statement to get started."
      />
    </div>
  );
}
