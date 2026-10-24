interface CenterDashboardProps {
  time: Date;
  cpuPercent: number;
  showPercentages: boolean;
  hasActiveParent: boolean;
  onCenterClick: () => void;
}

const CPU_RING_RADIUS = 64;
const CPU_RING_CIRCUMFERENCE = 2 * Math.PI * CPU_RING_RADIUS;

/** Relógio, data e uso de CPU no miolo do menu (também fecha/volta o menu). */
export function CenterDashboard({
  time,
  cpuPercent,
  showPercentages,
  hasActiveParent,
  onCenterClick,
}: CenterDashboardProps) {
  const timeText = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateText = time.toLocaleDateString([], {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  return (
    <button
      className="center-dashboard"
      type="button"
      onClick={onCenterClick}
      title={hasActiveParent ? 'Voltar' : 'Fechar menu'}
    >
      <svg className="center-progress" viewBox="0 0 160 160" aria-hidden="true">
        <circle className="center-track" cx="80" cy="80" r={CPU_RING_RADIUS} />
        <circle
          className="center-cpu"
          cx="80"
          cy="80"
          r={CPU_RING_RADIUS}
          strokeDasharray={CPU_RING_CIRCUMFERENCE}
          strokeDashoffset={CPU_RING_CIRCUMFERENCE - (CPU_RING_CIRCUMFERENCE * cpuPercent) / 100}
        />
      </svg>
      <span className="center-time">{timeText}</span>
      <span className="center-date">{dateText}</span>
      {showPercentages ? <strong>{cpuPercent}%</strong> : null}
      <span className="center-focus-label">CPU</span>
    </button>
  );
}
