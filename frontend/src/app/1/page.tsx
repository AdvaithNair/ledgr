"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { ZenFlow } from "@/components/dashboards/layouts/zen-flow";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function Layout1() {
  const { summary, monthly, forecast, anomalies, recurring, insights, habits, daily, merchants, cards, loading, error, useTestData, toggleTestData } =
    useDashboardData();

  return (
    <ThemeProvider>
      <div className="pt-12">
        <DesignTrialNavigator currentLayout={1} useTestData={useTestData} onToggleTestData={toggleTestData} />
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
          <ZenFlow
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
    </ThemeProvider>
  );
}
