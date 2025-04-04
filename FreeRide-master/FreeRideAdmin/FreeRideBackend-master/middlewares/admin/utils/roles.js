export function forbiddenDelete(req, allowedRoles) {
  return !allowedRoles.includes(req.user.role) && req.body.isDeleted;
}

export function forbiddenEdit(req, allowedRoles) {
  return !allowedRoles.includes(req.user.role);
}

export default {
  forbiddenDelete,
  forbiddenEdit
};
