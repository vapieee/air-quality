import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function TrendChart({
  title,
  data,
  dataKey,
  color,
  unit = "",
  decimals = 0,
}) {
  const formatValue = (value) => {
    const number = Number(value);

    if (Number.isNaN(number)) {
      return value;
    }

    return `${number.toFixed(decimals)}${unit}`;
  };

  return (
    <div className="trend-chart">
      <div className="trend-chart-header">
        <h5>{title}</h5>
        <span>Next 3 hours</span>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 12,
            left: -20,
            bottom: 0,
          }}
        >
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10 }}
            domain={["dataMin - 5", "dataMax + 5"]}
          />

          <Tooltip
            formatter={(value) => [formatValue(value), title]}
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
            }}
          />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={{
              r: 4,
              fill: color,
              strokeWidth: 2,
              stroke: "#ffffff",
            }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendChart;