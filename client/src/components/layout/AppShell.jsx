import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/inventory", label: "Inventory" },
  { path: "/categories", label: "Categories" },
  { path: "/customers", label: "Customers" },
  { path: "/pos", label: "Sales Terminal" },
  { path: "/reports", label: "Reports" }
];

const routeHeadings = {
  "/dashboard": "Dashboard Overview",
  "/inventory": "Product and Inventory Management",
  "/categories": "Category Management",
  "/customers": "Customer Relationship Management",
  "/pos": "SmartPOS Sales Terminal",
  "/reports": "Reports and Business Analytics"
};

function AppShell({ user, onLogout }) {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const heading = routeHeadings[location.pathname] || "SmartPOS";

  const closeSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-dot" />
          <div>
            <p className="brand-title">SmartPOS</p>
            <p className="brand-subtitle">Retail Command Center</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={closeSidebar}
              to={item.path}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-user-name">{user?.name || "Store User"}</p>
          <p className="sidebar-user-role">{user?.role || "Operator"}</p>
          <button className="btn btn-danger" onClick={onLogout} type="button">
            Logout
          </button>
        </div>
      </aside>

      {mobileSidebarOpen ? <button className="mobile-overlay" onClick={closeSidebar} type="button" /> : null}

      <div className="content-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="btn btn-ghost mobile-menu-btn"
              onClick={() => setMobileSidebarOpen((value) => !value)}
              type="button"
            >
              Menu
            </button>
            <div>
              <h1 className="topbar-title">{heading}</h1>
              <p className="topbar-subtitle">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </div>
          </div>

          <div className="topbar-right">
            <input className="search-input" placeholder="Search products, sales, customers..." type="text" />
            <div className="profile-chip">
              <span className="profile-chip-name">{user?.name || "Admin"}</span>
              <span className="profile-chip-role">{user?.role || "Store Administrator"}</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
