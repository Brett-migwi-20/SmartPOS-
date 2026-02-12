import React from "react";
import { api } from "../api/http.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import SectionCard from "../components/ui/SectionCard.jsx";

const initialFormState = {
  name: "",
  code: "",
  description: ""
};

function CategoriesPage() {
  const [categories, setCategories] = React.useState([]);
  const [formState, setFormState] = React.useState(initialFormState);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadCategories = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.createCategory({
        ...formState,
        code: formState.code.trim().toUpperCase()
      });
      setFormState(initialFormState);
      await loadCategories();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDelete = async (id) => {
    setError("");
    try {
      await api.deleteCategory(id);
      await loadCategories();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="page-stack">
      <SectionCard subtitle="Create and maintain product groupings." title="Add Category">
        <form className="inline-form" onSubmit={handleCreate}>
          <input name="name" onChange={handleChange} placeholder="Name" required value={formState.name} />
          <input
            maxLength={4}
            name="code"
            onChange={handleChange}
            placeholder="Code (e.g. BEV)"
            required
            value={formState.code}
          />
          <input name="description" onChange={handleChange} placeholder="Description" value={formState.description} />
          <button className="btn btn-primary" type="submit">
            Add Category
          </button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
      </SectionCard>

      <SectionCard subtitle="These categories are used by inventory and POS." title="Category List">
        {loading ? (
          <p>Loading categories...</p>
        ) : categories.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category._id}>
                    <td>{category.name}</td>
                    <td>{category.code}</td>
                    <td>{category.description || "-"}</td>
                    <td className="row-actions">
                      <button className="btn btn-danger btn-small" onClick={() => handleDelete(category._id)} type="button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState body="Create at least one category to assign products." title="No categories available" />
        )}
      </SectionCard>
    </div>
  );
}

export default CategoriesPage;
