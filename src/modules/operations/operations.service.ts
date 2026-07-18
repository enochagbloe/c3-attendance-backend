import { EventVolunteerAssignmentStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { OperationsTeamQuery } from './operations.validation';

type OperationalPerson = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: null;
  departments: Array<{ id: string; name: string }>;
  volunteerRoles: Array<{ id: string; name: string }>;
  leadershipRoles: Array<{ id: string; name: string }>;
  systemRoles: string[];
  activeVolunteer: boolean;
  activeLeader: boolean;
  upcomingAssignmentsCount: number;
  lastAssignedAt: string | null;
};

class OperationsService {
  private getTodayStart() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private uniqueById<T extends { id: string }>(items: T[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  private appendAnd(where: Prisma.MemberWhereInput, condition: Prisma.MemberWhereInput) {
    const current = where.AND
      ? Array.isArray(where.AND)
        ? where.AND
        : [where.AND]
      : [];

    where.AND = [...current, condition];
  }

  private statusMatches(person: OperationalPerson, statuses?: OperationsTeamQuery['status']) {
    if (!statuses?.length) return true;

    return statuses.every((status) => {
      switch (status) {
        case 'active':
          return person.activeVolunteer || person.activeLeader || person.systemRoles.length > 0;
        case 'inactive':
          return !person.activeVolunteer && !person.activeLeader && person.upcomingAssignmentsCount === 0;
        case 'volunteer':
          return person.activeVolunteer;
        case 'leader':
          return person.activeLeader;
        case 'admin':
          return person.systemRoles.length > 0;
        default:
          return true;
      }
    });
  }

  private async getUserRoleMap() {
    const users = await prisma.user.findMany({
      select: { email: true, role: true },
    });

    const roleMap = new Map<string, Set<Role>>();
    for (const user of users) {
      if (!user.email) continue;
      const key = user.email.toLowerCase();
      const current = roleMap.get(key) ?? new Set<Role>();
      current.add(user.role);
      roleMap.set(key, current);
    }

    return roleMap;
  }

  async listTeam(filters: OperationsTeamQuery) {
    const now = new Date();
    const todayStart = this.getTodayStart();
    const roleMap = await this.getUserRoleMap();
    const adminEmails = Array.from(roleMap.keys());

    const where: Prisma.MemberWhereInput = {
      isDeleted: false,
      OR: [
        {
          volunteerRecords: {
            some: {
              OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
          },
        },
        {
          leadershipRecords: {
            some: {
              OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
          },
        },
        { departmentId: { not: null } },
        {
          eventVolunteerAssignments: {
            some: {
              status: { not: EventVolunteerAssignmentStatus.CANCELLED },
              event: {
                date: { gte: todayStart },
              },
            },
          },
        },
        ...(adminEmails.length ? [{ email: { in: adminEmails } }] : []),
      ],
    };

    if (filters.search) {
      this.appendAnd(where, {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.departmentId) {
      this.appendAnd(where, {
        OR: [
          { departmentId: filters.departmentId },
          { volunteerRecords: { some: { departmentId: filters.departmentId } } },
          { eventVolunteerAssignments: { some: { departmentId: filters.departmentId } } },
        ],
      });
    }

    if (filters.volunteerRoleId) {
      this.appendAnd(where, {
        OR: [
          { volunteerRecords: { some: { volunteerRoleId: filters.volunteerRoleId } } },
          { eventVolunteerAssignments: { some: { volunteerRoleId: filters.volunteerRoleId } } },
        ],
      });
    }

    if (filters.leadershipRoleId) {
      this.appendAnd(where, {
        leadershipRecords: { some: { leadershipRoleId: filters.leadershipRoleId } },
      });
    }

    if (filters.hasUpcomingAssignments !== undefined) {
      this.appendAnd(where, {
        eventVolunteerAssignments: filters.hasUpcomingAssignments
          ? {
              some: {
                status: { not: EventVolunteerAssignmentStatus.CANCELLED },
                event: { date: { gte: todayStart } },
              },
            }
          : {
              none: {
                status: { not: EventVolunteerAssignmentStatus.CANCELLED },
                event: { date: { gte: todayStart } },
              },
            },
      });
    }

    const members = await prisma.member.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        volunteerRecords: {
          where: {
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
          select: {
            volunteerRole: {
              select: {
                id: true,
                name: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        leadershipRecords: {
          where: {
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
          select: {
            leadershipRole: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        eventVolunteerAssignments: {
          where: {
            status: { not: EventVolunteerAssignmentStatus.CANCELLED },
            event: { date: { gte: todayStart } },
          },
          select: {
            assignedAt: true,
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const people: OperationalPerson[] = members.map((member) => {
      const emailKey = member.email?.toLowerCase() ?? '';
      const systemRoles = emailKey ? Array.from(roleMap.get(emailKey) ?? []).map(String) : [];

      const departments = this.uniqueById(
        [
          ...(member.department ? [member.department] : []),
          ...member.volunteerRecords.flatMap((record) => (record.department ? [record.department] : [])),
        ].map((department) => ({ id: department.id, name: department.name }))
      );

      const volunteerRoles = this.uniqueById(
        member.volunteerRecords.map((record) => ({
          id: record.volunteerRole.id,
          name: record.volunteerRole.name,
        }))
      );

      const leadershipRoles = this.uniqueById(
        member.leadershipRecords.map((record) => ({
          id: record.leadershipRole.id,
          name: record.leadershipRole.name,
        }))
      );

      return {
        id: member.id,
        fullName: `${member.firstName} ${member.lastName}`.trim(),
        phone: member.phone ?? null,
        email: member.email ?? null,
        avatarUrl: null,
        departments,
        volunteerRoles,
        leadershipRoles,
        systemRoles,
        activeVolunteer: volunteerRoles.length > 0,
        activeLeader: leadershipRoles.length > 0,
        upcomingAssignmentsCount: member.eventVolunteerAssignments.length,
        lastAssignedAt: member.eventVolunteerAssignments[0]?.assignedAt.toISOString() ?? null,
      };
    });

    return people.filter((person) => {
      if (!this.statusMatches(person, filters.status)) return false;

      if (filters.availability === 'available') {
        return person.upcomingAssignmentsCount === 0;
      }

      if (filters.availability === 'assigned') {
        return person.upcomingAssignmentsCount > 0;
      }

      return true;
    });
  }

  async getTeamSummary(filters: Pick<OperationsTeamQuery, 'departmentId'>) {
    const people = await this.listTeam(filters);
    const departmentsCovered = new Set(
      people.flatMap((person) => person.departments.map((department) => department.id))
    );

    return {
      totalOperationalPeople: people.length,
      activeVolunteers: people.filter((person) => person.activeVolunteer).length,
      leaders: people.filter((person) => person.activeLeader).length,
      admins: people.filter((person) => person.systemRoles.length > 0).length,
      departmentsCovered: departmentsCovered.size,
      peopleWithUpcomingAssignments: people.filter((person) => person.upcomingAssignmentsCount > 0).length,
    };
  }
}

export const operationsService = new OperationsService();
