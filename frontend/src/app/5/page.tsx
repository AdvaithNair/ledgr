"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { Pulse } from "@/components/dashboards/layouts/pulse";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function Layout5() {
  const { summary, monthly, forecast, anomalies, recurring, insights, habits, daily, merchants, cards, loading, error, useTestData, toggleTestData } =
    useDashboardData();

  return (
    <ThemeProvider>
      <div className="pt-12">
        <DesignTrialNavigator currentLayout={5} useTestData={useTestData} onToggleTestData={toggleTestData} />
        {loading ? (
          <div className="mx-auto max-w-4xl space-y-4">
            <Skeleton className="h-40" />
            <Skeleton variant="chart" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        ) : error || !summary ? (
          <EmptyState
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
    </ThemeProvider>
  );
}
