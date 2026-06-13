import { Request, Response } from 'express'
import { CartService } from '../services/CartService'
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'
import logger from '../utils/logger'

export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendUnauthorized(res)
      return
    }
    const cart = await CartService.getCart(req.user.userId)
    sendSuccess(res, cart)
  } catch (error) {
    logger.error('Cart getCart error', error instanceof Error ? error : new Error(String(error)), {
      userId: req.user?.userId,
    })
    sendInternalError(res)
  }
}

export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendUnauthorized(res)
      return
    }
    const { course_id, quantity } = req.body
    if (!course_id || typeof course_id !== 'string') {
      sendValidationError(res, 'Valid course_id is required')
      return
    }
    const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1
    const cart = await CartService.addToCart(req.user.userId, course_id, qty)
    sendCreated(res, cart)
  } catch (error) {
    logger.error(
      'Cart addToCart error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.body?.course_id,
      }
    )
    sendInternalError(res)
  }
}

export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendUnauthorized(res)
      return
    }
    const id = req.params.id as string
    const { quantity } = req.body
    if (!id) {
      sendValidationError(res, 'Cart item ID is required')
      return
    }
    const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1
    const cart = await CartService.updateItemQuantity(req.user.userId, id, qty)
    sendSuccess(res, cart)
  } catch (error) {
    logger.error(
      'Cart updateCartItem error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        itemId: req.params?.id,
      }
    )
    sendInternalError(res)
  }
}

export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendUnauthorized(res)
      return
    }
    const id = req.params.id as string
    if (!id) {
      sendValidationError(res, 'Cart item ID is required')
      return
    }
    const cart = await CartService.removeItem(req.user.userId, id)
    sendSuccess(res, cart)
  } catch (error) {
    logger.error(
      'Cart removeFromCart error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        itemId: req.params?.id,
      }
    )
    sendInternalError(res)
  }
}

export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendUnauthorized(res)
      return
    }
    const cart = await CartService.clearCart(req.user.userId)
    sendSuccess(res, cart)
  } catch (error) {
    logger.error(
      'Cart clearCart error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
      }
    )
    sendInternalError(res)
  }
}
