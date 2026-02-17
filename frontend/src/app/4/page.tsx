"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { Mosaic } from "@/components/dashboards/layouts/mosaic";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function Layout4() {
  const { summary, monthly, forecast, anomalies, recurring, insights, habits, daily, merchants, cards, loading, error, useTestData, toggleTestData } =
    useDashboardData();

  return (
    <ThemeProvider>
      <div className="pt-12">
        <DesignTrialNavigator currentLayout={4} useTestData={useTestData} onToggleTestData={toggleTestData} />
        {loading ? (
          <div className="mx-auto max-w-6xl space-y-8 px-6">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
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
          <Mosaic
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
