"use client";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Deep dive into your spending patterns"
      />
      <EmptyState
        icon={<span>📊</span>}
        title="No data to analyze"
        description="Import some transactions first to see analytics."
        action={{ label: "Import CSV", href: "/import" }}
      />
    </div>
  );
}
