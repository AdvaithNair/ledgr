"use client";

import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { ActionDashboard } from "@/components/dashboards/action-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function DesignTrial4() {
  const { summary, forecast, anomalies, habits, recurring, loading, error } =
    useDashboardData();

  return (
    <div className="pt-12">
      <DesignTrialNavigator currentTrial={4} />
      {loading ? (
        <div className="space-y-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : error || !summary ? (
        <EmptyState
          title="No data yet"
          description={error || "Import some transactions to see your action items."}
          action={{ label: "Import CSV", href: "/import" }}
        />
      ) : (
        <ActionDashboard
          summary={summary}
          forecast={forecast}
          anomalies={anomalies}
          habits={habits}
          recurring={recurring}
        />
      )}
    </div>
  );
}
