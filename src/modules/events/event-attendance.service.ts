import {
  AttendeeType,
  CheckInMethod,
  CheckInSource,
  EventRegistrationStatus,
  EventStatus,
  Prisma,
  RegistrationSource,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { normalizeFullName, normalizePhoneNumber, phoneLookupKey } from '../../utils/phone';
import { AttendanceListQuery, AttendanceTimelineQuery, RegistrationListQuery } from './event-attendance.validation';

interface RegisterForEventInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  registrationSource?: RegistrationSource;
}

interface CheckInInput {
  fullName: string;
  phoneNumber: string;
  accompanyingCount?: number;
  checkInMethod: CheckInMethod;
  checkInSource?: CheckInSource;
}

const registrationInclude = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      primaryMembershipStatus: true,
    },
  },
  checkIn: {
    select: {
      id: true,
      checkedInAt: true,
      checkInMethod: true,
      checkInSource: true,
      accompanyingCount: true,
    },
  },
} satisfies Prisma.EventRegistrationInclude;

const checkInInclude = {
  registration: {
    select: {
      id: true,
      status: true,
      registrationSource: true,
    },
  },
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
  },
  checkedInByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.EventCheckInInclude;

type RegisterOutcome = {
  outcome: 'registered' | 'already_registered' | 'already_checked_in';
  registration: Prisma.EventRegistrationGetPayload<{ include: typeof registrationInclude }>;
  matchedMember: Prisma.EventRegistrationGetPayload<{ include: typeof registrationInclude }>['member'];
};

type CheckInOutcome =
  | {
      outcome: 'already_checked_in';
      registrationId: string | null;
      checkInId: string;
      checkedInAt: Date;
      attendee: {
        fullName: string;
        phoneNumber: string;
        attendeeType: AttendeeType;
      };
    }
  | {
      outcome: 'registered_and_checked_in' | 'checked_in_existing_registration';
      registrationId: string;
      checkInId: string;
      checkedInAt: Date;
      attendee: {
        fullName: string;
        phoneNumber: string;
        attendeeType: AttendeeType;
      };
    };

class EventAttendanceService {
  private async withRetry<T>(operation: () => Promise<T>, onConflict?: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;

        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2002' && onConflict) {
            return onConflict();
          }

