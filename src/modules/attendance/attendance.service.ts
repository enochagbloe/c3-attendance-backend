import { Prisma, MemberStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

interface CheckInInput {
  memberId: string;
  serviceId: string;
}

class AttendanceService {
  async checkIn({ memberId, serviceId }: CheckInInput) {
    // ensure member and service exist
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.isDeleted) {
      throw new AppError('Member not found', 404, 'NOT_FOUND');
    }
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
    }

    try {
    const attendance = await prisma.attendance.create({ data: { memberId, serviceId } });
    await prisma.member.update({
      where: { id: memberId },
      data: {
        inChurch: true,
        lastSeenAt: attendance.checkInAt,
        attendanceCount: { increment: 1 },
        primaryMembershipStatus:
          member.primaryMembershipStatus === MemberStatus.VISITOR ? MemberStatus.CHURCH_MEMBER : member.primaryMembershipStatus,
      },
    });
      return attendance;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('Member already checked in for this service', 409, 'DUPLICATE_CHECKIN');
      }
      throw err;
    }
  }

  async getToday() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return prisma.attendance.findMany({
      where: { checkInAt: { gte: start, lte: end } },
      include: { member: true, service: true },
      orderBy: { checkInAt: 'desc' },
    });
  }

  async getByDateRange(startDate: Date, endDate: Date) {
    return prisma.attendance.findMany({
      where: { checkInAt: { gte: startDate, lte: endDate } },
      include: { member: true, service: true },
      orderBy: { checkInAt: 'desc' },
    });
  }

  async closeService(serviceId: string) {
    const records = await prisma.attendance.findMany({ where: { serviceId }, select: { memberId: true } });
    const ids = Array.from(new Set(records.map((r) => r.memberId)));
    if (ids.length === 0) return { updated: 0 };
    const updated = await prisma.member.updateMany({
      where: { id: { in: ids } },
      data: { inChurch: false },
    });
    return { updated: updated.count };
  }
}

export const attendanceService = new AttendanceService();
