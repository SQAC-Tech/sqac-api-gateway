// Centralized permission-to-role mapping
// Single source of truth for all access control
const PERMISSIONS = {
  // Secretary only
  APPROVE_MEMBER:    ['secretary'],
  REJECT_MEMBER:     ['secretary'],
  DELETE_MEMBER:     ['secretary'],
  CHANGE_ROLE:       ['secretary'],

  // Secretary + Joint Sec
  SEND_MASS_MAIL:    ['secretary', 'joint_secretary'],

  // Projects — domain_lead and above may create/assign
  CREATE_PROJECT:    ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead', 'domain_lead'],
  ASSIGN_PROJECT:    ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead', 'domain_lead'],
  SCHEDULE_MEET:     ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead', 'domain_lead'],
  SEND_NOTICE:       ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead', 'domain_lead'],
  ISSUE_WARNING:     ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead', 'domain_lead'],

  // Certificates — no domain_lead, no associate_lead, no member
  GENERATE_CERT:     ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead'],

  // Everyone including member
  GENERATE_MOM:      ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead', 'domain_lead', 'associate_lead', 'member'],
  DELETE_MOM:        ['secretary', 'joint_secretary'],

  // View members list — all except member
  VIEW_MEMBERS:      ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead', 'domain_lead', 'associate_lead'],

  // Attendance management
  MANAGE_ATTENDANCE: ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead', 'domain_lead'],
};

// All non-member roles (for admin route guards)
export const ALL_ADMIN_ROLES = ['secretary', 'joint_secretary', 'technical_lead', 'project_lead', 'corp_lead', 'domain_lead', 'associate_lead'];

// Board Members — the club's leadership circle. Membership is derived purely
// from role, so anyone who already holds one of these roles is automatically
// part of the board (no migration needed).
export const BOARD_ROLES = ['secretary', 'joint_secretary', 'technical_lead', 'corp_lead', 'project_lead'];
export const isBoardMember = (role) => BOARD_ROLES.includes(role);

/**
 * Middleware factory: checks if user's role has the given permission.
 * Usage: requirePermission('APPROVE_MEMBER')
 */
export const requirePermission = (action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const allowedRoles = PERMISSIONS[action];
    if (!allowedRoles) {
      console.error(`Unknown permission action: ${action}`);
      return res.status(500).json({ error: "Server configuration error" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied: Insufficient permissions" });
    }

    next();
  };
};

/**
 * Returns permission flags for a given role.
 * Used by GET /api/permissions/me endpoint.
 */
export const getPermissionsForRole = (role) => {
  const flags = {};
  for (const [action, roles] of Object.entries(PERMISSIONS)) {
    // Convert APPROVE_MEMBER → canApproveMember
    const camelKey = 'can' + action
      .toLowerCase()
      .split('_')
      .map((w, i) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
    flags[camelKey] = roles.includes(role);
  }
  return flags;
};

export { PERMISSIONS };
