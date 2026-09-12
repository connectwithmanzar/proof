type WeightSparklineProps = {
  values: number[];
};

export function WeightSparkline({ values }: WeightSparklineProps) {
  if (values.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Your last 8 weights will draw here.
      </p>
    );
  }

  if (values.length === 1) {
    return (
      <p className="text-sm text-zinc-500">
        One more check-in unlocks the trend.
      </p>
    );
  }

  const width = 320;
  const height = 72;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = pad + (index / (values.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (value - min) / span) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-16 w-full"
      role="img"
      aria-label="Weight trend of last check-ins"
    >
      <polyline
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
