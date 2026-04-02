import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { ServiceType } from '@prisma/client';

interface CreateServiceInput {
  name: string;
  type: ServiceType;
  date: Date;
  startTime?: Date | null;
  endTime?: Date | null;
  notes?: string | null;
}

class ServicesService {
  async create(data: CreateServiceInput) {
    return prisma.service.create({ data });
  }

  async list() {
    return prisma.service.findMany({ orderBy: { date: 'desc' } });
  }

  async getById(id: string) {
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) throw new AppError('Service not found', 404, 'NOT_FOUND');
    return service;
  }
}

export const servicesService = new ServicesService();
