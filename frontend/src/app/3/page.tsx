"use client";

import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { StoryMode } from "@/components/dashboards/story-mode";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function DesignTrial3() {
  const { summary, forecast, anomalies, merchants, habits, recurring, loading, error } =
    useDashboardData();

  return (
    <div className="pt-12">
      <DesignTrialNavigator currentTrial={3} />
      {loading ? (
        <div className="mx-auto max-w-2xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton variant="chart" />
        </div>
      ) : error || !summary ? (
        <EmptyState
          title="No data yet"
          description={error || "Import some transactions to see your story."}
          action={{ label: "Import CSV", href: "/import" }}
        />
      ) : (
        <StoryMode
          summary={summary}
          forecast={forecast}
          anomalies={anomalies}
          merchants={merchants}
          habits={habits}
          recurring={recurring}
        />
      )}
    </div>
  );
}
