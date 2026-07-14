import type { PortalRole, TeamMemberRole } from './types';

export function resolvePortalRole(teamRole?: TeamMemberRole): PortalRole {
  return teamRole === 'team_lead' || teamRole === 'team_member' ? 'technician' : 'customer';
}
