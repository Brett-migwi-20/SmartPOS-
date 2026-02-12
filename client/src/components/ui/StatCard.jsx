import { formatCurrency } from "../../utils/formatters.js";

function StatCard({ title, value, hint, tone = "neutral", currency = false }) {
  const formattedValue = currency ? formatCurrency(value) : value;

  return (
    <article className={`stat-card stat-card-${tone}`}>
      <p className="stat-title">{title}</p>
      <p className="stat-value">{formattedValue}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  );
}

export default StatCard;
