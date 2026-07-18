import { EventStatus, EventVolunteerAssignmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { VolunteerAssignmentListQuery } from './volunteer-assignments.validation';

export interface CreateVolunteerAssignmentInput {
  memberId: string;
  volunteerRoleId?: string | null;
  departmentId?: string | null;
  assignmentTitle?: string | null;
  notes?: string | null;
}

export interface UpdateVolunteerAssignmentInput {
  volunteerRoleId?: string | null;
  departmentId?: string | null;
  assignmentTitle?: string | null;
  notes?: string | null;
  status?: EventVolunteerAssignmentStatus;
}

const assignmentInclude = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      primaryMembershipStatus: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  volunteerRole: {
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
    },
  },
  assignedByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.EventVolunteerAssignmentInclude;

class VolunteerAssignmentsService {
  private formatAssignment<
    T extends Prisma.EventVolunteerAssignmentGetPayload<{ include: typeof assignmentInclude }>
  >(assignment: T) {
    return {
      ...assignment,
      member: {
        id: assignment.member.id,
        fullName: `${assignment.member.firstName} ${assignment.member.lastName}`.trim(),
        avatarUrl: null,
        email: assignment.member.email,
        phone: assignment.member.phone,
        primaryMembershipStatus: assignment.member.primaryMembershipStatus,
        department: assignment.member.department,
      },
    };
  }

  private normalizeTitle(title?: string | null) {
    const value = title?.trim().toLowerCase() ?? '';
    return value || null;
  }

  private buildAssignmentKey(input: {
    volunteerRoleId?: string | null;
    departmentId?: string | null;
    assignmentTitle?: string | null;
  }) {
    return [
      input.volunteerRoleId ?? 'none',
      input.departmentId ?? 'none',
      this.normalizeTitle(input.assignmentTitle) ?? 'none',
    ].join(':');
  }

