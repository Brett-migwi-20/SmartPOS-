import React from "react";
import { api } from "../api/http.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import SectionCard from "../components/ui/SectionCard.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { formatCurrency } from "../utils/formatters.js";

function ReportsPage() {
  const [days, setDays] = React.useState(30);
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadReports = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api.getReports(days);
      setData(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (loading) {
    return <p>Loading reports...</p>;
  }

  if (error) {
    return (
      <SectionCard title="Reports Error">
        <p className="form-error">{error}</p>
        <button className="btn btn-primary" onClick={loadReports} type="button">
          Retry
        </button>
      </SectionCard>
    );
  }

  const maxDailyRevenue = Math.max(...(data.dailyRevenue || []).map((row) => row.revenue), 0);
  const revenueScale = maxDailyRevenue || 1;

  return (
    <div className="page-stack">
      <SectionCard
        action={
          <select onChange={(event) => setDays(Number(event.target.value))} value={days}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
        subtitle={`Automatically generated from live sales for the past ${data.windowDays} days.`}
        title="Business Analytics"
      >
        <div className="kpi-grid">
          <StatCard currency title="Revenue" value={data.summary.totalRevenue} />
          <StatCard title="Orders" value={data.summary.totalOrders} />
          <StatCard currency title="Average Ticket" value={data.summary.avgTicket} />
        </div>
      </SectionCard>

      <div className="grid-two">
        <SectionCard subtitle="Order count and amount by payment type." title="Payment Breakdown">
          {data.paymentBreakdown.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Orders</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentBreakdown.map((row) => (
                    <tr key={row.method}>
                      <td>{row.method}</td>
                      <td>{row.count}</td>
                      <td>{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState body="Checkout sales in POS to generate payment analytics." title="No payment data" />
          )}
        </SectionCard>

        <SectionCard subtitle="Revenue and sold units by category." title="Category Performance">
          {data.categorySales.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Units</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categorySales.map((row) => (
                    <tr key={row.category}>
                      <td>{row.category}</td>
                      <td>{row.units}</td>
                      <td>{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState body="Once sales exist, category trends will appear here." title="No category data" />
          )}
        </SectionCard>
      </div>

      <SectionCard subtitle="Daily revenue in the selected reporting window." title="Daily Revenue Trend">
        {data.dailyRevenue.length ? (
          <div className="mini-chart">
            {data.dailyRevenue.map((row) => (
              <div key={row.date} className="mini-chart-row">
                <span className="mini-chart-label">{row.date}</span>
                <div className="mini-chart-bar-wrap">
                  <div
                    className="mini-chart-bar"
                    style={{
                      width: `${Math.max(5, (row.revenue / revenueScale) * 100)}%`
                    }}
                  >
                    {formatCurrency(row.revenue)}
                  </div>
                </div>
                <span className="mini-chart-orders">{row.orders} orders</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState body="Sales data is required to display a trend chart." title="No daily trend data" />
        )}
      </SectionCard>
    </div>
  );
}

export default ReportsPage;
