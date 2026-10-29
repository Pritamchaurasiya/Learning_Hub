import { useState, useEffect } from 'react'
import {
  LifeBuoy,
  HelpCircle,
  Plus,
  Send,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  X,
} from 'lucide-react'
import {
  supportService,
  SupportTicket,
  TicketCategory,
  TicketPriority,
} from '../services/supportService'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useStore } from '../stores/useStore'

const FAQ_ITEMS = [
  {
    q: 'How does the client-side WebAssembly code execution engine work?',
    a: 'LearningHub executes your C++, Python, and JavaScript code locally in the browser using WebAssembly (Clang/WASM and Pyodide) via isolated Web Workers. This ensures sub-millisecond execution latency and allows code challenges to run even when offline.',
  },
  {
    q: 'Are certificates cryptographically verifiable on the blockchain?',
    a: 'Yes. Every course completion certificate issues a deterministic cryptographic proof anchored to the Polygon PoS network. Anyone can verify your credentials on the /verify-certificate page without needing an account.',
  },
  {
    q: 'How is the adaptive test difficulty (CAT / 3PL IRT) calculated?',
    a: 'Our Supreme Assessment Engine utilizes 3-Parameter Logistic Item Response Theory (IRT). After each response, your estimated latent ability (theta) is recalculated with Bayesian estimation to dynamically pick the next question that yields maximal Fisher Information.',
  },
  {
    q: 'How do I download lecture notes or courses for offline access?',
    a: 'Visit any course or ebook and toggle "Download Offline". Assets are persisted into browser storage via the Progressive Web App (PWA) cache and IndexedDB, enabling uninterrupted study during network outages.',
  },
]

export default function SupportPage() {
  const addToast = useStore(s => s.addToast)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets'>('faq')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0)

  // Ticket creation modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<TicketCategory>('Technical')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Selected ticket for conversation thread
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const data = await supportService.getTickets()
        if (isMounted) setTickets(data)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleCreateTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      addToast({ message: 'Please provide both subject and description.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      const created = await supportService.createTicket({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
      })
      setTickets(prev => [created, ...prev])
      addToast({
        message: `Ticket #${created.ticketNumber} created! Our team will respond shortly.`,
        type: 'success',
      })
      setIsModalOpen(false)
      setSubject('')
      setDescription('')
      setActiveTab('tickets')
    } catch (err: any) {
      addToast({ message: err?.message || 'Failed to submit ticket', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return

    try {
      const updated = await supportService.replyToTicket(selectedTicket.id, replyText.trim())
      setSelectedTicket(updated)
      setTickets(prev => prev.map(t => (t.id === updated.id ? updated : t)))
      setReplyText('')
      addToast({ message: 'Reply sent to support desk.', type: 'success' })
    } catch (err: any) {
      addToast({ message: err?.message || 'Failed to send reply', type: 'error' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-primary-950 to-indigo-950 p-8 sm:p-10 border border-slate-800 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/20 text-primary-300 text-xs font-bold uppercase tracking-wider border border-primary-500/30">
            <LifeBuoy className="w-3.5 h-3.5 text-primary-400" />
            24/7 Student Help Desk & Knowledge Base
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            How Can We Assist Your Learning?
          </h1>
          <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
            Search comprehensive architecture guides, explore frequently asked questions, or open a
            high-priority ticket with our engineering and academic support team.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              onClick={() => setActiveTab('faq')}
              className={`rounded-xl px-5 py-2.5 font-bold ${
                activeTab === 'faq'
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : 'bg-primary-950/60 text-white hover:bg-primary-950'
              }`}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Frequently Asked Questions
            </Button>
            <Button
              onClick={() => setActiveTab('tickets')}
              variant="outline"
              className={`rounded-xl px-5 py-2.5 font-bold ${
                activeTab === 'tickets'
                  ? 'bg-white text-gray-900 border-white hover:bg-gray-100'
                  : 'text-white border-primary-400/40 hover:bg-primary-800/40'
              }`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              My Tickets ({tickets.length})
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl px-5 py-2.5 font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Open Support Ticket
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary-500" />
              Platform Knowledge Base & FAQs
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <Card
                key={idx}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden cursor-pointer transition-all"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{item.q}</h3>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 shrink-0 ${
                      expandedFaq === idx ? 'rotate-180 text-primary-500' : ''
                    }`}
                  />
                </div>
                {expandedFaq === idx && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3">
                    {item.a}
                  </p>
                )}
              </Card>
            ))}
          </div>

          <div className="p-8 rounded-3xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center space-y-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Still have questions or facing technical errors?
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Our engineering triage team actively monitors bug reports and platform feedback with
              guaranteed 24-hour turnaround times.
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="rounded-xl">
              Open a Support Ticket
            </Button>
          </div>
        </div>
      )}

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" />
              Your Support Inquiries & Tickets
            </h2>
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl text-xs font-semibold"
            >
              + New Ticket
            </Button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-400">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                No Open Support Tickets
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Need help with courses, test simulations, or billing? Open a ticket to connect
                directly with support engineers.
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="rounded-xl">
                Open Support Ticket
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tickets.map(t => (
                <Card
                  key={t.id}
                  className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {t.ticketNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          t.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : t.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {t.subject}
                    </h3>

                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                      {t.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
                      <span>Category: {t.category}</span>
                      <span>•</span>
                      <span>Priority: {t.priority.toUpperCase()}</span>
                      <span>•</span>
                      <span>{t.messages.length} messages</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Updated {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setSelectedTicket(t)}
                      className="rounded-xl text-xs font-bold"
                    >
                      View Conversation
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ticket Conversation Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-primary-500">
                  {selectedTicket.ticketNumber}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold uppercase">
                  {selectedTicket.status.replace('_', ' ')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {selectedTicket.subject}
              </h3>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 custom-scrollbar max-h-72">
              {selectedTicket.messages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    msg.sender === 'user'
                      ? 'bg-primary-600 text-white ml-6'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white mr-6 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-80">
                    <span className="font-bold">{msg.senderName}</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Type your reply to support..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                className="rounded-xl flex-1"
              />
              <Button onClick={handleSendReply} className="rounded-xl font-bold">
                <Send className="w-4 h-4 mr-1.5" />
                Reply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">
                Support Desk
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                Open a Support Ticket
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Subject / Summary
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Issue running Pyodide WASM sandbox in Firefox"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Billing">Billing</option>
                    <option value="Content">Course Content</option>
                    <option value="Account">Account</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Detailed Description
                </label>
                <textarea
                  placeholder="Describe what occurred, steps to reproduce, or any relevant details..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTicket}
                disabled={isSubmitting}
                className="rounded-xl font-bold bg-primary-600 hover:bg-primary-700 text-white"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
