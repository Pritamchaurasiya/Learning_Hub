import { Request, Response } from 'express'
import { crdtSimulationController } from '../../controllers/CrdtSimulationController'

describe('CrdtSimulationController (Milestone 35)', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    req = {}
    res = {
      status: statusMock,
      json: jsonMock,
    }
  })

  it('getTopology should return 200 with topology snapshot', async () => {
    await crdtSimulationController.getTopology(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          peers: expect.any(Object),
          isPartitioned: expect.any(Boolean),
        }),
      })
    )
  })

  it('localInsert should validate parameters and return 200 with updated peer', async () => {
    req.body = { peerId: 'alice', index: 0, char: 'Z' }
    await crdtSimulationController.localInsert(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          peerId: 'alice',
          renderedText: expect.any(String),
        }),
      })
    )
  })

  it('localInsert should reject invalid peerId with 400', async () => {
    req.body = { peerId: 'unknown-peer', index: 0, char: 'Z' }
    await crdtSimulationController.localInsert(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('setPartition and syncAll should manage partition lifecycle with 200', async () => {
    req.body = { isolatedPeer: 'bob', partitionActive: true }
    await crdtSimulationController.setPartition(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          isPartitioned: true,
          isolatedPeers: expect.arrayContaining(['bob']),
        }),
      })
    )

    // Sync all
    await crdtSimulationController.syncAll(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('verifyAlgebraicLaws should return 200 with formal semilattice proofs', async () => {
    await crdtSimulationController.verifyAlgebraicLaws(req as Request, res as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          isCommutative: true,
          isAssociative: true,
          isIdempotent: true,
          convergenceVerified: true,
        }),
      })
    )
  })
})
