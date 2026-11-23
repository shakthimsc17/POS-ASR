import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for ASRTEX Textile POS...');

  // 1. Seed Store Settings
  const existingSettings = await prisma.storeSettings.findFirst();
  if (!existingSettings) {
    await prisma.storeSettings.create({
      data: {
        storeName: 'ASRTEX Textile & Readymades',
        addressLine1: '42, Bazaar Main Road',
        city: 'Tiruppur',
        state: 'Tamil Nadu',
        pincode: '641601',
        phone: '+91 98421 54321',
        email: 'billing@asrtexpos.com',
        gstin: '33AAAAA0000A1Z5',
        gstEnabled: true,
        currency: 'INR',
        currencySymbol: '₹',
        invoicePrefix: 'ASR-',
        nextInvoiceNum: 1001,
        receiptFooter: 'Thank you for shopping at ASRTEX! Please visit again.',
        receiptPaperSize: '80mm',
        printShopLogo: false,
        printGstDetails: true,
        barcodeLabelWidth: 50,
        barcodeLabelHeight: 25,
      },
    });
    console.log('✓ Store settings initialized');
  }

  // 2. Seed Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const salesPassword = await bcrypt.hash('sales123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      employeeName: 'Store Administrator',
      email: 'admin@asrtexpos.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const sales = await prisma.user.upsert({
    where: { username: 'sales' },
    update: {},
    create: {
      username: 'sales',
      employeeName: 'Karthik Raja',
      email: 'karthik@asrtexpos.com',
      passwordHash: salesPassword,
      role: 'SALESPERSON',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Users created: Admin (admin / admin123), Sales (sales / sales123)');

  // 3. Seed Categories & Subcategories
  const menCat = await prisma.category.upsert({
    where: { name: 'Men' },
    update: {},
    create: { name: 'Men' },
  });

  const womenCat = await prisma.category.upsert({
    where: { name: 'Women' },
    update: {},
    create: { name: 'Women' },
  });

  const kidsCat = await prisma.category.upsert({
    where: { name: 'Kids' },
    update: {},
    create: { name: 'Kids' },
  });

  // Subcategories
  const subCats = [
    { name: 'Shirts', parentId: menCat.id },
    { name: 'Pants & Trousers', parentId: menCat.id },
    { name: 'T-Shirts', parentId: menCat.id },
    { name: 'Sarees', parentId: womenCat.id },
    { name: 'Chudithar & Salwars', parentId: womenCat.id },
    { name: 'Kurtis & Tops', parentId: womenCat.id },
    { name: 'Boys Wear', parentId: kidsCat.id },
    { name: 'Girls Frocks', parentId: kidsCat.id },
  ];

  const categoryMap: { [key: string]: string } = { Men: menCat.id, Women: womenCat.id, Kids: kidsCat.id };
  for (const sc of subCats) {
    const created = await prisma.category.upsert({
      where: { name: sc.name },
      update: { parentId: sc.parentId },
      create: { name: sc.name, parentId: sc.parentId },
    });
    categoryMap[sc.name] = created.id;
  }
  console.log('✓ Textile categories and subcategories created');

  // 4. Seed Brands
  const brandNames = ['ASRTEX Cotton', 'Raymond', 'Manyavar', 'Pothys Choice', 'Ramraj Cotton'];
  const brandMap: { [key: string]: string } = {};
  for (const b of brandNames) {
    const brand = await prisma.brand.upsert({
      where: { name: b },
      update: {},
      create: { name: b },
    });
    brandMap[b] = brand.id;
  }
  console.log('✓ Apparel brands created');

  // 5. Seed Suppliers
  const supplier = await prisma.supplier.upsert({
    where: { id: 'supp-001' },
    update: {},
    create: {
      id: 'supp-001',
      name: 'Coimbatore Weaving Mills Ltd',
      contactPerson: 'Mr. Subramanian',
      phone: '+91 94432 12345',
      email: 'sales@cbmills.com',
      gstin: '33BBBBB1111B1Z2',
      address: 'Industrial Estate, Coimbatore',
    },
  });
  console.log('✓ Textile suppliers created');

  // 6. Seed Expense Categories
  const expenseCats = ['Shop Rent', 'Electricity Bill', 'Employee Salary', 'Tea & Refreshments', 'Store Maintenance', 'Transport & Courier'];
  for (const ec of expenseCats) {
    await prisma.expenseCategory.upsert({
      where: { name: ec },
      update: {},
      create: { name: ec },
    });
  }
  console.log('✓ Expense categories created');

  // 7. Seed Sample Textile Products with Size x Color Variants
  // Product 1: Pure Cotton Formal Shirt
  const shirtProd = await prisma.product.upsert({
    where: { itemCode: 'SHT-101' },
    update: {},
    create: {
      itemCode: 'SHT-101',
      name: 'ASR Premium Cotton Formal Shirt',
      description: '100% Giza Cotton Breathable Formal Shirt',
      categoryId: categoryMap['Shirts'],
      brandId: brandMap['ASRTEX Cotton'],
      hsnCode: '6205',
      gstRate: 5.0,
      variants: {
        create: [
          {
            size: 'M',
            color: 'White',
            sku: 'SHT-101-M-WHT',
            barcode: '890123456701',
            costPrice: 420.0,
            mrp: 999.0,
            sellingPrice: 799.0,
            currentStock: 15,
            lowStockThreshold: 3,
          },
          {
            size: 'L',
            color: 'White',
            sku: 'SHT-101-L-WHT',
            barcode: '890123456702',
            costPrice: 420.0,
            mrp: 999.0,
            sellingPrice: 799.0,
            currentStock: 20,
            lowStockThreshold: 4,
          },
          {
            size: 'XL',
            color: 'Sky Blue',
            sku: 'SHT-101-XL-BLU',
            barcode: '890123456703',
            costPrice: 440.0,
            mrp: 999.0,
            sellingPrice: 799.0,
            currentStock: 12,
            lowStockThreshold: 3,
          },
          {
            size: 'XXL',
            color: 'Navy Blue',
            sku: 'SHT-101-XXL-NAV',
            barcode: '890123456704',
            costPrice: 460.0,
            mrp: 1099.0,
            sellingPrice: 899.0,
            currentStock: 8,
            lowStockThreshold: 2,
          },
        ],
      },
    },
  });

  // Product 2: Kanchipuram Soft Silk Saree
  const sareeProd = await prisma.product.upsert({
    where: { itemCode: 'SAR-201' },
    update: {},
    create: {
      itemCode: 'SAR-201',
      name: 'Kanchipuram Art Silk Saree with Zari Border',
      description: 'Traditional wedding collection saree with rich pallu',
      categoryId: categoryMap['Sarees'],
      brandId: brandMap['Manyavar'],
      hsnCode: '5007',
      gstRate: 5.0,
      variants: {
        create: [
          {
            size: 'Free Size',
            color: 'Maroon & Gold',
            sku: 'SAR-201-FS-MRN',
            barcode: '890123456705',
            costPrice: 1250.0,
            mrp: 2999.0,
            sellingPrice: 2499.0,
            currentStock: 10,
            lowStockThreshold: 2,
          },
          {
            size: 'Free Size',
            color: 'Peacock Green',
            sku: 'SAR-201-FS-GRN',
            barcode: '890123456706',
            costPrice: 1250.0,
            mrp: 2999.0,
            sellingPrice: 2499.0,
            currentStock: 7,
            lowStockThreshold: 2,
          },
        ],
      },
    },
  });

  // Product 3: Ramraj Pure White Cotton Dhoti
  const dhotiProd = await prisma.product.upsert({
    where: { itemCode: 'DHO-301' },
    update: {},
    create: {
      itemCode: 'DHO-301',
      name: 'Ramraj Traditional Gold Jari Dhoti (8 Mulam)',
      description: 'Traditional festival and temple wear dhoti',
      categoryId: categoryMap['Men'],
      brandId: brandMap['Ramraj Cotton'],
      hsnCode: '5208',
      gstRate: 5.0,
      variants: {
        create: [
          {
            size: '8 Mulam',
            color: 'White & Gold',
            sku: 'DHO-301-8M-WHT',
            barcode: '890123456707',
            costPrice: 380.0,
            mrp: 750.0,
            sellingPrice: 599.0,
            currentStock: 25,
            lowStockThreshold: 5,
          },
        ],
      },
    },
  });

  console.log('✓ Seeded sample textile products & variants');
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
