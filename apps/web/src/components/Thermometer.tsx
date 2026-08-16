import { money } from '../lib/publicApi';

type Props = {
  raised: number;
  target: number;
  currency?: string;
  donors?: number;
  compact?: boolean;
  label?: string;
};

export default function Thermometer({ raised, target, currency = 'USD', donors, compact, label }: Props) {
  const pct = Math.min(100, Math.round((raised / Math.max(1, target)) * 100));
  return (
    <div className={compact ? 'thermo thermo--compact' : 'thermo'}>
      {!compact && <p className="thermoLabel">{label || 'Campaign progress'}</p>}
      <div className="thermoTrack" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="thermoFill" style={{ width: `${pct}%` }} />
      </div>
      <div className="thermoMeta">
        <strong>
          {money(raised, currency)} raised
        </strong>
        <span>
          of {money(target, currency)} · {pct}%
          {typeof donors === 'number' ? ` · ${donors} donors` : ''}
        </span>
      </div>
    </div>
  );
}
