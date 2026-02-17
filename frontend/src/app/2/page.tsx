"use client";

import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { WarmLedger } from "@/components/dashboards/warm-ledger";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function DesignTrial2() {
  const { summary, monthly, forecast, anomalies, recurring, insights, loading, error, useTestData, toggleTestData } =
    useDashboardData();

  return (
    <div className="pt-12">
      <DesignTrialNavigator currentTrial={2} useTestData={useTestData} onToggleTestData={toggleTestData} />
      {loading ? (
        <div className="mx-auto max-w-3xl space-y-8">
          <Skeleton className="mx-auto h-20 w-64" />
          <Skeleton variant="chart" />
        </div>
      ) : error || !summary ? (
        <EmptyState
          title="No data yet"
          description={error || "Import some transactions to see your dashboard."}
          action={{ label: "Import CSV", href: "/import" }}
          secondaryAction={{ label: "Use Test Data", onClick: toggleTestData }}
        />
      ) : (
        <WarmLedger
          summary={summary}
          monthly={monthly}
          forecast={forecast}
          anomalies={anomalies}
          recurring={recurring}
          insights={insights}
        />
      )}
    </div>
  );
}
