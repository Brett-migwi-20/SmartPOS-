import React from "react";
import { api } from "../api/http.js";
import ImageUploader from "../components/settings/ImageUploader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import SectionCard from "../components/ui/SectionCard.jsx";
import { hasPermission } from "../utils/permissions.js";

const SYSTEM_SETTINGS_KEY = "smartpos_system_settings";

const emptyImage = {
  original: "",
  thumbnail: "",
  altText: "",
  mimeType: "",
  width: 0,
  height: 0,
  size: 0
};

const emptySeo = {
  title: "",
  description: "",
  keywords: "",
  slug: ""
};

const emptyProduct = {
  name: "",
  sku: "",
  category: "",
  price: "",
  stock: "",
  cost: "",
  reorderLevel: "",
  unit: "pcs",
  description: "",
  tags: "",
  isActive: true,
  seo: emptySeo,
  image: emptyImage
};

const emptyCategory = {
  name: "",
  code: "",
  description: "",
  displayOrder: 0,
  isActive: true,
  seo: emptySeo,
  image: emptyImage
};

const readTextFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });

const downloadText = (filename, text, mimeType) => {
  const blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const nowLabel = () =>
  new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

const draftFromProduct = (row) => ({
  ...emptyProduct,
  ...row,
  category: row?.category?._id || row?.category || "",
  tags: Array.isArray(row?.tags) ? row.tags.join(", ") : row?.tags || "",
  seo: {
    ...emptySeo,
    ...(row?.seo || {}),
    keywords: Array.isArray(row?.seo?.keywords) ? row.seo.keywords.join(", ") : row?.seo?.keywords || ""
  },
  image: {
    ...emptyImage,
    ...(row?.image || {})
  }
});

const draftFromCategory = (row) => ({
  ...emptyCategory,
  ...row,
  seo: {
    ...emptySeo,
    ...(row?.seo || {}),
    keywords: Array.isArray(row?.seo?.keywords) ? row.seo.keywords.join(", ") : row?.seo?.keywords || ""
  },
  image: {
    ...emptyImage,
    ...(row?.image || {})
  }
});

const payloadFromProductDraft = (draft) => ({
  name: draft.name,
  sku: draft.sku,
  category: draft.category,
  price: Number(draft.price || 0),
  stock: Number(draft.stock || 0),
  cost: Number(draft.cost || 0),
  reorderLevel: Number(draft.reorderLevel || 0),
  unit: draft.unit,
  description: draft.description,
  tags: draft.tags,
  isActive: Boolean(draft.isActive),
  seo: {
    title: draft.seo.title,
    description: draft.seo.description,
    keywords: String(draft.seo.keywords || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    slug: draft.seo.slug
  },
  image: draft.image
});

const payloadFromCategoryDraft = (draft) => ({
  name: draft.name,
  code: draft.code,
  description: draft.description,
  displayOrder: Number(draft.displayOrder || 0),
  isActive: Boolean(draft.isActive),
  seo: {
    title: draft.seo.title,
    description: draft.seo.description,
    keywords: String(draft.seo.keywords || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    slug: draft.seo.slug
  },
  image: draft.image
});

const summaryText = (summary) => {
  const head = `created ${summary.created || 0}, updated ${summary.updated || 0}, skipped ${summary.skipped || 0}`;
  const firstError = summary.errors?.[0];
  return firstError ? `${head}; first error row ${firstError.row}: ${firstError.message}` : head;
};

const loadSystemSettings = () => {
  try {
    const raw = window.localStorage.getItem(SYSTEM_SETTINGS_KEY);
    return raw
      ? {
          storeName: "SmartPOS Store",
          taxRate: "8",
          lazyLoading: true,
          compression: true,
          thumbnailGeneration: true,
          ...JSON.parse(raw)
        }
      : { storeName: "SmartPOS Store", taxRate: "8", lazyLoading: true, compression: true, thumbnailGeneration: true };
  } catch (error) {
    return { storeName: "SmartPOS Store", taxRate: "8", lazyLoading: true, compression: true, thumbnailGeneration: true };
  }
};

function SettingsPage({ user }) {
  const canView = hasPermission(user?.role, "settings:view");
  const canEdit = hasPermission(user?.role, "content:edit");
  const canDelete = hasPermission(user?.role, "content:delete");
  const canPublish = hasPermission(user?.role, "content:publish");
  const canImport = hasPermission(user?.role, "content:import");

  const [tab, setTab] = React.useState("products");
  const [products, setProducts] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("");
  const [productDraft, setProductDraft] = React.useState(emptyProduct);
  const [categoryDraft, setCategoryDraft] = React.useState(emptyCategory);
  const [productDirty, setProductDirty] = React.useState(false);
  const [categoryDirty, setCategoryDirty] = React.useState(false);
  const [productVersions, setProductVersions] = React.useState([]);
  const [categoryVersions, setCategoryVersions] = React.useState([]);
  const [productBulk, setProductBulk] = React.useState("");
  const [categoryBulk, setCategoryBulk] = React.useState("");
  const [systemSettings, setSystemSettings] = React.useState(() => loadSystemSettings());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productRows, categoryRows] = await Promise.all([api.getProducts(), api.getCategories()]);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVersions = React.useCallback(async (kind, id) => {
    if (!id) {
      if (kind === "product") {
        setProductVersions([]);
      } else {
        setCategoryVersions([]);
      }
      return;
    }
    try {
      const rows = kind === "product" ? await api.getProductVersions(id) : await api.getCategoryVersions(id);
      if (kind === "product") {
        setProductVersions(rows);
      } else {
        setCategoryVersions(rows);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(systemSettings));
      setMessage(`System settings auto-saved at ${nowLabel()}`);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [systemSettings]);

  const selectProduct = (id) => {
    setSelectedProductId(id);
    if (!id) {
      setProductDraft(emptyProduct);
      setProductDirty(false);
      setProductVersions([]);
      return;
    }
    const row = products.find((entry) => entry._id === id);
    setProductDraft(draftFromProduct(row));
    setProductDirty(false);
    loadVersions("product", id);
  };

  const selectCategory = (id) => {
    setSelectedCategoryId(id);
    if (!id) {
      setCategoryDraft(emptyCategory);
      setCategoryDirty(false);
      setCategoryVersions([]);
      return;
    }
    const row = categories.find((entry) => entry._id === id);
    setCategoryDraft(draftFromCategory(row));
    setCategoryDirty(false);
    loadVersions("category", id);
  };

  const saveProduct = React.useCallback(
    async (autosave = false) => {
      if (!selectedProductId || !canEdit) {
        return;
      }
      try {
        const updated = await api.updateProduct(selectedProductId, {
          ...payloadFromProductDraft(productDraft),
          saveMode: autosave ? "autosave" : "manual"
        });
        setProducts((current) => current.map((row) => (row._id === updated._id ? updated : row)));
        setProductDraft(draftFromProduct(updated));
        setProductDirty(false);
        setMessage(`${autosave ? "Product auto-saved" : "Product saved"} at ${nowLabel()}`);
        await loadVersions("product", selectedProductId);
      } catch (requestError) {
        setError(requestError.message);
      }
    },
    [canEdit, loadVersions, productDraft, selectedProductId]
  );

  const saveCategory = React.useCallback(
    async (autosave = false) => {
      if (!selectedCategoryId || !canEdit) {
        return;
      }
      try {
        const updated = await api.updateCategory(selectedCategoryId, {
          ...payloadFromCategoryDraft(categoryDraft),
          saveMode: autosave ? "autosave" : "manual"
        });
        setCategories((current) => current.map((row) => (row._id === updated._id ? updated : row)));
        setCategoryDraft(draftFromCategory(updated));
        setCategoryDirty(false);
        setMessage(`${autosave ? "Category auto-saved" : "Category saved"} at ${nowLabel()}`);
        await loadVersions("category", selectedCategoryId);
      } catch (requestError) {
        setError(requestError.message);
      }
    },
    [canEdit, categoryDraft, loadVersions, selectedCategoryId]
  );

  React.useEffect(() => {
    if (!selectedProductId || !productDirty || !canEdit) {
      return undefined;
    }
    const timer = window.setTimeout(() => saveProduct(true), 1200);
    return () => window.clearTimeout(timer);
  }, [canEdit, productDirty, saveProduct, selectedProductId]);

  React.useEffect(() => {
    if (!selectedCategoryId || !categoryDirty || !canEdit) {
      return undefined;
    }
    const timer = window.setTimeout(() => saveCategory(true), 1200);
    return () => window.clearTimeout(timer);
  }, [canEdit, categoryDirty, saveCategory, selectedCategoryId]);

  const createProduct = async () => {
    if (!canEdit) {
      return;
    }
    try {
      const created = await api.createProduct(payloadFromProductDraft(productDraft));
      setProducts((current) => [created, ...current]);
      selectProduct(created._id);
      setMessage("Product created.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const createCategory = async () => {
    if (!canEdit) {
      return;
    }
    try {
      const created = await api.createCategory(payloadFromCategoryDraft(categoryDraft));
      setCategories((current) => [created, ...current]);
      selectCategory(created._id);
      setMessage("Category created.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const publishSelected = async (kind) => {
    if (!canPublish) {
      return;
    }
    try {
      if (kind === "product" && selectedProductId) {
        const row = await api.publishProduct(selectedProductId);
        setProducts((current) => current.map((entry) => (entry._id === row._id ? row : entry)));
        setProductDraft(draftFromProduct(row));
        await loadVersions("product", selectedProductId);
        setMessage("Product published.");
      }
      if (kind === "category" && selectedCategoryId) {
        const row = await api.publishCategory(selectedCategoryId);
        setCategories((current) => current.map((entry) => (entry._id === row._id ? row : entry)));
        setCategoryDraft(draftFromCategory(row));
        await loadVersions("category", selectedCategoryId);
        setMessage("Category published.");
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const rollbackVersion = async (kind, version) => {
    if (!canPublish) {
      return;
    }
    try {
      if (kind === "product" && selectedProductId) {
        const row = await api.rollbackProductVersion(selectedProductId, version);
        setProducts((current) => current.map((entry) => (entry._id === row._id ? row : entry)));
        setProductDraft(draftFromProduct(row));
        await loadVersions("product", selectedProductId);
        setMessage(`Product rolled back to version ${version}.`);
      }
      if (kind === "category" && selectedCategoryId) {
        const row = await api.rollbackCategoryVersion(selectedCategoryId, version);
        setCategories((current) => current.map((entry) => (entry._id === row._id ? row : entry)));
        setCategoryDraft(draftFromCategory(row));
        await loadVersions("category", selectedCategoryId);
        setMessage(`Category rolled back to version ${version}.`);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteSelected = async (kind) => {
    if (!canDelete) {
      return;
    }
    try {
      if (kind === "product" && selectedProductId) {
        await api.deleteProduct(selectedProductId);
        setProducts((current) => current.filter((entry) => entry._id !== selectedProductId));
        selectProduct("");
        setMessage("Product deleted.");
      }
      if (kind === "category" && selectedCategoryId) {
        await api.deleteCategory(selectedCategoryId);
        setCategories((current) => current.filter((entry) => entry._id !== selectedCategoryId));
        selectCategory("");
        setMessage("Category deleted.");
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const runImport = async (kind, event) => {
    const file = event.target.files?.[0];
    if (!file || !canImport) {
      return;
    }
    try {
      const csvText = await readTextFile(file);
      const summary =
        kind === "product"
          ? await api.importProductsCsv({ csvText, overwrite: true })
          : await api.importCategoriesCsv({ csvText, overwrite: true });
      setMessage(`${kind} CSV import: ${summaryText(summary)}`);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      event.target.value = "";
    }
  };

  const runBulk = async (kind) => {
    if (!canImport) {
      return;
    }
    try {
      const payload = JSON.parse(kind === "product" ? productBulk : categoryBulk);
      if (!Array.isArray(payload)) {
        throw new Error("Bulk payload must be an array.");
      }
      const summary =
        kind === "product"
          ? await api.bulkUpsertProducts({ items: payload })
          : await api.bulkUpsertCategories({ items: payload });
      setMessage(`${kind} bulk upsert: ${summaryText(summary)}`);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const runExport = async (kind) => {
    if (!canImport) {
      return;
    }
    try {
      const csv = kind === "product" ? await api.exportProductsCsv() : await api.exportCategoriesCsv();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadText(`${kind}s-export-${stamp}.csv`, csv, "text/csv;charset=utf-8");
      setMessage(`${kind} CSV exported.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!canView) {
    return (
      <SectionCard subtitle="Your role does not include settings access." title="Settings Locked">
        <p className="form-error">Permission denied.</p>
      </SectionCard>
    );
  }

  if (loading) {
    return <p>Loading settings...</p>;
  }

  return (
    <div className="page-stack">
      <SectionCard subtitle="Autosave, version history, publish control, image optimization, and bulk tools." title="Settings">
        <div className="tabs" role="tablist">
          <button className={`tab-btn ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")} role="tab" type="button">
            Products
          </button>
          <button className={`tab-btn ${tab === "categories" ? "active" : ""}`} onClick={() => setTab("categories")} role="tab" type="button">
            Categories
          </button>
          <button className={`tab-btn ${tab === "system" ? "active" : ""}`} onClick={() => setTab("system")} role="tab" type="button">
            System
          </button>
        </div>
        <p className="form-help" aria-live="polite">
          {message || "Changes save automatically after edits."}
        </p>
        {error ? <p className="form-error">{error}</p> : null}
      </SectionCard>

      {tab === "products" ? (
        <div className="grid-two settings-grid">
          <SectionCard subtitle="Select a product or create a new one." title="Product List">
            <div className="settings-list">
              <button className="btn btn-secondary btn-small" onClick={() => selectProduct("")} type="button">
                New Product
              </button>
              {products.length ? (
                products.map((product) => (
                  <button
                    className={`settings-list-item ${selectedProductId === product._id ? "active" : ""}`}
                    key={product._id}
                    onClick={() => selectProduct(product._id)}
                    type="button"
                  >
                    {product.image?.thumbnail ? (
                      <img alt={product.image?.altText || product.name} className="settings-thumb" loading="lazy" src={product.image.thumbnail} />
                    ) : (
                      <span className="settings-thumb placeholder" />
                    )}
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {product.sku} · {product.status || "draft"}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <EmptyState body="Create the first product from this panel." title="No products" />
              )}
            </div>
          </SectionCard>

          <SectionCard subtitle="Edit details, media, SEO metadata, and publish state." title="Product Editor">
            <div className="settings-form-grid">
              <label className="field-stack">
                <span>Name</span>
                <input disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, name: event.target.value })); setProductDirty(true); }} value={productDraft.name} />
              </label>
              <label className="field-stack">
                <span>SKU</span>
                <input disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, sku: event.target.value })); setProductDirty(true); }} value={productDraft.sku} />
              </label>
              <label className="field-stack">
                <span>Category</span>
                <select disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, category: event.target.value })); setProductDirty(true); }} value={productDraft.category}>
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Price</span>
                <input disabled={!canEdit} min="0" onChange={(event) => { setProductDraft((current) => ({ ...current, price: event.target.value })); setProductDirty(true); }} step="0.01" type="number" value={productDraft.price} />
              </label>
              <label className="field-stack">
                <span>Stock</span>
                <input disabled={!canEdit} min="0" onChange={(event) => { setProductDraft((current) => ({ ...current, stock: event.target.value })); setProductDirty(true); }} type="number" value={productDraft.stock} />
              </label>
              <label className="field-stack">
                <span>Cost</span>
                <input disabled={!canEdit} min="0" onChange={(event) => { setProductDraft((current) => ({ ...current, cost: event.target.value })); setProductDirty(true); }} step="0.01" type="number" value={productDraft.cost} />
              </label>
              <label className="field-stack">
                <span>Reorder Level</span>
                <input disabled={!canEdit} min="0" onChange={(event) => { setProductDraft((current) => ({ ...current, reorderLevel: event.target.value })); setProductDirty(true); }} type="number" value={productDraft.reorderLevel} />
              </label>
              <label className="field-stack">
                <span>Unit</span>
                <input disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, unit: event.target.value })); setProductDirty(true); }} value={productDraft.unit} />
              </label>
              <label className="field-stack">
                <span>Tags</span>
                <input disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, tags: event.target.value })); setProductDirty(true); }} value={productDraft.tags} />
              </label>
              <label className="field-stack full-width">
                <span>Description</span>
                <textarea disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, description: event.target.value })); setProductDirty(true); }} rows={2} value={productDraft.description} />
              </label>
            </div>

            <ImageUploader disabled={!canEdit} idPrefix="product" label="Product image upload" onChange={(image) => { setProductDraft((current) => ({ ...current, image: { ...current.image, ...image } })); setProductDirty(true); }} value={productDraft.image} />

            <div className="settings-form-grid">
              <label className="field-stack full-width">
                <span>Image Alt Text</span>
                <input disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, image: { ...current.image, altText: event.target.value } })); setProductDirty(true); }} value={productDraft.image.altText || ""} />
              </label>
              <label className="field-stack">
                <span>SEO Title</span>
                <input disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, seo: { ...current.seo, title: event.target.value } })); setProductDirty(true); }} value={productDraft.seo.title} />
              </label>
              <label className="field-stack">
                <span>SEO Slug</span>
                <input disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, seo: { ...current.seo, slug: event.target.value } })); setProductDirty(true); }} value={productDraft.seo.slug} />
              </label>
              <label className="field-stack full-width">
                <span>SEO Description</span>
                <textarea disabled={!canEdit} onChange={(event) => { setProductDraft((current) => ({ ...current, seo: { ...current.seo, description: event.target.value } })); setProductDirty(true); }} rows={2} value={productDraft.seo.description} />
              </label>
            </div>

            <div className="settings-actions">
              <button className="btn btn-primary" disabled={!canEdit} onClick={selectedProductId ? () => saveProduct(false) : createProduct} type="button">
                {selectedProductId ? "Save Product" : "Create Product"}
              </button>
              <button className="btn btn-secondary" disabled={!selectedProductId || !canPublish} onClick={() => publishSelected("product")} type="button">
                Publish
              </button>
              <button className="btn btn-danger" disabled={!selectedProductId || !canDelete} onClick={() => deleteSelected("product")} type="button">
                Delete
              </button>
            </div>

            <div className="settings-actions">
              <button className="btn btn-secondary btn-small" disabled={!canImport} onClick={() => runExport("product")} type="button">
                Export CSV
              </button>
              <label className={`btn btn-secondary btn-small file-btn ${!canImport ? "disabled" : ""}`}>
                Import CSV
                <input accept=".csv,text/csv" disabled={!canImport} onChange={(event) => runImport("product", event)} type="file" />
              </label>
            </div>
            <textarea className="bulk-textarea" disabled={!canImport} onChange={(event) => setProductBulk(event.target.value)} placeholder='[{"sku":"ESP-500","price":22}]' rows={4} value={productBulk} />
            <button className="btn btn-secondary btn-small" disabled={!canImport} onClick={() => runBulk("product")} type="button">
              Run Bulk Upsert
            </button>

            <div className="version-list">
              {productVersions.length ? (
                productVersions.map((entry) => (
                  <div className="version-row" key={`pv-${entry.version}`}>
                    <div>
                      <p className="version-title">v{entry.version}</p>
                      <p className="version-meta">{entry.action} by {entry.changedBy || "System"}</p>
                    </div>
                    <button className="btn btn-secondary btn-small" disabled={!canPublish} onClick={() => rollbackVersion("product", entry.version)} type="button">
                      Roll Back
                    </button>
                  </div>
                ))
              ) : (
                <p className="form-help">No product versions yet.</p>
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "categories" ? (
        <div className="grid-two settings-grid">
          <SectionCard subtitle="Select a category or create a new one." title="Category List">
            <div className="settings-list">
              <button className="btn btn-secondary btn-small" onClick={() => selectCategory("")} type="button">
                New Category
              </button>
              {categories.length ? (
                categories.map((category) => (
                  <button
                    className={`settings-list-item ${selectedCategoryId === category._id ? "active" : ""}`}
                    key={category._id}
                    onClick={() => selectCategory(category._id)}
                    type="button"
                  >
                    <span>
                      <strong>{category.name}</strong>
                      <small>
                        {category.code} · {category.status || "draft"}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <EmptyState body="Create the first category from this panel." title="No categories" />
              )}
            </div>
          </SectionCard>

          <SectionCard subtitle="Manage category metadata, image, and SEO." title="Category Editor">
            <div className="settings-form-grid">
              <label className="field-stack">
                <span>Name</span>
                <input disabled={!canEdit} onChange={(event) => { setCategoryDraft((current) => ({ ...current, name: event.target.value })); setCategoryDirty(true); }} value={categoryDraft.name} />
              </label>
              <label className="field-stack">
                <span>Code</span>
                <input disabled={!canEdit} onChange={(event) => { setCategoryDraft((current) => ({ ...current, code: event.target.value })); setCategoryDirty(true); }} value={categoryDraft.code} />
              </label>
              <label className="field-stack">
                <span>Display Order</span>
                <input disabled={!canEdit} min="0" onChange={(event) => { setCategoryDraft((current) => ({ ...current, displayOrder: event.target.value })); setCategoryDirty(true); }} type="number" value={categoryDraft.displayOrder} />
              </label>
              <label className="field-stack full-width">
                <span>Description</span>
                <textarea disabled={!canEdit} onChange={(event) => { setCategoryDraft((current) => ({ ...current, description: event.target.value })); setCategoryDirty(true); }} rows={2} value={categoryDraft.description} />
              </label>
            </div>

            <ImageUploader disabled={!canEdit} idPrefix="category" label="Category image upload" onChange={(image) => { setCategoryDraft((current) => ({ ...current, image: { ...current.image, ...image } })); setCategoryDirty(true); }} value={categoryDraft.image} />

            <div className="settings-form-grid">
              <label className="field-stack full-width">
                <span>Image Alt Text</span>
                <input disabled={!canEdit} onChange={(event) => { setCategoryDraft((current) => ({ ...current, image: { ...current.image, altText: event.target.value } })); setCategoryDirty(true); }} value={categoryDraft.image.altText || ""} />
              </label>
              <label className="field-stack">
                <span>SEO Title</span>
                <input disabled={!canEdit} onChange={(event) => { setCategoryDraft((current) => ({ ...current, seo: { ...current.seo, title: event.target.value } })); setCategoryDirty(true); }} value={categoryDraft.seo.title} />
              </label>
              <label className="field-stack">
                <span>SEO Slug</span>
                <input disabled={!canEdit} onChange={(event) => { setCategoryDraft((current) => ({ ...current, seo: { ...current.seo, slug: event.target.value } })); setCategoryDirty(true); }} value={categoryDraft.seo.slug} />
              </label>
              <label className="field-stack full-width">
                <span>SEO Description</span>
                <textarea disabled={!canEdit} onChange={(event) => { setCategoryDraft((current) => ({ ...current, seo: { ...current.seo, description: event.target.value } })); setCategoryDirty(true); }} rows={2} value={categoryDraft.seo.description} />
              </label>
              <label className="field-stack full-width">
                <span>SEO Keywords</span>
                <input disabled={!canEdit} onChange={(event) => { setCategoryDraft((current) => ({ ...current, seo: { ...current.seo, keywords: event.target.value } })); setCategoryDirty(true); }} value={categoryDraft.seo.keywords} />
              </label>
            </div>

            <div className="settings-actions">
              <button className="btn btn-primary" disabled={!canEdit} onClick={selectedCategoryId ? () => saveCategory(false) : createCategory} type="button">
                {selectedCategoryId ? "Save Category" : "Create Category"}
              </button>
              <button className="btn btn-secondary" disabled={!selectedCategoryId || !canPublish} onClick={() => publishSelected("category")} type="button">
                Publish
              </button>
              <button className="btn btn-danger" disabled={!selectedCategoryId || !canDelete} onClick={() => deleteSelected("category")} type="button">
                Delete
              </button>
            </div>

            <div className="settings-actions">
              <button className="btn btn-secondary btn-small" disabled={!canImport} onClick={() => runExport("category")} type="button">
                Export CSV
              </button>
              <label className={`btn btn-secondary btn-small file-btn ${!canImport ? "disabled" : ""}`}>
                Import CSV
                <input accept=".csv,text/csv" disabled={!canImport} onChange={(event) => runImport("category", event)} type="file" />
              </label>
            </div>
            <textarea className="bulk-textarea" disabled={!canImport} onChange={(event) => setCategoryBulk(event.target.value)} placeholder='[{"code":"BEV","description":"Updated"}]' rows={4} value={categoryBulk} />
            <button className="btn btn-secondary btn-small" disabled={!canImport} onClick={() => runBulk("category")} type="button">
              Run Bulk Upsert
            </button>

            <div className="version-list">
              {categoryVersions.length ? (
                categoryVersions.map((entry) => (
                  <div className="version-row" key={`cv-${entry.version}`}>
                    <div>
                      <p className="version-title">v{entry.version}</p>
                      <p className="version-meta">{entry.action} by {entry.changedBy || "System"}</p>
                    </div>
                    <button className="btn btn-secondary btn-small" disabled={!canPublish} onClick={() => rollbackVersion("category", entry.version)} type="button">
                      Roll Back
                    </button>
                  </div>
                ))
              ) : (
                <p className="form-help">No category versions yet.</p>
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "system" ? (
        <div className="grid-two">
          <SectionCard subtitle="Saved in local storage with autosave for quick load." title="Store Preferences">
            <div className="settings-form-grid">
              <label className="field-stack">
                <span>Store Name</span>
                <input onChange={(event) => setSystemSettings((current) => ({ ...current, storeName: event.target.value }))} value={systemSettings.storeName} />
              </label>
              <label className="field-stack">
                <span>Tax Rate (%)</span>
                <input min="0" onChange={(event) => setSystemSettings((current) => ({ ...current, taxRate: event.target.value }))} type="number" value={systemSettings.taxRate} />
              </label>
              <label className="toggle-field">
                <input checked={Boolean(systemSettings.lazyLoading)} onChange={(event) => setSystemSettings((current) => ({ ...current, lazyLoading: event.target.checked }))} type="checkbox" />
                <span>Enable lazy-loading defaults</span>
              </label>
              <label className="toggle-field">
                <input checked={Boolean(systemSettings.compression)} onChange={(event) => setSystemSettings((current) => ({ ...current, compression: event.target.checked }))} type="checkbox" />
                <span>Enable client-side compression</span>
              </label>
              <label className="toggle-field">
                <input checked={Boolean(systemSettings.thumbnailGeneration)} onChange={(event) => setSystemSettings((current) => ({ ...current, thumbnailGeneration: event.target.checked }))} type="checkbox" />
                <span>Enable thumbnail generation</span>
              </label>
            </div>
          </SectionCard>

          <SectionCard subtitle="Permissions are enforced in API middleware and reflected here." title="Role Permissions">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Edit</th>
                    <th>Publish</th>
                    <th>Import</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {["Store Administrator", "Manager", "Editor", "Cashier", "Viewer"].map((role) => (
                    <tr key={role}>
                      <td>{role}</td>
                      <td>{hasPermission(role, "content:edit") ? "Yes" : "No"}</td>
                      <td>{hasPermission(role, "content:publish") ? "Yes" : "No"}</td>
                      <td>{hasPermission(role, "content:import") ? "Yes" : "No"}</td>
                      <td>{hasPermission(role, "content:delete") ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="form-help">Current role: {user?.role || "Viewer"}</p>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

export default SettingsPage;
