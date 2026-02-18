"use client";

import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { Meridian } from "@/components/dashboards/layouts/meridian";
import { ThemedSkeleton } from "@/components/ui/themed-skeleton";
import { ThemedEmptyState } from "@/components/ui/themed-empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function DashboardPage() {
  const {
    summary,
    monthly,
    forecast,
    anomalies,
    recurring,
    insights,
    habits,
    daily,
    merchants,
    cards,
    loading,
    error,
    useTestData,
    toggleTestData,
  } = useDashboardData();

  return (
    <div className="pt-14">
      <DesignTrialNavigator
        currentLayout={0}
        useTestData={useTestData}
        onToggleTestData={toggleTestData}
      />
      {loading ? (
        <div className="mx-auto max-w-4xl space-y-8 px-6 pt-12">
          <ThemedSkeleton variant="heading" className="mx-auto" />
          <ThemedSkeleton variant="chart" />
        </div>
      ) : error || !summary ? (
        <ThemedEmptyState
          variant="import"
          title="No data yet"
          description={
            error || "Import some transactions to see your dashboard."
          }
          action={{ label: "Import CSV", href: "/import" }}
          secondaryAction={{ label: "Use Test Data", onClick: toggleTestData }}
        />
      ) : (
        <Meridian
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
