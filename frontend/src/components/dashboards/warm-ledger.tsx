"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type {
  EnhancedSummaryStats,
  MonthlyData,
  ForecastData,
  CategoryAnomaly,
  RecurringTransaction,
  Insight,
} from "@/types";

interface WarmLedgerProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
}

export function WarmLedger({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
}: WarmLedgerProps) {
  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const activeRecurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );

  const vsAvg = summary.vs_avg_pct;
  const aboveOrBelow =
    vsAvg !== null && vsAvg !== undefined
      ? vsAvg >= 0
        ? "above"
        : "below"
      : null;
  const vsAvgAbs = vsAvg !== null && vsAvg !== undefined ? Math.abs(vsAvg) : 0;

  return (
    <div
      className="min-h-screen px-6 py-12"
      style={
        {
          "--warm-accent": "#D4A574",
          "--warm-muted": "rgba(212, 165, 116, 0.4)",
          "--warm-subtle": "rgba(212, 165, 116, 0.08)",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E"), radial-gradient(ellipse at center, rgba(212, 165, 116, 0.03) 0%, transparent 70%)`,
        } as React.CSSProperties
      }
    >
      <div className="max-w-3xl mx-auto">
        {/* Hero Section */}
        <motion.div
          className="py-16 text-center"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <p
            className="text-sm uppercase tracking-widest mb-4"
            style={{
              fontFamily: "var(--font-baskerville)",
              color: "var(--warm-muted)",
            }}
          >
            This Month
          </p>
          <p
            className="text-7xl font-bold mb-6"
            style={{
              fontFamily: "var(--font-cormorant)",
              color: "var(--warm-accent)",
            }}
          >
            {formatCurrency(summary.this_month)}
          </p>
          {aboveOrBelow && (
            <p
              className="text-sm mb-2"
              style={{
                fontFamily: "var(--font-baskerville)",
                color: "var(--warm-muted)",
              }}
            >
              {vsAvgAbs.toFixed(0)}% {aboveOrBelow} your average
            </p>
          )}
          {forecast && (
            <p
              className="text-sm"
              style={{
                fontFamily: "var(--font-baskerville)",
                color: "var(--warm-muted)",
              }}
            >
              projected to finish at{" "}
              <span className="font-mono">
                {formatCurrency(forecast.projections.recommended)}
              </span>
            </p>
          )}
        </motion.div>

        {/* Chart */}
        <div className="mb-12">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly?.monthly ?? []}>
              <defs>
                <linearGradient id="warmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="#D4A574"
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="100%"
                    stopColor="#D4A574"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tickFormatter={(v: string) => v.slice(5)}
                tick={{ fill: "rgba(212, 165, 116, 0.4)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#141419",
                  border: "1px solid rgba(212, 165, 116, 0.15)",
                  borderRadius: "6px",
                  color: "#D4A574",
                  fontFamily: "var(--font-baskerville)",
                }}
                labelStyle={{ color: "rgba(212, 165, 116, 0.6)" }}
                itemStyle={{ color: "#D4A574" }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#D4A574"
                fill="url(#warmGradient)"
                strokeWidth={1.5}
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Scroll Indicator */}
        <p
          className="text-center text-xs mb-12"
          style={{
            fontFamily: "var(--font-baskerville)",
            color: "var(--warm-muted)",
            letterSpacing: "0.15em",
          }}
        >
          ─── continue below ───
        </p>

        {/* Top Drivers */}
        {anomalies.length > 0 && (
          <>
            <hr
              className="max-w-xs mx-auto my-12"
              style={{ borderColor: "rgba(212, 165, 116, 0.1)" }}
            />
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2
                className="text-lg mb-8 text-center"
                style={{
                  fontFamily: "var(--font-baskerville)",
                  color: "var(--warm-accent)",
                }}
              >
                What&apos;s driving this?
              </h2>
              <div className="space-y-4">
                {anomalies.slice(0, 3).map((a) => (
                  <div
                    key={a.category}
                    className="flex items-center justify-between py-3 px-4 rounded-lg"
                    style={{ backgroundColor: "var(--warm-subtle)" }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-baskerville)",
                        color: "var(--warm-accent)",
                      }}
                    >
                      {a.category}
                    </span>
                    <div className="flex items-center gap-4">
                      <span
                        className="font-mono"
                        style={{ color: "var(--warm-accent)" }}
                      >
                        {formatCurrency(a.current_month)}
                      </span>
                      <span
                        className="text-sm font-mono"
                        style={{ color: "var(--warm-muted)" }}
                      >
                        +{a.pct_above_avg.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* Recurring Section */}
        {activeRecurring.length > 0 && (
          <>
            <hr
              className="max-w-xs mx-auto my-12"
              style={{ borderColor: "rgba(212, 165, 116, 0.1)" }}
            />
            <motion.div
              className="mb-12 text-center"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p
                className="font-mono text-3xl mb-2"
                style={{ color: "var(--warm-accent)" }}
              >
                {formatCurrency(activeRecurringTotal)}
              </p>
              <p
                className="text-sm"
                style={{
                  fontFamily: "var(--font-baskerville)",
                  color: "var(--warm-muted)",
                }}
              >
                across {activeRecurring.length} active subscription
                {activeRecurring.length !== 1 ? "s" : ""}
              </p>
            </motion.div>
          </>
        )}

        {/* Top Insight */}
        {insights?.[0] && (
          <>
            <hr
              className="max-w-xs mx-auto my-12"
              style={{ borderColor: "rgba(212, 165, 116, 0.1)" }}
            />
            <motion.div
              className="mb-12 text-center"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p
                className="text-sm leading-relaxed max-w-md mx-auto"
                style={{
                  fontFamily: "var(--font-baskerville)",
                  color: "var(--warm-muted)",
                }}
              >
                {insights[0].message}
              </p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
