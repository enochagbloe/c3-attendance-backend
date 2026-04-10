import { Role } from '@prisma/client';

export const Permissions = {
  VIEW_MEMBERS: 'canViewMembers',
  CREATE_MEMBERS: 'canCreateMembers',
  UPDATE_MEMBERS: 'canUpdateMembers',
  DELETE_MEMBERS: 'canDeleteMembers',
  CHECKIN_MEMBERS: 'canCheckIn',
  VIEW_ATTENDANCE: 'canViewAttendance',
  MANAGE_SERVICES: 'canManageServices',
  VIEW_SERVICES: 'canViewServices',
  MANAGE_INVENTORY: 'canManageInventory',
  VIEW_INVENTORY: 'canViewInventory',
  VIEW_REPORTS: 'canViewReports',
  MANAGE_EVENTS: 'canManageEvents',
  VIEW_EVENTS: 'canViewEvents',
  CHECKIN_ATTENDEES: 'canCheckInAttendees',
  VIEW_REGISTRATIONS: 'canViewRegistrations',
  MANAGE_EVENT_ATTENDANCE: 'canManageEventAttendance',
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

export const rolePermissions: Record<Role, PermissionKey[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permissions),
  [Role.CHURCH_ADMIN]: [
    Permissions.VIEW_MEMBERS,
    Permissions.CREATE_MEMBERS,
    Permissions.UPDATE_MEMBERS,
    Permissions.DELETE_MEMBERS,
    Permissions.CHECKIN_MEMBERS,
    Permissions.VIEW_ATTENDANCE,
    Permissions.MANAGE_SERVICES,
    Permissions.VIEW_SERVICES,
    Permissions.MANAGE_INVENTORY,
    Permissions.VIEW_INVENTORY,
    Permissions.VIEW_REPORTS,
    Permissions.MANAGE_EVENTS,
    Permissions.VIEW_EVENTS,
    Permissions.CHECKIN_ATTENDEES,
    Permissions.VIEW_REGISTRATIONS,
    Permissions.MANAGE_EVENT_ATTENDANCE,
  ],
  [Role.PASTOR]: [
    Permissions.VIEW_MEMBERS,
    Permissions.VIEW_ATTENDANCE,
    Permissions.VIEW_SERVICES,
    Permissions.VIEW_REPORTS,
    Permissions.VIEW_EVENTS,
    Permissions.VIEW_REGISTRATIONS,
  ],
  [Role.CHECKIN_STAFF]: [
    Permissions.CHECKIN_MEMBERS,
    Permissions.VIEW_ATTENDANCE,
    Permissions.VIEW_MEMBERS,
    Permissions.VIEW_EVENTS,
    Permissions.CHECKIN_ATTENDEES,
    Permissions.VIEW_REGISTRATIONS,
  ],
  [Role.INVENTORY_MANAGER]: [Permissions.MANAGE_INVENTORY, Permissions.VIEW_INVENTORY],
  [Role.DEPARTMENT_LEADER]: [
    Permissions.VIEW_MEMBERS,
    Permissions.VIEW_ATTENDANCE,
    Permissions.VIEW_SERVICES,
    Permissions.VIEW_EVENTS,
    Permissions.VIEW_REGISTRATIONS,
  ],
};
