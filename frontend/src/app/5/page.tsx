"use client";

import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { Pulse } from "@/components/dashboards/layouts/pulse";
import { ThemedSkeleton } from "@/components/ui/themed-skeleton";
import { ThemedEmptyState } from "@/components/ui/themed-empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function Layout5() {
  const { summary, monthly, forecast, anomalies, recurring, insights, habits, daily, merchants, cards, loading, error, useTestData, toggleTestData } =
    useDashboardData();

  return (
    <div className="pt-12">
      <DesignTrialNavigator currentLayout={5} useTestData={useTestData} onToggleTestData={toggleTestData} />
      {loading ? (
        <div className="mx-auto max-w-4xl space-y-4">
          <ThemedSkeleton variant="card" className="h-40" />
          <ThemedSkeleton variant="chart" />
          <div className="grid grid-cols-2 gap-4">
            <ThemedSkeleton variant="card" />
            <ThemedSkeleton variant="card" />
          </div>
        </div>
      ) : error || !summary ? (
        <ThemedEmptyState
          variant="import"
          title="No data yet"
          description={error || "Import some transactions to see your dashboard."}
          action={{ label: "Import CSV", href: "/import" }}
          secondaryAction={{ label: "Use Test Data", onClick: toggleTestData }}
        />
      ) : (
        <Pulse
          summary={summary}
          monthly={monthly}
          forecast={forecast}
          anomalies={anomalies}
          recurring={recurring}
          insights={insights}
          habits={habits}
          daily={daily}
          merchants={merchants}
          cards={cards}
        />
      )}
    </div>
  );
}
