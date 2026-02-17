"use client";

import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { CommandCenter } from "@/components/dashboards/command-center";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function DesignTrial1() {
  const { summary, monthly, merchants, cards, forecast, insights, anomalies, recurring, daily, loading, error } =
    useDashboardData();

  return (
    <div className="pt-12">
      <DesignTrialNavigator currentTrial={1} />
      {loading ? (
        <div className="space-y-4">
          <Skeleton variant="card" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton variant="chart" />
            <Skeleton variant="chart" />
          </div>
        </div>
      ) : error || !summary ? (
        <EmptyState
          title="No data yet"
          description={error || "Import some transactions to see your dashboard."}
          action={{ label: "Import CSV", href: "/import" }}
        />
      ) : (
        <CommandCenter
          summary={summary}
          monthly={monthly}
          merchants={merchants}
          cards={cards}
          forecast={forecast}
          insights={insights}
          anomalies={anomalies}
          recurring={recurring}
          daily={daily}
        />
      )}
    </div>
  );
}
