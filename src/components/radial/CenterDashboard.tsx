interface CenterDashboardProps {
  time: Date;
  cpuPercent: number | null;
  showPercentages: boolean;
  hasActiveParent: boolean;
  onCenterClick: () => void;
}

const LOCALE = 'pt-BR';
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
  const timeText = time.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const dateText = time.toLocaleDateString(LOCALE, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const hasCpu = cpuPercent !== null;
  const safePercent = hasCpu ? cpuPercent : 0;
  const cpuText = hasCpu ? `${cpuPercent}%` : '—';
  const label = hasActiveParent
    ? `Voltar ao menu principal, ${timeText}, CPU ${cpuText}`
    : `Fechar menu, ${timeText}, CPU ${cpuText}`;

  return (
    <button
      className="center-dashboard"
      type="button"
      onClick={onCenterClick}
      title={hasActiveParent ? 'Voltar' : 'Fechar menu'}
      aria-label={label}
    >
      <svg className="center-progress" viewBox="0 0 160 160" aria-hidden="true">
        <circle className="center-track" cx="80" cy="80" r={CPU_RING_RADIUS} />
        <circle
          className="center-cpu"
          cx="80"
          cy="80"
          r={CPU_RING_RADIUS}
          strokeDasharray={CPU_RING_CIRCUMFERENCE}
          strokeDashoffset={
            CPU_RING_CIRCUMFERENCE - (CPU_RING_CIRCUMFERENCE * safePercent) / 100
          }
        />
      </svg>
      <span className="center-time">{timeText}</span>
      <span className="center-date">{dateText}</span>
      {showPercentages ? <strong>{cpuText}</strong> : null}
      <span className="center-focus-label">CPU</span>
    </button>
  );
}
