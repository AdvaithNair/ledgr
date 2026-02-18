"use client";

import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { DailyJournal } from "@/components/dashboards/layouts/daily-journal";
import { ThemedSkeleton } from "@/components/ui/themed-skeleton";
import { ThemedEmptyState } from "@/components/ui/themed-empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function Layout3() {
  const { summary, monthly, forecast, anomalies, recurring, insights, habits, daily, merchants, cards, loading, error, useTestData, toggleTestData } =
    useDashboardData();

  return (
    <div className="pt-12">
      <DesignTrialNavigator currentLayout={3} useTestData={useTestData} onToggleTestData={toggleTestData} />
      {loading ? (
        <div className="mx-auto max-w-2xl space-y-8">
          <ThemedSkeleton variant="heading" className="mx-auto" />
          <ThemedSkeleton variant="text" />
          <ThemedSkeleton variant="chart" />
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
        <DailyJournal
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
