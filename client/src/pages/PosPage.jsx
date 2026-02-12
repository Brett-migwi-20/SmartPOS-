import React from "react";
import { api } from "../api/http.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import SectionCard from "../components/ui/SectionCard.jsx";
import { formatCurrency } from "../utils/formatters.js";

const TAX_RATE = 0.08;

function PosPage({ user }) {
  const [products, setProducts] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [customers, setCustomers] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("card");
  const [cart, setCart] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productRows, categoryRows, customerRows] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getCustomers()
      ]);
      setProducts(productRows);
      setCategories(categoryRows);
      setCustomers(customerRows);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = !categoryFilter || product.category?._id === categoryFilter;
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.sku.toLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    if (product.stock <= 0) {
      return;
    }
    setMessage("");
    setCart((current) => {
      const existing = current.find((line) => line.productId === product._id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, product.stock);
        return current.map((line) =>
          line.productId === product._id ? { ...line, quantity: nextQty } : line
        );
      }
      return [
        ...current,
        {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
          stock: product.stock
        }
      ];
    });
  };

  const updateCartQuantity = (productId, nextQuantity) => {
    setCart((current) =>
      current
        .map((line) => {
          if (line.productId !== productId) {
            return line;
          }
          const safeQuantity = Math.max(0, Math.min(Number(nextQuantity), line.stock));
          return { ...line, quantity: safeQuantity };
        })
        .filter((line) => line.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (!cart.length) {
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const sale = await api.createSale({
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity
        })),
        customerId: customerId || undefined,
        paymentMethod
      });
      setCart([]);
      setCustomerId("");
      setMessage(`Checkout complete: ${sale.invoiceNumber}`);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pos-layout">
      <SectionCard subtitle="Filter products, add to cart, and complete checkout." title="Product Catalog">
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
            Refresh Catalog
          </button>
        </div>

        {loading ? (
          <p>Loading product catalog...</p>
        ) : filteredProducts.length ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article key={product._id} className="product-card">
                <p className="product-name">{product.name}</p>
                <p className="product-sku">{product.sku}</p>
                <p className="product-price">{formatCurrency(product.price)}</p>
                <p className={product.stock <= product.reorderLevel ? "chip chip-warning" : "chip"}>
                  {product.stock} in stock
                </p>
                <button
                  className="btn btn-primary btn-wide"
                  disabled={product.stock <= 0}
                  onClick={() => addToCart(product)}
                  type="button"
                >
                  {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState body="Try a different search or category." title="No products match the current filter" />
        )}
      </SectionCard>

      <SectionCard subtitle="Review and submit the active transaction." title="Current Cart">
        {cart.length ? (
          <>
            <div className="cart-list">
              {cart.map((line) => (
                <div key={line.productId} className="cart-line">
                  <div>
                    <p className="cart-line-name">{line.name}</p>
                    <p className="cart-line-sku">{line.sku}</p>
                  </div>
                  <div className="cart-line-controls">
                    <input
                      min="1"
                      onChange={(event) => updateCartQuantity(line.productId, event.target.value)}
                      type="number"
                      value={line.quantity}
                    />
                    <span>{formatCurrency(line.price * line.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-meta">
              <label htmlFor="customer">Customer</label>
              <select id="customer" onChange={(event) => setCustomerId(event.target.value)} value={customerId}>
                <option value="">Walk-in customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
              </select>

              <label htmlFor="payment">Payment Method</label>
              <select id="payment" onChange={(event) => setPaymentMethod(event.target.value)} value={paymentMethod}>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="mobile">Mobile</option>
              </select>

              <div className="checkout-summary">
                <p>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </p>
                <p>
                  <span>Tax (8%)</span>
                  <strong>{formatCurrency(tax)}</strong>
                </p>
                <p className="checkout-total">
                  <span>Total</span>
                  <strong>{formatCurrency(total)}</strong>
                </p>
              </div>

              <button className="btn btn-primary btn-wide" disabled={submitting} onClick={handleCheckout} type="button">
                {submitting ? "Processing..." : "Complete Checkout"}
              </button>
            </div>
          </>
        ) : (
          <EmptyState body="Add products from the catalog to start a transaction." title="Cart is empty" />
        )}

        {message ? <p className="form-success">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <p className="pos-footer">Station operator: {user?.name || "Store Administrator"}</p>
      </SectionCard>
    </div>
  );
}

export default PosPage;
