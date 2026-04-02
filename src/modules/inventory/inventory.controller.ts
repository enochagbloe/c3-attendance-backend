import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';
import { sendSuccess } from '../../utils/apiResponse';

class InventoryController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await inventoryService.createItem(req.body);
      return sendSuccess({ res, data: item, statusCode: 201, message: 'Item created' });
    } catch (err) {
      return next(err);
    }
  }

  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inventoryService.listItems();
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }

  async adjust(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inventoryService.adjustQuantity({ ...req.body, itemId: req.params.id, performedById: req.user!.id });
      return sendSuccess({ res, data, message: 'Quantity updated' });
    } catch (err) {
      return next(err);
    }
  }

  async lowStock(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inventoryService.lowStock();
      return sendSuccess({ res, data });
    } catch (err) {
      return next(err);
    }
  }
}

export const inventoryController = new InventoryController();
