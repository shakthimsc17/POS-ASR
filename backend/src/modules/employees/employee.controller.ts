import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma';
import { AuthenticatedRequest } from '../../middleware/auth';

export const listEmployees = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        employeeName: true,
        email: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ employees });
  } catch (error: any) {
    console.error('List employees error:', error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

export const createEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeName, email, username, password, role, status } = req.body;

    if (!employeeName || !username || !password) {
      return res.status(400).json({ error: 'Employee name, username, and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newEmployee = await prisma.user.create({
      data: {
        employeeName: employeeName.trim(),
        email: email ? email.trim() : null,
        username: cleanUsername,
        passwordHash,
        role: role === 'ADMIN' ? 'ADMIN' : 'SALESPERSON',
        status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      },
      select: {
        id: true,
        employeeName: true,
        email: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: 'Employee created successfully',
      employee: newEmployee,
    });
  } catch (error: any) {
    console.error('Create employee error:', error);
    return res.status(500).json({ error: 'Failed to create employee' });
  }
};

export const updateEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeName, email, role, status } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Prevent deactivating own account
    if (req.user?.id === id && status === 'INACTIVE') {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        employeeName: employeeName ? employeeName.trim() : existing.employeeName,
        email: email !== undefined ? (email ? email.trim() : null) : existing.email,
        role: role ? (role === 'ADMIN' ? 'ADMIN' : 'SALESPERSON') : existing.role,
        status: status ? (status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') : existing.status,
      },
      select: {
        id: true,
        employeeName: true,
        email: true,
        username: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return res.json({
      message: 'Employee updated successfully',
      employee: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update employee' });
  }
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};
