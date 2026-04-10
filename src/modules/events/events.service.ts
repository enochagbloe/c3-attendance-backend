import { CheckInMode, EventStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { EventListQuery } from './events.validation';

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
  qrCheckInEnabled?: boolean;
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

    return prisma.event.create({
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
        qrCheckInEnabled: data.qrCheckInEnabled ?? false,
        colorTag: data.colorTag ?? null,
        cancelledAt: data.status === EventStatus.CANCELLED ? new Date() : null,
        archivedAt: data.status === EventStatus.ARCHIVED ? new Date() : null,
      },
      include: eventInclude,
    });
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

    return prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getById(id: string) {
    return this.getExisting(id);
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

    return prisma.event.update({
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
        qrCheckInEnabled: data.qrCheckInEnabled,
        colorTag: data.colorTag === undefined ? undefined : data.colorTag ?? null,
      },
      include: eventInclude,
    });
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
      return event;
    }

    return prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: eventInclude,
    });
  }

  async archive(id: string) {
    const event = await this.getExisting(id);

    if (event.status === EventStatus.ARCHIVED) {
      return event;
    }

    return prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.ARCHIVED,
        archivedAt: new Date(),
      },
      include: eventInclude,
    });
  }

  async restore(id: string) {
    const event = await this.getExisting(id);

    if (event.status !== EventStatus.CANCELLED && event.status !== EventStatus.ARCHIVED) {
      throw new AppError('Only cancelled or archived events can be restored', 409, 'INVALID_EVENT_STATUS');
    }

    return prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.SCHEDULED,
        cancelledAt: null,
        archivedAt: null,
      },
      include: eventInclude,
    });
  }
}

export const eventsService = new EventsService();
