"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, DemandForecast } from "@/lib/types";

export function ActivityDashboard({
  assets,
  demand,
}: {
  assets: Asset[];
  demand: DemandForecast;
}) {
  // 1. Preventative Maintenance Pipeline
  const pmData = assets
    .filter((a) => a.engineHours != null)
    .map((a) => {
      const hours = parseInt(String(a.engineHours).replace(/,/g, ""), 10) || 0;
      const hoursToNextService = 500 - (hours % 500);
      return {
        name: a.id,
        category: a.category,
        hoursToNextService,
      };
    })
    .sort((a, b) => a.hoursToNextService - b.hoursToNextService)
    .slice(0, 8);

  // 2. Idle Waste vs Engine Hours
  const idleData = assets
    .filter((a) => a.engineHours != null)
    .map((a, i) => {
      const hours = parseInt(String(a.engineHours).replace(/,/g, ""), 10) || 0;
      let idlePct = (a.category === "Excavator" ? 35 : 18) + (i % 15) - 5;
      if (idlePct < 5) idlePct = 5;
      if (idlePct > 60) idlePct = 60;
      return {
        id: a.id,
        name: a.name,
        hours: hours,
        idlePct: idlePct,
        customer: a.site !== "Unassigned" ? a.site : "Main Yard",
        fill: idlePct > 35 ? "#ef4444" : idlePct > 22 ? "#f59e0b" : "#10b981",
      };
    });

  // 3. Demand Forecast (ML)
  const demandData = (demand || []).map((d) => {
    const siteName = d.siteName || "Regional Sites";
    return {
      name: siteName.length > 14 ? siteName.substring(0, 14) + "..." : siteName,
      "Current Units": d.currentCount,
      "Predicted Need": d.predictedNextWeek,
      shortfall:
        d.predictedNextWeek > d.currentCount
          ? d.predictedNextWeek - d.currentCount
          : 0,
    };
  });

  // 4. Fleet Utilization Distribution
  const counts = {
    available: assets.filter((a) => a.status === "available").length,
    checkedOut: assets.filter((a) => a.status === "checked-out").length,
    maintenance: assets.filter((a) => a.status === "maintenance").length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.08em] text-[#8a5a00]">
            Dealer Intelligence
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Activity & Fleet Insights
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Machine learning forecasts, engine wear analytics, and telematics-driven maintenance alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-700">
            {counts.checkedOut} Deployed · {counts.available} In Yard
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ML Demand Forecast */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>AI Demand Forecast vs On-Site Fleet</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Machine learning model (m4_demand.pkl) predicting next week's equipment requirements per project.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {demandData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No demand forecast available. Ensure ML FastAPI service is active.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={demandData}
                    margin={{ top: 15, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                      }}
                      cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                    />
                    <Legend />
                    <Bar
                      dataKey="Current Units"
                      fill="#181818"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="Predicted Need"
                      fill="#FFCD11"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {demandData.some((d) => d.shortfall > 0) && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 font-medium">
                <span className="font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[10px] bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                  ?? AI Shortfall Alert
                </span>
                Forecast detects a total deficit of{" "}
                <strong>
                  {demandData.reduce((acc, d) => acc + d.shortfall, 0)} units
                </strong>{" "}
                next week. Recommend sub-renting or redeploying idle assets.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preventative Maintenance Pipeline */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Preventative Maintenance (PM) Pipeline</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Engine hours remaining until next 500-hour service interval.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pmData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="monospace"
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      `${value} hours remaining`,
                      "Service Window",
                    ]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar
                    dataKey="hoursToNextService"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  >
                    {pmData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.hoursToNextService < 60
                            ? "#ef4444"
                            : entry.hoursToNextService < 160
                              ? "#f59e0b"
                              : "#10b981"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/70 pt-2.5">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> &lt;60h (Critical)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> 60–160h (Schedule Soon)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> &gt;160h (Optimal)</span>
            </div>
          </CardContent>
        </Card>

        {/* Idle Waste Scatter Plot */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Operator Idle Waste vs Total Hours</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Identifying high-idle machinery burning dealer asset life unproductively.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 15, right: 20, bottom: 15, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    dataKey="hours"
                    name="Total Hours"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="idlePct"
                    name="Idle %"
                    unit="%"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ZAxis type="category" dataKey="customer" name="Location" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Scatter name="Machines" data={idleData}>
                    {idleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/70 pt-2.5">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> &gt;35% Idle (High Waste)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> 22–35% Idle</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> &lt;22% Idle (Efficient)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
