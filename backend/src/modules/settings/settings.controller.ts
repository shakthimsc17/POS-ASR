import { Request, Response } from 'express';
import prisma from '../../config/prisma';

export const getStoreSettings = async (req: Request, res: Response) => {
  try {
    let settings;
    try {
      settings = await prisma.storeSettings.findFirst();
    } catch (dbErr: any) {
      // Auto-heal if column is missing in database table
      if (
        dbErr.message?.includes('showMrpOnReceipt') ||
        dbErr.message?.includes('does not exist')
      ) {
        console.log('⚡ Adding missing showMrpOnReceipt column to StoreSettings table...');
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "showMrpOnReceipt" BOOLEAN DEFAULT true;`
        );
        settings = await prisma.storeSettings.findFirst();
      } else {
        throw dbErr;
      }
    }

    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {},
      });
    }
    return res.json({ settings });
  } catch (error: any) {
    console.error('getStoreSettings error:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateStoreSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Ensure column exists before updating
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "showMrpOnReceipt" BOOLEAN DEFAULT true;`
      );
    } catch (e) {
      // ignore
    }

    let settings = await prisma.storeSettings.findFirst();

    if (!settings) {
      settings = await prisma.storeSettings.create({ data });
    } else {
      settings = await prisma.storeSettings.update({
        where: { id: settings.id },
        data: {
          storeName: data.storeName,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          phone: data.phone,
          email: data.email,
          gstin: data.gstin,
          gstEnabled: data.gstEnabled !== undefined ? Boolean(data.gstEnabled) : undefined,
          currency: data.currency,
          currencySymbol: data.currencySymbol,
          invoicePrefix: data.invoicePrefix,
          receiptFooter: data.receiptFooter,
          receiptPaperSize: data.receiptPaperSize,
          printShopLogo: data.printShopLogo !== undefined ? Boolean(data.printShopLogo) : undefined,
          printGstDetails: data.printGstDetails !== undefined ? Boolean(data.printGstDetails) : undefined,
          showMrpOnReceipt: data.showMrpOnReceipt !== undefined ? Boolean(data.showMrpOnReceipt) : undefined,
          barcodeLabelWidth: data.barcodeLabelWidth ? Number(data.barcodeLabelWidth) : undefined,
          barcodeLabelHeight: data.barcodeLabelHeight ? Number(data.barcodeLabelHeight) : undefined,
        } as any,
      });
    }

    return res.json({ message: 'Settings updated successfully', settings });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const resetDatabase = async (req: Request, res: Response) => {
  try {
    const { resetScope = 'TRANSACTIONS_ONLY', startingInvoiceNumber = 1001, confirmationPhrase } = req.body;

    if (confirmationPhrase !== 'RESET-ASRTEX') {
      return res.status(400).json({
        error: 'Invalid confirmation phrase. Please type RESET-ASRTEX exactly to proceed.',
      });
    }

    const nextInvoiceNum = parseInt(startingInvoiceNumber, 10) || 1001;

    // Execute atomic truncation transaction
    await prisma.$transaction(async (tx) => {
      // 1. Wipe Sales Orders, Items, Returns, Stock Movements, Adjustments, Purchases, Suppliers, Expenses, Customers
      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE "OrderReturn", "OrderItem", "Order", "StockMovement", "StockAdjustmentItem", "StockAdjustment", "PurchaseItem", "Purchase", "Supplier", "Expense", "Customer" CASCADE;`
      );

      if (resetScope === 'FULL_WIPE') {
        // Full Wipe: Clear all test products, variants, brands, and categories
        await tx.$executeRawUnsafe(
          `TRUNCATE TABLE "ProductVariant", "Product", "Brand", "Category" CASCADE;`
        );
      } else {
        // Transactions Only: Reset variant currentStock to 0 ready for real purchase entries
        await tx.$executeRawUnsafe(`UPDATE "ProductVariant" SET "currentStock" = 0;`);
      }

      // Reset next invoice counter in StoreSettings
      await tx.$executeRawUnsafe(
        `UPDATE "StoreSettings" SET "nextInvoiceNum" = ${nextInvoiceNum};`
      );
    });

    return res.json({
      message:
        resetScope === 'FULL_WIPE'
          ? 'Store factory reset complete! All test products and orders cleared. Ready for live catalog import.'
          : 'Transactions wiped successfully! Test orders cleared and inventory reset. Products preserved.',
      resetScope,
      nextInvoiceNum,
    });
  } catch (error: any) {
    console.error('resetDatabase error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reset database' });
  }
};

