import { Request, Response } from 'express';
import prisma from '../../config/prisma';

export const getStoreSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.storeSettings.findFirst();
    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {},
      });
    }
    return res.json({ settings });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateStoreSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body;
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
          barcodeLabelWidth: data.barcodeLabelWidth ? Number(data.barcodeLabelWidth) : undefined,
          barcodeLabelHeight: data.barcodeLabelHeight ? Number(data.barcodeLabelHeight) : undefined,
        },
      });
    }

    return res.json({ message: 'Settings updated successfully', settings });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
};
