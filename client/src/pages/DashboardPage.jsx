import React from "react";
import { api } from "../api/http.js";
import SectionCard from "../components/ui/SectionCard.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { formatCurrency, formatDateTime, formatPercent } from "../utils/formatters.js";

const getBarHeight = (amount, max) => {
  if (!max) {
    return 8;
  }
  return Math.max(Math.round((amount / max) * 100), 8);
};

function DashboardPage() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api.getDashboard();
      setData(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (error) {
    return (
      <SectionCard title="Dashboard Error">
        <p className="form-error">{error}</p>
        <button className="btn btn-primary" onClick={loadDashboard} type="button">
          Retry
        </button>
      </SectionCard>
    );
  }

  const weeklySales = data?.weeklySales || [];
  const maxWeeklySale = Math.max(...weeklySales.map((item) => item.total), 0);

  return (
    <div className="page-stack">
      <div className="kpi-grid">
        <StatCard
          currency
          hint={`${formatPercent(data.kpis.dailyTrend)} vs yesterday`}
          title="Today's Sales"
          tone={data.kpis.dailyTrend >= 0 ? "positive" : "warning"}
          value={data.kpis.todaySales}
        />
        <StatCard currency hint="Current month revenue" title="Monthly Revenue" tone="primary" value={data.kpis.monthlyRevenue} />
        <StatCard hint="Active products in inventory" title="Total Products" value={data.kpis.totalProducts} />
        <StatCard hint="Requires replenishment" title="Low Stock Items" tone="warning" value={data.kpis.lowStockItems} />
      </div>

      <SectionCard subtitle="Based on completed sales in the last seven days." title="Weekly Sales Analytics">
        <div className="chart-grid">
          {weeklySales.map((day) => (
            <div key={day.date} className="chart-column">
              <div className="chart-bar-wrap">
                <div className="chart-bar" style={{ height: `${getBarHeight(day.total, maxWeeklySale)}%` }}>
                  <span className="chart-tooltip">{formatCurrency(day.total)}</span>
                </div>
              </div>
              <span className="chart-label">{day.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid-two">
        <SectionCard subtitle="Newest completed transactions" title="Recent Sales">
          {data.recentSales.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Method</th>
                    <th>Total</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.invoiceNumber}</td>
                      <td>{sale.customer}</td>
                      <td>{sale.paymentMethod}</td>
                      <td>{formatCurrency(sale.total)}</td>
                      <td>{formatDateTime(sale.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState body="Create sales from the POS page to populate this table." title="No sales yet" />
          )}
        </SectionCard>

        <SectionCard subtitle="Highest quantities sold" title="Top Products">
          {data.topProducts.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((product) => (
                    <tr key={product.sku}>
                      <td>{product.name}</td>
                      <td>{product.sku}</td>
                      <td>{product.quantity}</td>
                      <td>{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState body="Top selling products will appear automatically after checkout." title="No product trends yet" />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default DashboardPage;
