import React from "react";
import { api } from "../api/http.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import SectionCard from "../components/ui/SectionCard.jsx";
import { formatCurrency } from "../utils/formatters.js";

const initialFormState = {
  name: "",
  sku: "",
  category: "",
  price: "",
  cost: "",
  stock: "",
  reorderLevel: "",
  unit: "pcs"
};

function InventoryPage() {
  const [products, setProducts] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [formState, setFormState] = React.useState(initialFormState);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productRows, categoryRows] = await Promise.all([
        api.getProducts({
          search: search.trim() || undefined,
          category: categoryFilter || undefined
        }),
        api.getCategories()
      ]);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.createProduct({
        ...formState,
        sku: formState.sku.trim().toUpperCase(),
        price: Number(formState.price),
        cost: Number(formState.cost || 0),
        stock: Number(formState.stock || 0),
        reorderLevel: Number(formState.reorderLevel || 5)
      });
      setFormState((current) => ({ ...initialFormState, category: current.category }));
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDelete = async (id) => {
    setError("");
    try {
      await api.deleteProduct(id);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="page-stack">
      <SectionCard subtitle="Create inventory records used by dashboard and POS." title="Add Product">
        <form className="inline-form product-form" onSubmit={handleCreate}>
          <input name="name" onChange={handleFormChange} placeholder="Product name" required value={formState.name} />
          <input name="sku" onChange={handleFormChange} placeholder="SKU" required value={formState.sku} />
          <select name="category" onChange={handleFormChange} required value={formState.category}>
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          <input min="0" name="price" onChange={handleFormChange} placeholder="Price" required step="0.01" type="number" value={formState.price} />
          <input min="0" name="cost" onChange={handleFormChange} placeholder="Cost" step="0.01" type="number" value={formState.cost} />
          <input min="0" name="stock" onChange={handleFormChange} placeholder="Stock" type="number" value={formState.stock} />
          <input
            min="0"
            name="reorderLevel"
            onChange={handleFormChange}
            placeholder="Reorder level"
            type="number"
            value={formState.reorderLevel}
          />
          <input name="unit" onChange={handleFormChange} placeholder="Unit (pcs, bag...)" value={formState.unit} />
          <button className="btn btn-primary" type="submit">
            Add Product
          </button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
      </SectionCard>

      <SectionCard
        action={
          <button className="btn btn-secondary" onClick={loadData} type="button">
            Refresh
          </button>
        }
        subtitle="Search and track stock in real time."
        title="Inventory Catalog"
      >
        <div className="inline-form">
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or SKU" value={search} />
          <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={loadData} type="button">
            Apply Filter
          </button>
        </div>

        {loading ? (
          <p>Loading products...</p>
        ) : products.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Reorder</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{product.category?.name || "-"}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      <span className={product.stock <= product.reorderLevel ? "chip chip-warning" : "chip"}>
                        {product.stock} {product.unit}
                      </span>
                    </td>
                    <td>{product.reorderLevel}</td>
                    <td className="row-actions">
                      <button className="btn btn-danger btn-small" onClick={() => handleDelete(product._id)} type="button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState body="Create products to start selling from POS." title="No products available" />
        )}
      </SectionCard>
    </div>
  );
}

export default InventoryPage;
