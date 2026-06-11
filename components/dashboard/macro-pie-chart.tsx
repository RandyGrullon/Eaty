"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const MACRO_COLORS = {
  protein: "var(--chart-1)",
  carbs: "var(--chart-2)",
  fat: "var(--chart-4)",
};

interface MacroPieChartProps {
  macros: { protein: number; carbs: number; fat: number };
}

export function MacroPieChart({ macros }: MacroPieChartProps) {
  const data = [
    { name: "Proteína", value: macros.protein, color: MACRO_COLORS.protein },
    { name: "Carbos", value: macros.carbs, color: MACRO_COLORS.carbs },
    { name: "Grasa", value: macros.fat, color: MACRO_COLORS.fat },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">
        Sin datos de macros hoy
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={35}
          outerRadius={50}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            fontSize: "12px",
            fontWeight: "bold",
          }}
          itemStyle={{ padding: "2px 0" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
