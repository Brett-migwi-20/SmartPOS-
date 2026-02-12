import React from "react";
import { api } from "../api/http.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import SectionCard from "../components/ui/SectionCard.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { formatCurrency, formatDateTime } from "../utils/formatters.js";

const buildCsv = (sales) => {
  const headers = [
    "invoiceNumber",
    "createdAt",
    "customer",
    "paymentMethod",
    "items",
    "subtotal",
    "tax",
    "total",
    "createdBy"
  ];

  const escapeCell = (value) => {
    const safe = value === null || value === undefined ? "" : String(value);
    if (/[",\r\n]/.test(safe)) {
      return `"${safe.replace(/"/g, "\"\"")}"`;
    }
    return safe;
  };

  const lines = [headers.join(",")];
  sales.forEach((sale) => {
    lines.push(
      [
        sale.invoiceNumber,
        new Date(sale.createdAt).toISOString(),
        sale.customer?.name || "Walk-in",
        sale.paymentMethod,
        sale.items.map((item) => `${item.name} x${item.quantity}`).join(" | "),
        sale.subtotal,
        sale.tax,
        sale.total,
        sale.createdBy || "System"
      ]
        .map(escapeCell)
        .join(",")
    );
  });

  return lines.join("\n");
};

const downloadCsv = (filename, csvText) => {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

function SalesPage() {
  const [sales, setSales] = React.useState([]);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [expandedSaleId, setExpandedSaleId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadSales = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api.getSales({
        from: from || undefined,
        to: to || undefined,
        search: search.trim() || undefined,
        paymentMethod: paymentMethod || undefined,
        limit: 200
      });
      setSales(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [from, paymentMethod, search, to]);

  React.useEffect(() => {
    loadSales();
  }, [loadSales]);

  const totals = React.useMemo(() => {
    const grossRevenue = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const orders = sales.length;
    const avgTicket = orders ? grossRevenue / orders : 0;
    return { grossRevenue, orders, avgTicket };
  }, [sales]);

  const handleExport = () => {
    const csv = buildCsv(sales);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`sales-export-${stamp}.csv`, csv);
  };

  return (
    <div className="page-stack">
      <SectionCard
        action={
          <button className="btn btn-secondary" onClick={handleExport} type="button">
            Export CSV
          </button>
        }
        subtitle="Use filters to inspect orders and quickly export sales records."
        title="Sales Transactions"
      >
        <div className="kpi-grid">
          <StatCard currency title="Gross Revenue" value={totals.grossRevenue} />
          <StatCard title="Orders" value={totals.orders} />
          <StatCard currency title="Average Ticket" value={totals.avgTicket} />
        </div>
      </SectionCard>

      <SectionCard subtitle="Filter by date, invoice, and payment method." title="Search Sales">
        <div className="inline-form">
          <label className="field-stack" htmlFor="sales-from">
            <span>From</span>
            <input id="sales-from" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
          </label>

          <label className="field-stack" htmlFor="sales-to">
            <span>To</span>
            <input id="sales-to" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
          </label>

          <label className="field-stack" htmlFor="sales-search">
            <span>Invoice Search</span>
            <input
              id="sales-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Invoice number"
              type="search"
              value={search}
            />
          </label>

          <label className="field-stack" htmlFor="sales-payment">
            <span>Payment</span>
            <select id="sales-payment" onChange={(event) => setPaymentMethod(event.target.value)} value={paymentMethod}>
              <option value="">All methods</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="mobile">Mobile</option>
            </select>
          </label>

          <button className="btn btn-primary" onClick={loadSales} type="button">
            Apply Filters
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </SectionCard>

      <SectionCard subtitle="Tap a row to inspect sale line items." title="Sales Log">
        {loading ? (
          <p>Loading sales...</p>
        ) : sales.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const isExpanded = expandedSaleId === sale._id;
                  return (
                    <React.Fragment key={sale._id}>
                      <tr
                        aria-expanded={isExpanded}
                        className={`table-row-clickable ${isExpanded ? "expanded" : ""}`}
                        onClick={() => setExpandedSaleId((current) => (current === sale._id ? "" : sale._id))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setExpandedSaleId((current) => (current === sale._id ? "" : sale._id));
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <td>{sale.invoiceNumber}</td>
                        <td>{formatDateTime(sale.createdAt)}</td>
                        <td>{sale.customer?.name || "Walk-in"}</td>
                        <td>{sale.paymentMethod}</td>
                        <td>{formatCurrency(sale.total)}</td>
                        <td>{sale.createdBy || "System"}</td>
                      </tr>

                      {isExpanded ? (
                        <tr className="expanded-row">
                          <td colSpan={6}>
                            <div className="expanded-content">
                              {sale.items.map((item) => (
                                <div key={`${sale._id}-${item.sku}`} className="expanded-line">
                                  <span>
                                    {item.name} ({item.sku})
                                  </span>
                                  <span>{item.quantity} units</span>
                                  <span>{formatCurrency(item.lineTotal)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState body="No matching sales in this filter window." title="No sales found" />
        )}
      </SectionCard>
    </div>
  );
}

export default SalesPage;
