import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prismaClient';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth';
import logger from '../utils/logger';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      res.status(400).json({ status: 'error', message: 'Email and password are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ status: 'error', message: 'Email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: 'student'
      },
    });

    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        token,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          xp: user.xp,
          level: user.level,
          streak: user.streak
        }
      }
    });
  } catch (error) {
    logger.error('Register error', error instanceof Error ? error : new Error(String(error)), {
      email: req.body.email,
      ip: req.ip
    });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Invalid email or password' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ status: 'error', message: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          xp: user.xp,
          level: user.level,
          streak: user.streak,
          lastActive: user.lastActive
        }
      }
    });
  } catch (error) {
    logger.error('Login error', error instanceof Error ? error : new Error(String(error)), {
      email: req.body.email,
      ip: req.ip
    });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    // Support both refresh_token and refresh for backward compatibility
    const refreshToken = req.body.refresh_token || req.body.refresh;
    if (!refreshToken) {
      res.status(400).json({ status: 'error', message: 'Refresh token is required' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.userId) {
      res.status(401).json({ status: 'error', message: 'Invalid refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(401).json({ status: 'error', message: 'User no longer exists' });
      return;
    }

    const access_token = generateToken(user.id, user.role);
    const new_refresh_token = generateRefreshToken(user.id, user.role);

    res.json({
      status: 'success',
      data: {
        access_token,
        refresh_token: new_refresh_token
      }
    });
  } catch (error) {
    logger.error('Token refresh error', error instanceof Error ? error : new Error(String(error)));
    res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
  }
};

export const me = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: true,
        bookmarks: true,
        achievements: true
      }
    });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          xp: user.xp,
          level: user.level,
          streak: user.streak,
          lastActive: user.lastActive
        },
        progress: user.progress,
        bookmarks: user.bookmarks,
        achievements: user.achievements
      }
    });
  } catch (error) {
    logger.error('Get user profile error', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.userId
    });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const updateProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { username, email, bio, location, website } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } }
      });
      if (existingUser) {
        res.status(409).json({ status: 'error', message: 'Email is already in use' });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        location: true,
        website: true,
        role: true,
        xp: true,
        level: true,
        streak: true,
        lastActive: true
      }
    });

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    logger.error('Update profile error', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.userId,
      email: req.body.email
    });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const changePassword = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ status: 'error', message: 'Current password and new password are required' });
      return;
    }

    // Validate new password complexity
    if (newPassword.length < 8 ||
        !/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) ||
        !/[^A-Za-z0-9]/.test(newPassword)) {
      res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.userId
    });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const uploadAvatar = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;

    // Support both multipart (req.file) and base64 (req.body.avatar)
    let avatarPath: string;

    if (req.file) {
      // Multer uploaded file
      avatarPath = `/avatars/${req.file.filename}`;
    } else if (req.body.avatar) {
      // Base64 data URL - for demo store as-is
      avatarPath = req.body.avatar;
    } else {
      res.status(400).json({ status: 'error', message: 'No avatar provided' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarPath },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true
      }
    });

    res.json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
