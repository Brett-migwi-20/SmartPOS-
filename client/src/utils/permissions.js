const rolePermissions = {
  "Store Administrator": new Set([
    "settings:view",
    "content:edit",
    "content:delete",
    "content:publish",
    "content:import",
    "sales:view",
    "sales:create"
  ]),
  Manager: new Set([
    "settings:view",
    "content:edit",
    "content:publish",
    "content:import",
    "sales:view",
    "sales:create"
  ]),
  Editor: new Set(["settings:view", "content:edit", "sales:view"]),
  Cashier: new Set(["sales:view", "sales:create"]),
  Viewer: new Set(["sales:view"])
};

export const hasPermission = (role, permission) => {
  const permissions = rolePermissions[role] || rolePermissions.Viewer;
  return permissions.has(permission);
};
