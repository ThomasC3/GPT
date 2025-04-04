const AdminRoles = {
  Developer: 0,
  SuperAdmin: 1,
  Admin: 2,
  DataAdmin: 3,
  RegionManager: 4,
  Manager: 5,
  Supervisor: 6,
  DataViewer: 7,
  properties: {
    0: { name: 'developer', value: 0 },
    1: { name: 'super admin', value: 1 },
    2: { name: 'admin', value: 2 },
    3: { name: 'data admin', value: 3 },
    4: { name: 'region manager', value: 4 },
    5: { name: 'manager', value: 5 },
    6: { name: 'supervisor', value: 6 },
    7: { name: 'data viewer', value: 7 }
  }
};

Object.freeze(AdminRoles);

export default AdminRoles;
