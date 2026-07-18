import { CheckInMode, EventStatus, EventVolunteerAssignmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { EventListQuery } from './events.validation';
import crypto from 'crypto';
import { env } from '../../config/env';

export interface EventInput {
  title: string;
  type: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  venue: string;
  status?: EventStatus;
  attendanceEnabled?: boolean;
  checkInMode?: CheckInMode;
  description?: string | null;
  organizerDepartmentId?: string | null;
  organizerName?: string | null;
  audience?: string | null;
  registrationEnabled?: boolean;
  registrationOpenAt?: Date | string | null;
  registrationCloseAt?: Date | string | null;
  qrCheckInEnabled?: boolean;
  publicCheckInEnabled?: boolean;
  checkInOpenAt?: Date | string | null;
  checkInCloseAt?: Date | string | null;
  colorTag?: string | null;
}

export interface EventUpdateInput extends Partial<EventInput> {}

const eventInclude = {
  organizerDepartment: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
  _count: {
    select: {
      attendances: true,
      registrations: true,
      checkIns: true,
    },
  },
} satisfies Prisma.EventInclude;

class EventsService {
  private buildFrontendUrl(pathname: string) {
    return `${env.frontendBaseUrl.replace(/\/$/, '')}${pathname}`;
  }

  private buildPublicRegistrationUrl(token: string) {
    return this.buildFrontendUrl(`/event-register/${token}`);
  }

  private buildPublicCheckInUrl(token: string) {
    return this.buildFrontendUrl(`/event-check-in/${token}`);
  }

  private enrichEventUrls<T extends { registrationToken?: string | null; checkInToken?: string | null }>(event: T) {
    return {
      ...event,
      registrationUrl: event.registrationToken ? this.buildPublicRegistrationUrl(event.registrationToken) : null,
      checkInUrl: event.checkInToken ? this.buildPublicCheckInUrl(event.checkInToken) : null,
    };
  }

  private async enrichEventsWithAssignmentIndicators<
    T extends { id: string; registrationToken?: string | null; checkInToken?: string | null }
  >(events: T[]) {
    if (events.length === 0) {
      return [];
    }

    const eventIds = events.map((event) => event.id);
    const [counts, statusRows, previews] = await Promise.all([
      prisma.eventVolunteerAssignment.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: eventIds },
          status: { not: EventVolunteerAssignmentStatus.CANCELLED },
        },
        _count: { _all: true },
      }),
      prisma.eventVolunteerAssignment.groupBy({
        by: ['eventId', 'status'],
        where: {
          eventId: { in: eventIds },
          status: {
            in: [
              EventVolunteerAssignmentStatus.PENDING,
              EventVolunteerAssignmentStatus.ACCEPTED,
              EventVolunteerAssignmentStatus.DECLINED,
            ],
          },
        },
        _count: { _all: true },
      }),
      prisma.eventVolunteerAssignment.findMany({
        where: {
          eventId: { in: eventIds },
          status: { not: EventVolunteerAssignmentStatus.CANCELLED },
        },
        orderBy: [{ assignedAt: 'desc' }],
        select: {
          eventId: true,
          memberId: true,
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const countMap = new Map(counts.map((row) => [row.eventId, row._count._all]));
    const statusMap = new Map<string, { pending: number; accepted: number; declined: number }>();

    for (const row of statusRows) {
      const current = statusMap.get(row.eventId) ?? { pending: 0, accepted: 0, declined: 0 };
      if (row.status === EventVolunteerAssignmentStatus.PENDING) current.pending = row._count._all;
      if (row.status === EventVolunteerAssignmentStatus.ACCEPTED) current.accepted = row._count._all;
      if (row.status === EventVolunteerAssignmentStatus.DECLINED) current.declined = row._count._all;
      statusMap.set(row.eventId, current);
    }

    const previewMap = new Map<string, Array<{ id: string; fullName: string; avatarUrl: null }>>();
    for (const row of previews) {
      const current = previewMap.get(row.eventId) ?? [];
      if (current.length >= 3 || current.some((entry) => entry.id === row.member.id)) {
        previewMap.set(row.eventId, current);
        continue;
      }

      current.push({
        id: row.member.id,
        fullName: `${row.member.firstName} ${row.member.lastName}`.trim(),
        avatarUrl: null,
      });
      previewMap.set(row.eventId, current);
    }

    return events.map((event) => ({
      ...this.enrichEventUrls(event),
      assignedVolunteersCount: countMap.get(event.id) ?? 0,
      assignmentStatusSummary: statusMap.get(event.id) ?? { pending: 0, accepted: 0, declined: 0 },
      assignedVolunteerPreview: previewMap.get(event.id) ?? [],
    }));
  }

  private timeToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private assertTimeOrder(startTime: string, endTime: string) {
    if (this.timeToMinutes(endTime) <= this.timeToMinutes(startTime)) {
      throw new AppError('endTime must be after startTime', 400, 'INVALID_TIME_RANGE');
    }
  }

  private validateCheckInSettings(data: {
    attendanceEnabled?: boolean;
    checkInMode?: CheckInMode;
    qrCheckInEnabled?: boolean;
  }) {
    const attendanceEnabled = data.attendanceEnabled ?? false;
    const checkInMode = data.checkInMode ?? CheckInMode.MANUAL;
    const qrCheckInEnabled = data.qrCheckInEnabled ?? false;

    if (qrCheckInEnabled && !attendanceEnabled) {
      throw new AppError(
        'qrCheckInEnabled requires attendanceEnabled to be true',
        400,
        'INVALID_QR_CHECKIN_CONFIG'
      );
    }

    if (qrCheckInEnabled && checkInMode !== CheckInMode.QR && checkInMode !== CheckInMode.BOTH) {
      throw new AppError(
        'checkInMode must be QR or BOTH when qrCheckInEnabled is true',
        400,
        'INVALID_QR_CHECKIN_CONFIG'
      );
    }
  }

  private ensureMutableStatus(status: EventStatus) {
    if (status === EventStatus.CANCELLED || status === EventStatus.ARCHIVED) {
      throw new AppError('Restore this event before editing it', 409, 'EVENT_NOT_EDITABLE');
    }
  }

  private async getExisting(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: eventInclude,
    });

    if (!event) {
      throw new AppError('Event not found', 404, 'NOT_FOUND');
    }

    return event;
  }

  async create(data: EventInput) {
    this.assertTimeOrder(data.startTime, data.endTime);
    this.validateCheckInSettings(data);
    const registrationToken = crypto.randomBytes(24).toString('hex');
    const checkInToken = crypto.randomBytes(24).toString('hex');

    const event = await prisma.event.create({
      data: {
        title: data.title,
        type: data.type,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        venue: data.venue,
        status: data.status ?? EventStatus.SCHEDULED,
        attendanceEnabled: data.attendanceEnabled ?? false,
        checkInMode: data.checkInMode ?? CheckInMode.MANUAL,
        description: data.description ?? null,
        organizerDepartmentId: data.organizerDepartmentId ?? null,
        organizerName: data.organizerName ?? null,
        audience: data.audience ?? null,
        registrationToken,
        registrationEnabled: data.registrationEnabled ?? true,
        registrationOpenAt: data.registrationOpenAt ? new Date(data.registrationOpenAt) : null,
        registrationCloseAt: data.registrationCloseAt ? new Date(data.registrationCloseAt) : null,
        checkInToken,
        publicCheckInEnabled: data.publicCheckInEnabled ?? false,
        checkInOpenAt: data.checkInOpenAt ? new Date(data.checkInOpenAt) : null,
        checkInCloseAt: data.checkInCloseAt ? new Date(data.checkInCloseAt) : null,
        qrCheckInEnabled: data.qrCheckInEnabled ?? false,
        colorTag: data.colorTag ?? null,
        cancelledAt: data.status === EventStatus.CANCELLED ? new Date() : null,
        archivedAt: data.status === EventStatus.ARCHIVED ? new Date() : null,
      },
      include: eventInclude,
    });

    const [enriched] = await this.enrichEventsWithAssignmentIndicators([event]);
    return enriched;
  }

  async list(filters: EventListQuery) {
    const where: Prisma.EventWhereInput = {};

    if (filters.search) {
      where.title = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.type?.length) {
      where.type = {
        in: filters.type,
      };
    }

    if (filters.status?.length) {
      where.status = {
        in: filters.status,
      };
    }

    if (filters.attendanceEnabled !== undefined) {
      where.attendanceEnabled = filters.attendanceEnabled;
    }

    if (filters.qrCheckInEnabled !== undefined) {
      where.qrCheckInEnabled = filters.qrCheckInEnabled;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    const events = await prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return this.enrichEventsWithAssignmentIndicators(events);
  }

  async getById(id: string) {
    const event = await this.getExisting(id);
    const [enriched] = await this.enrichEventsWithAssignmentIndicators([event]);
    return enriched;
  }

  async update(id: string, data: EventUpdateInput) {
    const existing = await this.getExisting(id);
    this.ensureMutableStatus(existing.status);

    const merged = {
      attendanceEnabled: data.attendanceEnabled ?? existing.attendanceEnabled,
      checkInMode: data.checkInMode ?? existing.checkInMode,
      qrCheckInEnabled: data.qrCheckInEnabled ?? existing.qrCheckInEnabled,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
    };

    this.assertTimeOrder(merged.startTime, merged.endTime);
    this.validateCheckInSettings(merged);

    const event = await prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        date: data.date ? new Date(data.date) : undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        venue: data.venue,
        status: data.status,
        attendanceEnabled: data.attendanceEnabled,
        checkInMode: data.checkInMode,
        description: data.description === undefined ? undefined : data.description ?? null,
        organizerDepartmentId:
          data.organizerDepartmentId === undefined ? undefined : data.organizerDepartmentId ?? null,
        organizerName: data.organizerName === undefined ? undefined : data.organizerName ?? null,
        audience: data.audience === undefined ? undefined : data.audience ?? null,
        registrationEnabled: data.registrationEnabled,
        registrationOpenAt:
          data.registrationOpenAt === undefined ? undefined : data.registrationOpenAt ? new Date(data.registrationOpenAt) : null,
        registrationCloseAt:
          data.registrationCloseAt === undefined ? undefined : data.registrationCloseAt ? new Date(data.registrationCloseAt) : null,
        publicCheckInEnabled: data.publicCheckInEnabled,
        checkInOpenAt: data.checkInOpenAt === undefined ? undefined : data.checkInOpenAt ? new Date(data.checkInOpenAt) : null,
        checkInCloseAt:
          data.checkInCloseAt === undefined ? undefined : data.checkInCloseAt ? new Date(data.checkInCloseAt) : null,
        qrCheckInEnabled: data.qrCheckInEnabled,
        colorTag: data.colorTag === undefined ? undefined : data.colorTag ?? null,
      },
      include: eventInclude,
    });

    const [enriched] = await this.enrichEventsWithAssignmentIndicators([event]);
    return enriched;
  }

  async delete(id: string) {
    const event = await this.getExisting(id);

    if (event._count.attendances > 0 || event._count.checkIns > 0) {
      throw new AppError(
        'This event cannot be deleted because attendance has already been recorded. Cancel or archive it instead.',
        409,
        'EVENT_DELETE_BLOCKED'
      );
    }

    await prisma.event.delete({ where: { id } });
  }

  async cancel(id: string) {
    const event = await this.getExisting(id);

    if (event.status === EventStatus.ARCHIVED) {
      throw new AppError('Archived events cannot be cancelled', 409, 'INVALID_EVENT_STATUS');
    }

    if (event.status === EventStatus.COMPLETED) {
      throw new AppError('Completed events cannot be cancelled', 409, 'INVALID_EVENT_STATUS');
    }

    if (event.status === EventStatus.CANCELLED) {
      const [enriched] = await this.enrichEventsWithAssignmentIndicators([event]);
      return enriched;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: eventInclude,
    });

    const [enriched] = await this.enrichEventsWithAssignmentIndicators([updated]);
    return enriched;
  }

  async archive(id: string) {
    const event = await this.getExisting(id);

    if (event.status === EventStatus.ARCHIVED) {
      const [enriched] = await this.enrichEventsWithAssignmentIndicators([event]);
      return enriched;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.ARCHIVED,
        archivedAt: new Date(),
      },
      include: eventInclude,
    });

    const [enriched] = await this.enrichEventsWithAssignmentIndicators([updated]);
    return enriched;
  }

  async restore(id: string) {
    const event = await this.getExisting(id);

    if (event.status !== EventStatus.CANCELLED && event.status !== EventStatus.ARCHIVED) {
      throw new AppError('Only cancelled or archived events can be restored', 409, 'INVALID_EVENT_STATUS');
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.SCHEDULED,
        cancelledAt: null,
        archivedAt: null,
      },
      include: eventInclude,
    });

    const [enriched] = await this.enrichEventsWithAssignmentIndicators([updated]);
    return enriched;
  }

  async generateRegistrationToken(id: string, rotate = false) {
    const event = await this.getExisting(id);

    if (event.status === EventStatus.ARCHIVED) {
      throw new AppError('Archived events cannot receive registration links', 409, 'INVALID_EVENT_STATUS');
    }

    const token = event.registrationToken && !rotate ? event.registrationToken : crypto.randomBytes(24).toString('hex');

    const updated = await prisma.event.update({
      where: { id },
      data: {
        registrationToken: token,
      },
      include: eventInclude,
    });

    return {
      event: (await this.enrichEventsWithAssignmentIndicators([updated]))[0],
      token,
      registrationUrl: this.buildPublicRegistrationUrl(token),
    };
  }

  async generateCheckInToken(id: string, rotate = false) {
    const event = await this.getExisting(id);

    if (event.status === EventStatus.ARCHIVED) {
      throw new AppError('Archived events cannot receive public check-in links', 409, 'INVALID_EVENT_STATUS');
    }

    const token = event.checkInToken && !rotate ? event.checkInToken : crypto.randomBytes(24).toString('hex');

    const updated = await prisma.event.update({
      where: { id },
      data: {
        checkInToken: token,
      },
      include: eventInclude,
    });

    return {
      event: (await this.enrichEventsWithAssignmentIndicators([updated]))[0],
      token,
      checkInUrl: this.buildPublicCheckInUrl(token),
    };
  }

  async setRegistrationAccess(
    id: string,
    enabled: boolean,
    openAt?: Date | null,
    closeAt?: Date | null
  ) {
    const event = await this.getExisting(id);

    if (enabled) {
      const current = await prisma.event.findUnique({ where: { id }, select: { registrationToken: true } });
      if (!current?.registrationToken) {
        await this.generateRegistrationToken(id, false);
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        registrationEnabled: enabled,
        registrationOpenAt: openAt === undefined ? undefined : openAt,
        registrationCloseAt: closeAt === undefined ? undefined : closeAt,
      },
      include: eventInclude,
    });

    const [enriched] = await this.enrichEventsWithAssignmentIndicators([updated]);
    return enriched;
  }

  async setPublicCheckInEnabled(
    id: string,
    enabled: boolean,
    openAt?: Date | null,
    closeAt?: Date | null
  ) {
    const event = await this.getExisting(id);

    if (enabled && !event.attendanceEnabled) {
      throw new AppError('Enable attendance for this event before public check-in.', 409, 'ATTENDANCE_DISABLED');
    }

    if (enabled) {
      const current = await prisma.event.findUnique({ where: { id }, select: { checkInToken: true } });
      if (!current?.checkInToken) {
        await this.generateCheckInToken(id, false);
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        publicCheckInEnabled: enabled,
        checkInOpenAt: openAt === undefined ? undefined : openAt,
        checkInCloseAt: closeAt === undefined ? undefined : closeAt,
      },
      include: eventInclude,
    });

    const [enriched] = await this.enrichEventsWithAssignmentIndicators([updated]);
    return enriched;
  }

  async setQrCheckInEnabled(id: string, enabled: boolean) {
    const event = await this.getExisting(id);

    if (enabled && !event.attendanceEnabled) {
      throw new AppError('Enable attendance for this event before QR check-in.', 409, 'ATTENDANCE_DISABLED');
    }

    if (enabled) {
      const current = await prisma.event.findUnique({ where: { id }, select: { checkInToken: true } });
      if (!current?.checkInToken) {
        await this.generateCheckInToken(id, false);
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { qrCheckInEnabled: enabled },
      include: eventInclude,
    });

    const [enriched] = await this.enrichEventsWithAssignmentIndicators([updated]);
    return enriched;
  }

  async getPublicRegistrationEventByToken(token: string) {
    const event = await prisma.event.findUnique({
      where: { registrationToken: token },
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        endTime: true,
        venue: true,
        status: true,
        registrationEnabled: true,
        registrationOpenAt: true,
        registrationCloseAt: true,
      },
    });

    if (!event) {
      throw new AppError('Registration link is invalid or expired.', 404, 'REGISTRATION_LINK_INVALID');
    }

    return {
      eventId: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      status: event.status,
      registrationEnabled: event.registrationEnabled,
      registrationOpenAt: event.registrationOpenAt,
      registrationCloseAt: event.registrationCloseAt,
    };
  }

  async getPublicCheckInEventByToken(token: string) {
    const event = await prisma.event.findUnique({
      where: { checkInToken: token },
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        endTime: true,
        venue: true,
        status: true,
        attendanceEnabled: true,
        publicCheckInEnabled: true,
        qrCheckInEnabled: true,
        checkInOpenAt: true,
        checkInCloseAt: true,
      },
    });

    if (!event) {
      throw new AppError('Check-in link is invalid or expired.', 404, 'CHECKIN_LINK_INVALID');
    }

    return {
      eventId: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      status: event.status,
      attendanceEnabled: event.attendanceEnabled,
      publicCheckInEnabled: event.publicCheckInEnabled,
      qrCheckInEnabled: event.qrCheckInEnabled,
      checkInOpenAt: event.checkInOpenAt,
      checkInCloseAt: event.checkInCloseAt,
    };
  }
}

export const eventsService = new EventsService();
