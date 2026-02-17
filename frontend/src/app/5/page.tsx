"use client";

import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { VisualFirst } from "@/components/dashboards/visual-first";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function DesignTrial5() {
  const { summary, monthly, cards, forecast, daily, loading, error } =
    useDashboardData();

  return (
    <div className="pt-12">
      <DesignTrialNavigator currentTrial={5} />
      {loading ? (
        <div className="space-y-4">
          <Skeleton variant="chart" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton variant="chart" />
            <Skeleton variant="chart" />
          </div>
          <Skeleton variant="chart" />
        </div>
      ) : error || !summary ? (
        <EmptyState
          title="No data yet"
          description={error || "Import some transactions to see visualizations."}
          action={{ label: "Import CSV", href: "/import" }}
        />
      ) : (
        <VisualFirst
          summary={summary}
          monthly={monthly}
          cards={cards}
          forecast={forecast}
          daily={daily}
        />
      )}
    </div>
  );
}
