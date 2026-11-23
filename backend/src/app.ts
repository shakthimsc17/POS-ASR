import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import employeeRoutes from './modules/employees/employee.routes';
import categoryRoutes from './modules/categories/category.routes';
import productRoutes from './modules/products/product.routes';
import purchaseRoutes from './modules/purchases/purchase.routes';
import salesRoutes from './modules/sales/sales.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import expenseRoutes from './modules/expenses/expense.routes';
import reportRoutes from './modules/reports/report.routes';
import settingsRoutes from './modules/settings/settings.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ASRTEX Textile POS API',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingsRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
