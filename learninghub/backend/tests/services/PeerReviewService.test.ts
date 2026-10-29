import { peerReviewService } from '../../src/services/PeerReviewService'

describe('PeerReviewService', () => {
  it('should return all assignments', async () => {
    const list = await peerReviewService.getAssignments()
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
  })

  it('should filter assignments by status', async () => {
    const pending = await peerReviewService.getAssignments('pending')
    expect(pending.every(a => a.status === 'pending')).toBe(true)
  })

  it('should retrieve assignment by ID', async () => {
    const item = await peerReviewService.getAssignmentById('pr-assign-1')
    expect(item).not.toBeNull()
    expect(item?.id).toBe('pr-assign-1')
  })

  it('should submit feedback and transition status to submitted', async () => {
    const updated = await peerReviewService.submitReview('pr-assign-1', {
      comments: 'Optimal doubly linked list implementation with O(1) eviction.',
      criteriaScores: { correctness: 35, code_quality: 25, time_complexity: 25, documentation: 15 },
      score: 100,
    })
    expect(updated.status).toBe('submitted')
    expect(updated.feedback?.score).toBe(100)
  })

  it('should mark assignment as disputed with reason', async () => {
    const disputed = await peerReviewService.disputeReview('pr-assign-1', 'Reviewer deducted marks unfairly')
    expect(disputed.status).toBe('disputed')
    expect(disputed.feedback?.comments).toContain('deducted marks unfairly')
  })
})
