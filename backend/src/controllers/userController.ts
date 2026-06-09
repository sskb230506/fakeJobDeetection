import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Creates or retrieves a user profile by email
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: 'Email and name are required' });
      return;
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email, name },
      });
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * Retrieves user details along with recent job analysis logs
 */
export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        analyses: {
          include: {
            company: true,
          },
          orderBy: {
            scannedAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
