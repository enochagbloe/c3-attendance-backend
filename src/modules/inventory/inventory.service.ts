import { InventoryAction } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

interface CreateItemInput {
  name: string;
  category: string;
  quantity?: number;
  reorderLevel?: number;
  condition?: string;
  location?: string | null;
}

interface AdjustQuantityInput {
  itemId: string;
  action: InventoryAction;
  quantity: number;
  performedById: string;
  notes?: string;
}

class InventoryService {
  async createItem(data: CreateItemInput) {
    return prisma.inventoryItem.create({ data });
  }

  async listItems() {
    return prisma.inventoryItem.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async adjustQuantity({ itemId, action, quantity, performedById, notes }: AdjustQuantityInput) {
    if (quantity <= 0) throw new AppError('Quantity must be greater than 0', 400, 'INVALID_QUANTITY');

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new AppError('Item not found', 404, 'NOT_FOUND');

    let newQuantity = item.quantity;
    switch (action) {
      case InventoryAction.ADD:
      case InventoryAction.RETURN:
        newQuantity += quantity;
        break;
      case InventoryAction.REMOVE:
      case InventoryAction.ASSIGN:
      case InventoryAction.ADJUST:
        newQuantity -= quantity;
        if (newQuantity < 0) throw new AppError('Quantity cannot go below 0', 400, 'NEGATIVE_QUANTITY');
        break;
      default:
        throw new AppError('Unsupported action', 400, 'INVALID_ACTION');
    }

    const [updatedItem, log] = await prisma.$transaction([
      prisma.inventoryItem.update({ where: { id: itemId }, data: { quantity: newQuantity } }),
      prisma.inventoryLog.create({ data: { itemId, action, quantity, performedById, notes } }),
    ]);

    return { item: updatedItem, log };
  }

  async lowStock() {
    const items = await prisma.inventoryItem.findMany({ where: { reorderLevel: { gt: 0 } } });
    return items.filter((item) => item.quantity <= item.reorderLevel);
  }
}

export const inventoryService = new InventoryService();
