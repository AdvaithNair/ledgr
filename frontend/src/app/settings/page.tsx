"use client";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage cards and preferences"
      />

      <div className="space-y-8">
        {/* User Config */}
        <Card>
          <h2 className="text-lg font-medium text-white">Your Name</h2>
          <p className="mt-1 text-sm text-white/50">
            Used to filter out authorized-user transactions that aren&apos;t
            yours. We use fuzzy matching against the member column in your CSV
            imports.
          </p>
          <div className="mt-4 flex gap-3">
            <input
              type="text"
              placeholder="Enter your name"
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
              disabled
            />
            <button
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black opacity-50"
              disabled
            >
              Save
            </button>
          </div>
        </Card>

        {/* Cards */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white">Cards</h2>
              <p className="mt-1 text-sm text-white/50">
                Manage your credit card configurations and CSV column mappings.
              </p>
            </div>
            <button
              className="rounded-lg border border-border px-4 py-2 text-sm text-white/50 opacity-50"
              disabled
            >
              Add Card
            </button>
          </div>
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <p className="text-sm text-white/40">
              Card management coming soon.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
