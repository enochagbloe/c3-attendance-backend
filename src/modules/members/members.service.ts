import { MemberStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import crypto from 'crypto';
import { env } from '../../config/env';

export interface CreateMemberInput {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  gender?: string;
  primaryMembershipStatus: MemberStatus;
  departmentId?: string | null;
  dateOfBirth?: Date | string | null;
  joinedAt?: Date | string | null;
  baptizedHere?: boolean;
  maritalStatus: string;
  area?: string;
  city?: string;
  region?: string;
  landmarkOrAddressLine?: string;
  occupation?: string;
  workplaceName?: string;
  hasFamilyMemberAtChurch?: boolean;
  familyMemberName?: string;
  familyMemberPhone?: string;
  familyRelationship?: string;
  volunteerRecords?: {
    volunteerRoleId: string;
    departmentId?: string | null;
    ministryName?: string | null;
    startDate: Date | string;
    endDate?: Date | string | null;
  }[];
  leadershipRecords?: {
    leadershipRoleId: string;
    startDate: Date | string;
    endDate?: Date | string | null;
  }[];
  fellowshipIds?: string[];
  membershipStatuses?: {
    status: MemberStatus;
    effectiveDate: Date | string;
    endDate?: Date | string | null;
  }[];
}

export interface UpdateMemberInput extends Partial<CreateMemberInput> {}

class MembersService {
  private async assertNotDuplicate(data: CreateMemberInput, ignoreId?: string) {
    const conditions = [];
    if (data.email) {
      conditions.push({ email: data.email });
    }
    if (data.phone) {
      conditions.push({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
    }
    if (conditions.length === 0) return;

    const existing = await prisma.member.findFirst({
      where: {
        OR: conditions.map((c) => ({
          ...c,
          isDeleted: false,
          NOT: ignoreId ? { id: ignoreId } : undefined,
        })),
      },
      select: { id: true, email: true, phone: true },
    });
    if (existing) {
      throw new AppError('Member with same email or name/phone already exists', 409, 'MEMBER_DUPLICATE');
    }
  }

  private validateBusinessRules(data: CreateMemberInput) {
    if (!data.maritalStatus) throw new AppError('maritalStatus is required', 400, 'VALIDATION_ERROR');

    if (data.hasFamilyMemberAtChurch) {
      if (!data.familyMemberName || !data.familyMemberPhone || !data.familyRelationship) {
        throw new AppError('Family member details required', 400, 'VALIDATION_ERROR');
      }
    }

    const statuses = data.membershipStatuses?.map((s) => s.status) ?? [data.primaryMembershipStatus];
    const hasVisitor = statuses.includes(MemberStatus.VISITOR);
    if (hasVisitor && statuses.length > 1) {
      throw new AppError('Visitor status cannot be combined with other statuses', 400, 'STATUS_RULE');
    }

    // Volunteer requirements
    if (data.volunteerRecords?.length) {
      data.volunteerRecords.forEach((v) => {
        if (!v.startDate) throw new AppError('Volunteer startDate required', 400, 'VALIDATION_ERROR');
        if (!v.volunteerRoleId) throw new AppError('Volunteer role required', 400, 'VALIDATION_ERROR');
      });
    }

    // Leadership requirements
    if (data.leadershipRecords?.length) {
      data.leadershipRecords.forEach((l) => {
        if (!l.leadershipRoleId) throw new AppError('Leadership role required', 400, 'VALIDATION_ERROR');
        if (!l.startDate) throw new AppError('Leadership startDate required', 400, 'VALIDATION_ERROR');
      });
    }
  }

  async create(data: CreateMemberInput) {
    this.validateBusinessRules(data);
    await this.assertNotDuplicate(data);

    const now = new Date();
    const membershipStatuses =
      data.membershipStatuses && data.membershipStatuses.length > 0
        ? data.membershipStatuses
        : [{ status: data.primaryMembershipStatus, effectiveDate: now }];

    return prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          gender: data.gender,
          primaryMembershipStatus: data.primaryMembershipStatus,
          departmentId: data.departmentId ?? null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined,
          baptizedHere: data.baptizedHere ?? false,
          maritalStatus: data.maritalStatus,
          area: data.area,
          city: data.city,
          region: data.region,
          landmarkOrAddressLine: data.landmarkOrAddressLine,
          occupation: data.occupation,
          workplaceName: data.workplaceName,
          hasFamilyMemberAtChurch: data.hasFamilyMemberAtChurch ?? false,
          familyMemberName: data.familyMemberName,
          familyMemberPhone: data.familyMemberPhone,
          familyRelationship: data.familyRelationship,
        },
      });

      // statuses
      await tx.membershipStatusHistory.createMany({
        data: membershipStatuses.map((s) => ({
          memberId: member.id,
          status: s.status,
          effectiveDate: new Date(s.effectiveDate),
          endDate: s.endDate ? new Date(s.endDate) : null,
        })),
      });

      // volunteers
      if (data.volunteerRecords?.length) {
        await tx.volunteerRecord.createMany({
          data: data.volunteerRecords.map((v) => ({
            memberId: member.id,
            volunteerRoleId: v.volunteerRoleId,
            departmentId: v.departmentId ?? null,
            ministryName: v.ministryName ?? null,
            startDate: new Date(v.startDate),
            endDate: v.endDate ? new Date(v.endDate) : null,
          })),
        });
      }

      // leadership
      if (data.leadershipRecords?.length) {
        await tx.leadershipRecord.createMany({
          data: data.leadershipRecords.map((l) => ({
            memberId: member.id,
            leadershipRoleId: l.leadershipRoleId,
            startDate: new Date(l.startDate),
            endDate: l.endDate ? new Date(l.endDate) : null,
          })),
        });
      }

      // fellowships
      if (data.fellowshipIds?.length) {
        await tx.memberFellowship.createMany({
          data: data.fellowshipIds.map((fid) => ({
            memberId: member.id,
            fellowshipId: fid,
          })),
        });
      }

      return member;
    });
  }

  async list(includeDeleted = false, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = includeDeleted ? {} : { isDeleted: false };

    const [items, total] = await prisma.$transaction([
      prisma.member.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.member.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getById(id: string) {
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member || member.isDeleted) {
      throw new AppError('Member not found', 404, 'NOT_FOUND');
    }
    return member;
  }

  async update(id: string, data: UpdateMemberInput) {
    const current = await this.getById(id);
    const merged: CreateMemberInput = {
      firstName: data.firstName ?? current.firstName,
      lastName: data.lastName ?? current.lastName,
      phone: data.phone ?? current.phone ?? undefined,
      email: data.email ?? current.email ?? undefined,
      gender: data.gender ?? current.gender ?? undefined,
      primaryMembershipStatus: (data as any).primaryMembershipStatus ?? current.primaryMembershipStatus,
      departmentId: data.departmentId ?? current.departmentId ?? undefined,
      dateOfBirth: data.dateOfBirth ?? current.dateOfBirth ?? undefined,
      joinedAt: data.joinedAt ?? current.joinedAt ?? undefined,
      baptizedHere: data.baptizedHere ?? current.baptizedHere,
      maritalStatus: data.maritalStatus ?? current.maritalStatus,
      area: data.area ?? current.area ?? undefined,
      city: data.city ?? current.city ?? undefined,
      region: data.region ?? current.region ?? undefined,
      landmarkOrAddressLine: data.landmarkOrAddressLine ?? current.landmarkOrAddressLine ?? undefined,
      occupation: data.occupation ?? current.occupation ?? undefined,
      workplaceName: data.workplaceName ?? current.workplaceName ?? undefined,
      hasFamilyMemberAtChurch: data.hasFamilyMemberAtChurch ?? current.hasFamilyMemberAtChurch,
      familyMemberName: data.familyMemberName ?? current.familyMemberName ?? undefined,
      familyMemberPhone: data.familyMemberPhone ?? current.familyMemberPhone ?? undefined,
      familyRelationship: data.familyRelationship ?? current.familyRelationship ?? undefined,
      volunteerRecords: data.volunteerRecords,
      leadershipRecords: data.leadershipRecords,
      fellowshipIds: (data as any).fellowshipIds,
      membershipStatuses: data.membershipStatuses,
    };
    this.validateBusinessRules(merged);
    await this.assertNotDuplicate(merged, id);

    return prisma.$transaction(async (tx) => {
      const member = await tx.member.update({
        where: { id },
        data: {
          firstName: merged.firstName,
          lastName: merged.lastName,
          phone: merged.phone,
          email: merged.email,
          gender: merged.gender,
          primaryMembershipStatus: merged.primaryMembershipStatus,
          departmentId: merged.departmentId ?? null,
          dateOfBirth: merged.dateOfBirth ? new Date(merged.dateOfBirth) : null,
          joinedAt: merged.joinedAt ? new Date(merged.joinedAt) : null,
          baptizedHere: merged.baptizedHere ?? false,
          maritalStatus: merged.maritalStatus,
          area: merged.area,
          city: merged.city,
          region: merged.region,
          landmarkOrAddressLine: merged.landmarkOrAddressLine,
          occupation: merged.occupation,
          workplaceName: merged.workplaceName,
          hasFamilyMemberAtChurch: merged.hasFamilyMemberAtChurch ?? false,
          familyMemberName: merged.familyMemberName,
          familyMemberPhone: merged.familyMemberPhone,
          familyRelationship: merged.familyRelationship,
        },
      });

      // replace related collections if provided
      if (merged.membershipStatuses) {
        await tx.membershipStatusHistory.deleteMany({ where: { memberId: id } });
        await tx.membershipStatusHistory.createMany({
          data: merged.membershipStatuses.map((s) => ({
            memberId: id,
            status: s.status,
            effectiveDate: new Date(s.effectiveDate),
            endDate: s.endDate ? new Date(s.endDate) : null,
          })),
        });
      }

      if (merged.volunteerRecords) {
        await tx.volunteerRecord.deleteMany({ where: { memberId: id } });
        if (merged.volunteerRecords.length) {
          await tx.volunteerRecord.createMany({
            data: merged.volunteerRecords.map((v) => ({
              memberId: id,
              volunteerRoleId: v.volunteerRoleId,
              departmentId: v.departmentId ?? null,
              ministryName: v.ministryName ?? null,
              startDate: new Date(v.startDate),
              endDate: v.endDate ? new Date(v.endDate) : null,
            })),
          });
        }
      }

      if (merged.leadershipRecords) {
        await tx.leadershipRecord.deleteMany({ where: { memberId: id } });
        if (merged.leadershipRecords.length) {
          await tx.leadershipRecord.createMany({
            data: merged.leadershipRecords.map((l) => ({
              memberId: id,
              leadershipRoleId: l.leadershipRoleId,
              startDate: new Date(l.startDate),
              endDate: l.endDate ? new Date(l.endDate) : null,
            })),
          });
        }
      }

      if (merged.fellowshipIds) {
        await tx.memberFellowship.deleteMany({ where: { memberId: id } });
        if (merged.fellowshipIds.length) {
          await tx.memberFellowship.createMany({
            data: merged.fellowshipIds.map((fid) => ({ memberId: id, fellowshipId: fid })),
          });
        }
      }

      return member;
    });
  }

  async softDelete(id: string) {
    await this.getById(id);
    return prisma.member.update({ where: { id }, data: { isDeleted: true } });
  }

  async createSelfUpdateLink(memberId: string, expiresInMinutes = 60) {
    const member = await this.getById(memberId);
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await prisma.memberUpdateToken.create({
      data: { token, memberId, expiresAt },
    });

    const url = `${env.selfUpdateBaseUrl}?token=${token}`;
    return {
      memberId: member.id,
      token,
      expiresAt,
      url,
      qrPayload: url, // frontend can turn this string into a QR code
    };
  }

  async createInviteLink(expiresInMinutes = 1440) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await prisma.memberInviteToken.create({
      data: { token, expiresAt },
    });

    const url = `${env.selfRegisterBaseUrl}?token=${token}`;
    return { token, expiresAt, url, qrPayload: url };
  }

  async selfRegister(data: CreateMemberInput & { token: string }) {
    const invite = await prisma.memberInviteToken.findUnique({ where: { token: data.token } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw new AppError('Invalid or expired invite token', 400, 'INVALID_TOKEN');
    }

    // reuse create logic but ensure primary status present
    const payload: CreateMemberInput = {
      ...data,
      primaryMembershipStatus: data.primaryMembershipStatus ?? MemberStatus.NEW_MEMBER,
    };
    this.validateBusinessRules(payload);

    const member = await this.create(payload);
    await prisma.memberInviteToken.update({
      where: { token: data.token },
      data: { usedAt: new Date() },
    });
    return member;
  }
}

export const membersService = new MembersService();
