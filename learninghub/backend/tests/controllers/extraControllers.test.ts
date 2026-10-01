import { Request, Response } from 'express'
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
} from '../../src/controllers/cartController'
import {
  getMyCertificates,
  generateCertificate,
  verifyCertificate,
} from '../../src/controllers/certificatesController'
import {
  listContests,
  getContest,
  getLeaderboard,
  registerContest,
  getContestResults,
} from '../../src/controllers/contestsController'
import {
  getWeb3Profile,
  updateWallet,
  getNFTCertificates,
  mintNFT,
} from '../../src/controllers/web3Controller'

jest.mock('../../src/services/CartService', () => ({
  cartService: {
    getCart: jest.fn().mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          course: { id: 'crs-node-expert', title: 'Node Expert', price: 50 },
          quantity: 1,
          added_at: new Date().toISOString(),
        },
      ],
      total_items: 1,
      subtotal: 50,
      discount: 0,
      total: 50,
      currency: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    addToCart: jest.fn().mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          course: { id: 'crs-node-expert', title: 'Node Expert', price: 50 },
          quantity: 1,
          added_at: new Date().toISOString(),
        },
      ],
      total_items: 1,
      subtotal: 50,
      discount: 0,
      total: 50,
      currency: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    updateItem: jest.fn().mockResolvedValue({
      id: 'item-1',
      course: { id: 'crs-node-expert', title: 'Node Expert', price: 50 },
      quantity: 3,
      added_at: new Date().toISOString(),
    }),
    removeItem: jest.fn().mockResolvedValue({
      id: 'cart-1',
      items: [],
      total_items: 0,
      subtotal: 0,
      discount: 0,
      total: 0,
      currency: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    clearCart: jest.fn().mockResolvedValue({
      id: 'cart-1',
      items: [],
      total_items: 0,
      subtotal: 0,
      discount: 0,
      total: 0,
      currency: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    applyCoupon: jest.fn().mockResolvedValue({
      success: true,
      discount: 10,
      newTotal: 40,
    }),
  },
}))

jest.mock('../../src/services/CertificateService', () => ({
  certificateService: {
    getUserCertificates: jest.fn().mockResolvedValue([
      {
        id: 'cert-1',
        code: 'LH-CERT-2026-TEST',
        title: 'Course Completion Certificate',
        recipient_name: 'test',
        issue_date: new Date().toISOString(),
        download_url: 'https://learninghub.dev/certs/LH-CERT-2026-TEST.pdf',
      },
    ]),
    generateCertificate: jest.fn().mockResolvedValue({
      id: 'cert-1',
      code: 'LH-CERT-2026-TEST',
      title: 'Course Completion Certificate',
      recipient_name: 'test',
      issue_date: new Date().toISOString(),
      download_url: 'https://learninghub.dev/certs/LH-CERT-2026-TEST.pdf',
    }),
    verifyCertificate: jest.fn().mockResolvedValue({
      isValid: true,
      code: 'LH-CERT-2026-TEST',
      title: 'Course Completion Certificate',
      recipient_name: 'test',
      issue_date: new Date().toISOString(),
    }),
  },
}))

describe('Extra Feature Controllers', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let nextFn: jest.Mock

  beforeEach(() => {
    mockReq = {
      user: { userId: 'test-user-extra-123', email: 'test@example.com', role: 'STUDENT' },
      body: {},
      params: {},
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    nextFn = jest.fn()
  })

  describe('cartController', () => {
    it('should retrieve cart', async () => {
      await getCart(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should add item to cart', async () => {
      mockReq.body = { course_id: 'crs-node-expert', quantity: 1 }
      await addToCart(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should update cart item', async () => {
      mockReq.params = { id: 'item-1' }
      mockReq.body = { quantity: 3 }
      await updateCartItem(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should remove item from cart', async () => {
      mockReq.params = { id: 'item-1' }
      await removeFromCart(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should clear cart', async () => {
      await clearCart(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should apply coupon', async () => {
      mockReq.body = { coupon_code: 'LEARN50' }
      await applyCoupon(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })
  })

  describe('certificatesController', () => {
    it('should return user certificates', async () => {
      await getMyCertificates(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should generate certificate', async () => {
      mockReq.body = { courseId: 'crs-system-arch' }
      await generateCertificate(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(201)
    })

    it('should verify certificate code', async () => {
      mockReq.params = { code: 'LH-CERT-2026-TEST' }
      await verifyCertificate(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })
  })

  describe('contestsController', () => {
    it('should list all contests', async () => {
      await listContests(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should get contest by id', async () => {
      mockReq.params = { id: 'contest-2026-w1' }
      await getContest(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should return 404 for invalid contest id', async () => {
      mockReq.params = { id: 'unknown-id' }
      await getContest(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(404)
    })

    it('should get contest leaderboard', async () => {
      mockReq.params = { id: 'contest-2026-w1' }
      await getLeaderboard(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should register for contest', async () => {
      mockReq.params = { id: 'contest-2026-w1' }
      await registerContest(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should get contest results', async () => {
      mockReq.params = { id: 'contest-2026-w1' }
      await getContestResults(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })
  })

  describe('web3Controller', () => {
    it('should get web3 profile', async () => {
      await getWeb3Profile(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should update wallet address', async () => {
      mockReq.body = { wallet_address: '0x0987654321fedcba0987654321fedcba09876543' }
      await updateWallet(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should reject invalid wallet address with 400', async () => {
      mockReq.body = { wallet_address: '0xinvalid-wallet-address' }
      await updateWallet(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should reject unauthenticated wallet update with 401', async () => {
      const unauthReq = { ...mockReq, user: undefined, body: { wallet_address: '0x0987654321fedcba0987654321fedcba09876543' } }
      await updateWallet(unauthReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should get NFT certificates', async () => {
      await getNFTCertificates(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should mint NFT certificate', async () => {
      mockReq.body = { course_id: 'crs-solidity-101' }
      await mintNFT(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(201)
    })

    it('should reject unauthenticated NFT mint with 401', async () => {
      const unauthReq = { ...mockReq, user: undefined, body: { course_id: 'crs-solidity-101' } }
      await mintNFT(unauthReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(401)
    })
  })
})
