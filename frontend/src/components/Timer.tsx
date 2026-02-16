interface TimerProps {
  timeRemaining: number;
  phase: string;
}

export default function Timer({ timeRemaining, phase }: TimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const percentage = phase === "FINAL"
    ? (timeRemaining / 60) * 100
    : (timeRemaining / 180) * 100;

  const color = percentage > 50
    ? "var(--success)"
    : percentage > 20
    ? "#EAB308"
    : "var(--danger)";

  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - percentage / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
      <svg width="120" height="120" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="var(--border)"
          strokeWidth="6"
        />
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
        <text
          x="50" y="45"
          textAnchor="middle"
          fill="var(--text)"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="20"
          fontWeight="600"
        >
          {minutes}:{seconds.toString().padStart(2, "0")}
        </text>
        <text
          x="50" y="62"
          textAnchor="middle"
          fill="var(--muted)"
          fontSize="10"
        >
          {phase}
        </text>
      </svg>
    </div>
  );
}