  private async getEventOrThrow(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    });

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (event.status === EventStatus.ARCHIVED) {
      throw new AppError('Archived events cannot be updated', 409, 'EVENT_NOT_EDITABLE');
    }

    return event;
  }

  private async getAssignmentOrThrow(eventId: string, assignmentId: string) {
    await this.getEventOrThrow(eventId);

    const assignment = await prisma.eventVolunteerAssignment.findFirst({
      where: { id: assignmentId, eventId },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new AppError('Volunteer assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    return assignment;
  }

  private async getMemberOrThrow(memberId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, isDeleted: true },
    });

    if (!member || member.isDeleted) {
      throw new AppError('Member not found or inactive', 404, 'MEMBER_NOT_FOUND');
    }
  }

  private async validateReferences(input: CreateVolunteerAssignmentInput) {
    await this.getMemberOrThrow(input.memberId);

    if (input.volunteerRoleId) {
      const role = await prisma.volunteerRole.findUnique({
        where: { id: input.volunteerRoleId },
        select: { id: true },
      });

      if (!role) {
        throw new AppError('Volunteer role not found', 404, 'VOLUNTEER_ROLE_NOT_FOUND');
      }
    }

    if (input.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: input.departmentId },
        select: { id: true },
      });

      if (!department) {
        throw new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND');
      }
    }
  }

  private getStatusTimestamps(
    current: { respondedAt: Date | null; completedAt: Date | null },
    status?: EventVolunteerAssignmentStatus
  ) {
    if (!status) {
      return {};
    }

    switch (status) {
      case EventVolunteerAssignmentStatus.ACCEPTED:
      case EventVolunteerAssignmentStatus.DECLINED:
        return {
          respondedAt: current.respondedAt ?? new Date(),
          completedAt: null,
        };
      case EventVolunteerAssignmentStatus.COMPLETED:
        return {
          respondedAt: current.respondedAt ?? new Date(),
          completedAt: new Date(),
        };
      case EventVolunteerAssignmentStatus.PENDING:
        return {
          respondedAt: null,
          completedAt: null,
        };
      case EventVolunteerAssignmentStatus.CANCELLED:
        return {
          completedAt: null,
        };
      case EventVolunteerAssignmentStatus.MISSED:
        return {
          completedAt: null,
        };
      default:
        return {};
    }
  }

  async create(eventId: string, input: CreateVolunteerAssignmentInput, assignedByUserId?: string) {
    await this.getEventOrThrow(eventId);
    await this.validateReferences(input);

    const assignmentKey = this.buildAssignmentKey(input);

    const existing = await prisma.eventVolunteerAssignment.findUnique({
      where: {
        eventId_memberId_assignmentKey: {
          eventId,
          memberId: input.memberId,
          assignmentKey,
        },
      },
      include: assignmentInclude,
    });

    if (existing) {
      throw new AppError('This member already has the same assignment for this event', 409, 'ASSIGNMENT_DUPLICATE');
    }

    const assignment = await prisma.eventVolunteerAssignment.create({
      data: {
        eventId,
        memberId: input.memberId,
        volunteerRoleId: input.volunteerRoleId ?? null,
        departmentId: input.departmentId ?? null,
        assignmentTitle: input.assignmentTitle?.trim() || null,
        assignmentKey,
        status: EventVolunteerAssignmentStatus.PENDING,
        notes: input.notes?.trim() || null,
        assignedByUserId: assignedByUserId ?? null,
      },
      include: assignmentInclude,
    });

    return this.formatAssignment(assignment);
  }

  async list(eventId: string, filters: VolunteerAssignmentListQuery) {
    await this.getEventOrThrow(eventId);

    const where: Prisma.EventVolunteerAssignmentWhereInput = { eventId };

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.volunteerRoleId) {
      where.volunteerRoleId = filters.volunteerRoleId;
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.search) {
      where.OR = [
        { member: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { member: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { assignmentTitle: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const assignments = await prisma.eventVolunteerAssignment.findMany({
      where,
      include: assignmentInclude,
      orderBy: [{ assignedAt: 'asc' }, { createdAt: 'asc' }],
    });

    return assignments.map((assignment) => this.formatAssignment(assignment));
  }

  async getById(eventId: string, assignmentId: string) {
    const assignment = await this.getAssignmentOrThrow(eventId, assignmentId);
    return this.formatAssignment(assignment);
  }

  async update(eventId: string, assignmentId: string, input: UpdateVolunteerAssignmentInput) {
    const current = await this.getAssignmentOrThrow(eventId, assignmentId);

    const nextInput: CreateVolunteerAssignmentInput = {
      memberId: current.memberId,
      volunteerRoleId: input.volunteerRoleId === undefined ? current.volunteerRoleId : input.volunteerRoleId,
      departmentId: input.departmentId === undefined ? current.departmentId : input.departmentId,
      assignmentTitle: input.assignmentTitle === undefined ? current.assignmentTitle : input.assignmentTitle,
      notes: input.notes === undefined ? current.notes : input.notes,
    };

    await this.validateReferences(nextInput);

    const assignmentKey = this.buildAssignmentKey(nextInput);
    const duplicate = await prisma.eventVolunteerAssignment.findFirst({
      where: {
        eventId,
        memberId: current.memberId,
        assignmentKey,
        NOT: { id: assignmentId },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new AppError('This member already has the same assignment for this event', 409, 'ASSIGNMENT_DUPLICATE');
    }

    const assignment = await prisma.eventVolunteerAssignment.update({
      where: { id: assignmentId },
      data: {
        volunteerRoleId: nextInput.volunteerRoleId ?? null,
        departmentId: nextInput.departmentId ?? null,
        assignmentTitle: nextInput.assignmentTitle?.trim() || null,
        assignmentKey,
        notes: nextInput.notes?.trim() || null,
        status: input.status ?? undefined,
        ...this.getStatusTimestamps(current, input.status),
      },
      include: assignmentInclude,
    });

    return this.formatAssignment(assignment);
  }

  async remove(eventId: string, assignmentId: string) {
    const assignment = await this.getAssignmentOrThrow(eventId, assignmentId);
    const hasHistory =
      Boolean(assignment.respondedAt) ||
      Boolean(assignment.completedAt) ||
      assignment.status !== EventVolunteerAssignmentStatus.PENDING;

    if (!hasHistory) {
      await prisma.eventVolunteerAssignment.delete({ where: { id: assignmentId } });
      return { action: 'deleted' as const };
    }

    await prisma.eventVolunteerAssignment.update({
      where: { id: assignmentId },
      data: {
        status: EventVolunteerAssignmentStatus.CANCELLED,
        completedAt: null,
      },
    });

    return { action: 'cancelled' as const };
  }

  async getSummary(eventId: string) {
    await this.getEventOrThrow(eventId);

    const [totalAssignments, grouped, coveredDepartments] = await Promise.all([
      prisma.eventVolunteerAssignment.count({ where: { eventId } }),
      prisma.eventVolunteerAssignment.groupBy({
        by: ['status'],
        where: { eventId },
        _count: { _all: true },
      }),
      prisma.eventVolunteerAssignment.findMany({
        where: {
          eventId,
          departmentId: { not: null },
        },
        select: { departmentId: true },
        distinct: ['departmentId'],
      }),
    ]);

    const counts = Object.fromEntries(grouped.map((row) => [row.status, row._count._all])) as Partial<
      Record<EventVolunteerAssignmentStatus, number>
    >;

    return {
      totalAssignments,
      pending: counts.PENDING ?? 0,
      accepted: counts.ACCEPTED ?? 0,
      declined: counts.DECLINED ?? 0,
      completed: counts.COMPLETED ?? 0,
      missed: counts.MISSED ?? 0,
      cancelled: counts.CANCELLED ?? 0,
      departmentsCovered: coveredDepartments.length,
    };
  }
}

export const volunteerAssignmentsService = new VolunteerAssignmentsService();
