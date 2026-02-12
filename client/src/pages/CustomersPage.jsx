import React from "react";
import { api } from "../api/http.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import SectionCard from "../components/ui/SectionCard.jsx";
import { formatCurrency } from "../utils/formatters.js";

const initialFormState = {
  name: "",
  email: "",
  phone: "",
  tier: "Standard"
};

function CustomersPage() {
  const [customers, setCustomers] = React.useState([]);
  const [formState, setFormState] = React.useState(initialFormState);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadCustomers = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.createCustomer(formState);
      setFormState(initialFormState);
      await loadCustomers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDelete = async (id) => {
    setError("");
    try {
      await api.deleteCustomer(id);
      await loadCustomers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="page-stack">
      <SectionCard subtitle="Maintain your customer directory and loyalty tiers." title="Add Customer">
        <form className="inline-form" onSubmit={handleCreate}>
          <input name="name" onChange={handleChange} placeholder="Full name" required value={formState.name} />
          <input name="email" onChange={handleChange} placeholder="Email" type="email" value={formState.email} />
          <input name="phone" onChange={handleChange} placeholder="Phone" value={formState.phone} />
          <select name="tier" onChange={handleChange} value={formState.tier}>
            <option value="Standard">Standard</option>
            <option value="Gold">Gold</option>
            <option value="Platinum">Platinum</option>
          </select>
          <button className="btn btn-primary" type="submit">
            Add Customer
          </button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
      </SectionCard>

      <SectionCard subtitle="Real-time customer spend and visit history." title="Customer List">
        {loading ? (
          <p>Loading customers...</p>
        ) : customers.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Tier</th>
                  <th>Total Spend</th>
                  <th>Visits</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id}>
                    <td>{customer.name}</td>
                    <td>{customer.email || "-"}</td>
                    <td>{customer.phone || "-"}</td>
                    <td>{customer.tier}</td>
                    <td>{formatCurrency(customer.totalSpend)}</td>
                    <td>{customer.visits}</td>
                    <td className="row-actions">
                      <button className="btn btn-danger btn-small" onClick={() => handleDelete(customer._id)} type="button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState body="Add customers to personalize checkout." title="No customers yet" />
        )}
      </SectionCard>
    </div>
  );
}

export default CustomersPage;