          if (err.code === 'P2034') {
            continue;
          }
        }

        throw err;
      }
    }

    if (onConflict) {
      return onConflict();
    }

    throw lastError;
  }

  private async getEventForAttendance(
    tx: Prisma.TransactionClient,
    eventId: string,
    mode: 'registration' | 'checkin'
  ) {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        status: true,
        attendanceEnabled: true,
        date: true,
        startTime: true,
        endTime: true,
        qrCheckInEnabled: true,
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (!event.attendanceEnabled) {
      throw new AppError('Attendance is not enabled for this event', 400, 'ATTENDANCE_DISABLED');
    }

    if (event.status === EventStatus.CANCELLED || event.status === EventStatus.ARCHIVED) {
      throw new AppError('This event is not open for attendance operations', 409, 'EVENT_NOT_AVAILABLE');
    }

    if (event.status === EventStatus.DRAFT) {
      throw new AppError('This event is still in draft and is not open yet', 409, 'EVENT_NOT_OPEN');
    }

    if (mode === 'checkin' && event.status === EventStatus.COMPLETED) {
      throw new AppError('Check-in is closed for this event', 409, 'CHECKIN_CLOSED');
    }

    return event;
  }

  private async findMemberByPhone(tx: Prisma.TransactionClient, phoneNumber: string) {
    const normalized = normalizePhoneNumber(phoneNumber);
    const key = phoneLookupKey(phoneNumber);

    return tx.member.findFirst({
      where: {
        isDeleted: false,
        OR: [
          { phone: phoneNumber },
          { phone: normalized },
          ...(key ? [{ phone: { endsWith: key } }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
    });
  }

  private async findExistingRegistration(
    tx: Prisma.TransactionClient,
    eventId: string,
    phoneKey: string,
    memberId?: string | null
  ) {
    return tx.eventRegistration.findFirst({
      where: {
        eventId,
        OR: [{ phoneKey }, ...(memberId ? [{ memberId }] : [])],
      },
      include: registrationInclude,
      orderBy: { registeredAt: 'asc' },
    });
  }

  private async findExistingCheckIn(
    tx: Prisma.TransactionClient,
    eventId: string,
    phoneKey: string,
    memberId?: string | null
  ) {
    return tx.eventCheckIn.findFirst({
      where: {
        eventId,
        OR: [{ phoneKey }, ...(memberId ? [{ memberId }] : [])],
      },
      include: checkInInclude,
      orderBy: { checkedInAt: 'asc' },
    });
  }

  private async readExistingRegistrationOutcome(
    eventId: string,
    phoneKey: string,
    memberId?: string | null
  ): Promise<RegisterOutcome> {
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        OR: [{ phoneKey }, ...(memberId ? [{ memberId }] : [])],
      },
      include: registrationInclude,
      orderBy: { registeredAt: 'asc' },
    });

    if (!registration) {
      throw new AppError('Unable to resolve existing registration after a concurrent request', 409, 'REGISTRATION_CONFLICT');
    }

    return {
      outcome: registration.status === EventRegistrationStatus.CHECKED_IN ? 'already_checked_in' : 'already_registered',
      registration,
      matchedMember: registration.member,
    };
  }

  private async readExistingCheckInOutcome(
    eventId: string,
    phoneKey: string,
    memberId?: string | null
  ): Promise<CheckInOutcome> {
    const checkIn = await prisma.eventCheckIn.findFirst({
      where: {
        eventId,
        OR: [{ phoneKey }, ...(memberId ? [{ memberId }] : [])],
      },
      include: checkInInclude,
      orderBy: { checkedInAt: 'asc' },
    });

    if (!checkIn) {
      throw new AppError('Unable to resolve existing check-in after a concurrent request', 409, 'CHECKIN_CONFLICT');
    }

    return {
      outcome: 'already_checked_in' as const,
      registrationId: checkIn.registrationId,
      checkInId: checkIn.id,
      checkedInAt: checkIn.checkedInAt,
      attendee: {
        fullName: checkIn.fullNameSnapshot,
        phoneNumber: checkIn.phoneNumberSnapshot,
        attendeeType: checkIn.attendeeType,
      },
    };
  }

  async register(eventId: string, input: RegisterForEventInput): Promise<RegisterOutcome> {
    const fullName = normalizeFullName(input.fullName);
    const normalizedPhone = normalizePhoneNumber(input.phoneNumber);
    const phoneKey = phoneLookupKey(input.phoneNumber);

    if (!phoneKey) {
      throw new AppError('phoneNumber is invalid', 400, 'INVALID_PHONE_NUMBER');
    }

    return this.withRetry(
      async () =>
        prisma.$transaction(
          async (tx) => {
            await this.getEventForAttendance(tx, eventId, 'registration');
            const member = await this.findMemberByPhone(tx, input.phoneNumber);
            const attendeeType = member ? AttendeeType.MEMBER : AttendeeType.NEW_ATTENDEE;
            const existing = await this.findExistingRegistration(tx, eventId, phoneKey, member?.id);

            if (existing) {
              const registration =
                existing.status === EventRegistrationStatus.CANCELLED || existing.status === EventRegistrationStatus.NO_SHOW
                  ? await tx.eventRegistration.update({
                      where: { id: existing.id },
                      data: {
                        status: EventRegistrationStatus.REGISTERED,
                        fullName,
                        phoneNumber: normalizedPhone,
                        email: input.email ?? existing.email,
                        memberId: existing.memberId ?? member?.id ?? null,
                        attendeeType: member ? AttendeeType.MEMBER : existing.attendeeType,
                      },
                      include: registrationInclude,
                    })
                  : existing;

              const outcome: RegisterOutcome['outcome'] =
                registration.status === EventRegistrationStatus.CHECKED_IN ? 'already_checked_in' : 'already_registered';

              return {
                outcome,
                registration,
                matchedMember: registration.member,
              };
            }

            const registration = await tx.eventRegistration.create({
              data: {
                eventId,
                memberId: member?.id ?? null,
                fullName,
                phoneNumber: normalizedPhone,
                phoneKey,
                email: input.email,
                attendeeType,
                registrationSource: input.registrationSource ?? RegistrationSource.PRE_EVENT_FORM,
                status: EventRegistrationStatus.REGISTERED,
              },
              include: registrationInclude,
            });

            return {
              outcome: 'registered' as const,
              registration,
              matchedMember: registration.member,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        ),
      async () => {
        const member = await this.findMemberByPhone(prisma as unknown as Prisma.TransactionClient, input.phoneNumber);
        return this.readExistingRegistrationOutcome(eventId, phoneKey, member?.id);
      }
    );
  }

  async listRegistrations(eventId: string, filters: RegistrationListQuery) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, attendanceEnabled: true },
    });

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const where: Prisma.EventRegistrationWhereInput = { eventId };

    if (filters.attendeeType) {
      where.attendeeType = filters.attendeeType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { phoneNumber: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.eventRegistration.findMany({
      where,
      include: registrationInclude,
      orderBy: [{ registeredAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async checkIn(eventId: string, input: CheckInInput, checkedInByUserId?: string): Promise<CheckInOutcome> {
    const fullName = normalizeFullName(input.fullName);
    const normalizedPhone = normalizePhoneNumber(input.phoneNumber);
    const phoneKey = phoneLookupKey(input.phoneNumber);

    if (!phoneKey) {
      throw new AppError('phoneNumber is invalid', 400, 'INVALID_PHONE_NUMBER');
    }

    return this.withRetry(
      async () =>
        prisma.$transaction(
          async (tx) => {
            await this.getEventForAttendance(tx, eventId, 'checkin');
            const member = await this.findMemberByPhone(tx, input.phoneNumber);
            const attendeeType = member ? AttendeeType.MEMBER : AttendeeType.NEW_ATTENDEE;
            const existingCheckIn = await this.findExistingCheckIn(tx, eventId, phoneKey, member?.id);

            if (existingCheckIn) {
              return {
                outcome: 'already_checked_in' as const,
                registrationId: existingCheckIn.registrationId,
                checkInId: existingCheckIn.id,
                checkedInAt: existingCheckIn.checkedInAt,
                attendee: {
                  fullName: existingCheckIn.fullNameSnapshot,
                  phoneNumber: existingCheckIn.phoneNumberSnapshot,
                  attendeeType: existingCheckIn.attendeeType,
                },
              };
            }

            let registration = await this.findExistingRegistration(tx, eventId, phoneKey, member?.id);
            let outcome: 'registered_and_checked_in' | 'checked_in_existing_registration' = 'checked_in_existing_registration';

            if (!registration) {
              registration = await tx.eventRegistration.create({
                data: {
                  eventId,
                  memberId: member?.id ?? null,
                  fullName,
                  phoneNumber: normalizedPhone,
                  phoneKey,
                  email: member?.email ?? null,
                  attendeeType,
                  registrationSource: RegistrationSource.CHECKIN_AUTO,
                  status: EventRegistrationStatus.REGISTERED,
                },
                include: registrationInclude,
              });
              outcome = 'registered_and_checked_in';
            } else if (registration.memberId !== member?.id || registration.status !== EventRegistrationStatus.CHECKED_IN) {
              registration = await tx.eventRegistration.update({
                where: { id: registration.id },
                data: {
                  memberId: registration.memberId ?? member?.id ?? null,
                  attendeeType: member ? AttendeeType.MEMBER : registration.attendeeType,
                  fullName,
                  phoneNumber: normalizedPhone,
                },
                include: registrationInclude,
              });
            }

            const checkIn = await tx.eventCheckIn.create({
              data: {
                eventId,
                registrationId: registration.id,
                memberId: member?.id ?? registration.memberId ?? null,
                fullNameSnapshot: fullName,
                phoneNumberSnapshot: normalizedPhone,
                phoneKey,
                attendeeType: member ? AttendeeType.MEMBER : registration.attendeeType,
                checkInMethod: input.checkInMethod,
                checkInSource: input.checkInSource ?? CheckInSource.TABLET,
                accompanyingCount: input.accompanyingCount ?? 0,
                checkedInByUserId: checkedInByUserId ?? null,
              },
              include: checkInInclude,
            });

            await tx.eventRegistration.update({
              where: { id: registration.id },
              data: { status: EventRegistrationStatus.CHECKED_IN },
            });

            if (member?.id) {
              await tx.member.update({
                where: { id: member.id },
                data: {
                  inChurch: true,
                  lastSeenAt: checkIn.checkedInAt,
                  attendanceCount: { increment: 1 },
                },
              });
            }

            return {
              outcome,
              registrationId: registration.id,
              checkInId: checkIn.id,
              checkedInAt: checkIn.checkedInAt,
              attendee: {
                fullName,
                phoneNumber: normalizedPhone,
                attendeeType: checkIn.attendeeType,
              },
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        ),
      async () => {
        const member = await this.findMemberByPhone(prisma as unknown as Prisma.TransactionClient, input.phoneNumber);
        return this.readExistingCheckInOutcome(eventId, phoneKey, member?.id);
      }
    );
  }

  async listAttendance(eventId: string, filters: AttendanceListQuery) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, attendanceEnabled: true },
    });

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const where: Prisma.EventCheckInWhereInput = { eventId };

    if (filters.attendeeType) {
      where.attendeeType = filters.attendeeType;
    }

    if (filters.method) {
      where.checkInMethod = filters.method;
    }

    if (filters.search) {
      where.OR = [
        { fullNameSnapshot: { contains: filters.search, mode: 'insensitive' } },
        { phoneNumberSnapshot: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.checkedInFrom || filters.checkedInTo) {
      where.checkedInAt = {};
      if (filters.checkedInFrom) where.checkedInAt.gte = new Date(filters.checkedInFrom);
      if (filters.checkedInTo) where.checkedInAt.lte = new Date(filters.checkedInTo);
    }

    return prisma.eventCheckIn.findMany({
      where,
      orderBy: { checkedInAt: 'desc' },
      select: {
        id: true,
        fullNameSnapshot: true,
        phoneNumberSnapshot: true,
        attendeeType: true,
        checkInMethod: true,
        accompanyingCount: true,
        checkedInAt: true,
      },
    });
  }

  async getAttendanceSummary(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, attendanceEnabled: true },
    });

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const [totalRegistered, totalCheckedIn, totalAccompanyingGuests, attendeeBreakdown, methodBreakdown, noShowCount] =
      await Promise.all([
        prisma.eventRegistration.count({
          where: {
            eventId,
            status: { not: EventRegistrationStatus.CANCELLED },
          },
        }),
        prisma.eventCheckIn.count({ where: { eventId } }),
        prisma.eventCheckIn.aggregate({
          where: { eventId },
          _sum: { accompanyingCount: true },
        }),
        prisma.eventCheckIn.groupBy({
          by: ['attendeeType'],
          where: { eventId },
          _count: { _all: true },
        }),
        prisma.eventCheckIn.groupBy({
          by: ['checkInMethod'],
          where: { eventId },
          _count: { _all: true },
        }),
        prisma.eventRegistration.count({
          where: {
            eventId,
            status: EventRegistrationStatus.NO_SHOW,
          },
        }),
      ]);

    const attendeeCounts = Object.fromEntries(attendeeBreakdown.map((row) => [row.attendeeType, row._count._all]));
    const methodCounts = Object.fromEntries(methodBreakdown.map((row) => [row.checkInMethod, row._count._all]));

    return {
      totalAttendees: totalCheckedIn + (totalAccompanyingGuests._sum.accompanyingCount ?? 0),
      totalCheckedIn,
      totalRegistered,
      totalMembers: attendeeCounts[AttendeeType.MEMBER] ?? 0,
      totalVisitors: attendeeCounts[AttendeeType.VISITOR] ?? 0,
      totalNewAttendees: attendeeCounts[AttendeeType.NEW_ATTENDEE] ?? 0,
      totalQrCheckIns: methodCounts[CheckInMethod.QR] ?? 0,
      totalDeskOrManualCheckIns: (methodCounts[CheckInMethod.DESK] ?? 0) + (methodCounts[CheckInMethod.MANUAL] ?? 0),
      totalNoShow: noShowCount,
      totalAccompanyingGuests: totalAccompanyingGuests._sum.accompanyingCount ?? 0,
    };
  }

  async getAttendanceTimeline(eventId: string, query: AttendanceTimelineQuery) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, attendanceEnabled: true },
    });

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const bucketMinutes = query.bucketMinutes ?? 15;
    const rows = await prisma.eventCheckIn.findMany({
      where: { eventId },
      orderBy: { checkedInAt: 'asc' },
      select: { checkedInAt: true },
    });

    const buckets = new Map<string, number>();

    rows.forEach((row) => {
      const bucketDate = new Date(row.checkedInAt);
      const minutes = bucketDate.getUTCMinutes();
      const flooredMinutes = Math.floor(minutes / bucketMinutes) * bucketMinutes;
      bucketDate.setUTCMinutes(flooredMinutes, 0, 0);
      const key = bucketDate.toISOString();
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    let cumulativeCount = 0;

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timeBucket, checkInCount]) => {
        cumulativeCount += checkInCount;
        return {
          timeBucket,
          checkInCount,
          cumulativeCount,
        };
      });
  }
}

export const eventAttendanceService = new EventAttendanceService();
