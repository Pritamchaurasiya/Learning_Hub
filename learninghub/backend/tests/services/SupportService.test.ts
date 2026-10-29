import { supportService } from '../../src/services/SupportService'

describe('SupportService', () => {
  it('should list all support tickets', async () => {
    const tickets = await supportService.getTickets()
    expect(Array.isArray(tickets)).toBe(true)
    expect(tickets.length).toBeGreaterThan(0)
  })

  it('should create a support ticket with initial message', async () => {
    const created = await supportService.createTicket({
      subject: 'Payment receipt not received',
      category: 'Billing',
      priority: 'high',
      description: 'Invoice #1092 was charged but receipt PDF failed to download.',
    })
    expect(created.id).toBeDefined()
    expect(created.ticketNumber).toMatch(/^LH-\d{4}$/)
    expect(created.status).toBe('open')
    expect(created.messages.length).toBe(1)
  })

  it('should reply to a support ticket', async () => {
    const updated = await supportService.replyToTicket('t-101', 'Thank you, the WebAssembly fix worked!', 'Student')
    expect(updated.messages.length).toBeGreaterThanOrEqual(3)
    expect(updated.messages[updated.messages.length - 1].text).toContain('WebAssembly fix worked')
  })
})
