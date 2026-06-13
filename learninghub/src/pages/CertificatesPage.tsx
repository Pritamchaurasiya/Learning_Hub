import { useState, useMemo } from 'react'
import {
  Award,
  Download,
  Calendar,
  CheckCircle,
  ExternalLink,
  Wallet,
  ShieldCheck,
  Zap,
  Box,
  Globe,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import AnimatedPage from '../components/AnimatedPage'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { certificateService } from '../services/certificateService'
import { web3Service } from '../services/web3Service'
import { useStore } from '../stores/useStore'

export default function CertificatesPage() {
  const [filter, setFilter] = useState<'all' | 'valid' | 'nft'>('all')
  const addToast = useStore(state => state.addToast)
  const queryClient = useQueryClient()

  const {
    data: certificates = [],
    isLoading: isLoadingCerts,
    error: certsError,
  } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const res = await certificateService.getCertificates()
      return res.data || []
    },
  })

  const { data: nftCertificates = [], isLoading: isLoadingNFTs } = useQuery({
    queryKey: ['nftCertificates'],
    queryFn: async () => {
      return web3Service.getNFTCertificates()
    },
  })

  const { data: web3Profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['web3Profile'],
    queryFn: async () => {
      return web3Service.getProfile()
    },
    staleTime: Infinity,
  })

  const isLoading = isLoadingCerts || isLoadingNFTs || isLoadingProfile
  const hasError = !!certsError

  const connectWalletMutation = useMutation({
    mutationFn: async () => {
      if (!window.ethereum) {
        throw new Error('No Web3 wallet detected. Please install MetaMask or similar.')
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in wallet')
      }
      return web3Service.updateWallet(accounts[0])
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['web3Profile'] })
      void queryClient.invalidateQueries({ queryKey: ['nftCertificates'] })
      addToast({ message: 'Wallet linked to neural profile', type: 'success' })
    },
    onError: (error: Error) => {
      addToast({ message: error.message || 'Wallet connection failed', type: 'error' })
    },
  })

  const mintNFTMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!web3Profile?.wallet_address) {
        throw new Error('Please connect wallet first')
      }
      return web3Service.mintNFT(courseId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nftCertificates'] })
      addToast({ message: 'Certificate anchored to blockchain!', type: 'success' })
    },
    onError: (error: Error) => {
      addToast({ message: error.message || 'Blockchain anchoring failed', type: 'error' })
    },
  })

  const isMinted = useMemo(
    () => (courseId: string) => {
      return nftCertificates.some(nft => nft.course.id === courseId)
    },
    [nftCertificates]
  )

  const filteredCertificates = useMemo(() => {
    if (filter === 'nft') return certificates.filter(c => isMinted(c.course.id))
    return certificates
  }, [certificates, filter, isMinted])

  const downloadCertificate = async (code: string) => {
    try {
      const blob = await certificateService.downloadCertificate(code)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `certificate-${code}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      addToast({ message: 'Certificate downloaded successfully', type: 'success' })
    } catch {
      addToast({ message: 'Failed to download certificate', type: 'error' })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <AnimatedPage className="pb-12 pt-4">
      <SEO title="Credentials - Web3 Vault" />

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Web3 Hero */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gray-900 text-white p-8 md:p-14 shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Box className="w-64 h-64 rotate-12 text-primary-500" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-widest border border-primary-500/30">
                <ShieldCheck className="w-4 h-4" /> Blockchain Secured
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                Credential Vault
              </h1>
              <p className="text-gray-400 max-w-lg font-medium text-lg leading-relaxed">
                Your learning achievements are permanent, verifiable, and tradable on the
                decentralized web.
              </p>
            </div>

            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] w-full md:w-auto min-w-[340px] shadow-2xl">
              {isLoadingProfile ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-[1.25rem] bg-white/10" />
                    <div className="space-y-2">
                      <Skeleton className="w-24 h-3 bg-white/10" />
                      <Skeleton className="w-32 h-4 bg-white/10" />
                    </div>
                  </div>
                </div>
              ) : web3Profile?.wallet_address ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                      <Wallet className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Active Wallet
                      </p>
                      <p className="text-base font-mono font-bold truncate max-w-[200px] text-white">
                        {web3Profile.wallet_address.slice(0, 6)}...
                        {web3Profile.wallet_address.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-white/10">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                      Decentralized ID (DID)
                    </p>
                    <p className="text-xs font-mono text-primary-400 truncate bg-primary-900/30 py-2 px-3 rounded-xl border border-primary-500/20">
                      {web3Profile.did}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6 py-4">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-primary-500/20 flex items-center justify-center mx-auto border border-primary-500/30 shadow-inner">
                    <Zap className="w-8 h-8 text-primary-400 animate-pulse" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Wallet Not Connected
                  </p>
                  <Button
                    onClick={() => connectWalletMutation.mutate()}
                    disabled={connectWalletMutation.isPending}
                    className="w-full rounded-[1.25rem] bg-white text-gray-900 border-none font-black text-[10px] uppercase tracking-widest py-5 hover:bg-gray-100 transition-colors"
                  >
                    {connectWalletMutation.isPending ? 'Connecting...' : 'Connect Web3 Profile'}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-900 rounded-[1.25rem] w-fit">
            {(['all', 'valid', 'nft'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === t
                    ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
            Total Assets: {certificates.length}
          </div>
        </div>

        {/* Certificates Grid */}
        {hasError ? (
          <Card className="p-16 text-center border-none shadow-xl rounded-[2.5rem] bg-white dark:bg-gray-900">
            <div className="w-24 h-24 rounded-[1.5rem] bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
              Sync Failure
            </h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-8">
              Failed to synchronize assets from the central vault.
            </p>
            <Button
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['certificates'] })}
              className="px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              Retry Synchronization
            </Button>
          </Card>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-md">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 pt-4">
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                    <Skeleton className="h-10 w-12 rounded-xl" />
                  </div>
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map(cert => {
              const minted = isMinted(cert.course.id)
              const nft = nftCertificates.find(n => n.course.id === cert.course.id)
              const isMintingThis =
                mintNFTMutation.isPending && mintNFTMutation.variables === cert.course.id

              return (
                <motion.div
                  key={cert.id}
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Card className="overflow-hidden group border-none shadow-lg hover:shadow-2xl transition-shadow duration-500 rounded-[2.5rem] bg-white dark:bg-gray-900">
                    <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-indigo-500 to-primary-600 flex items-center justify-center">
                      <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center opacity-10 pointer-events-none mix-blend-overlay" />
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Award className="w-28 h-28 text-white/50 group-hover:text-white transition-colors duration-500 drop-shadow-2xl" />
                      </motion.div>

                      {minted && (
                        <div className="absolute top-6 right-6 bg-emerald-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 backdrop-blur-md border border-emerald-400">
                          <ShieldCheck className="w-4 h-4" /> Anchored
                        </div>
                      )}
                    </div>

                    <div className="p-8 space-y-6">
                      <div>
                        <h3 className="font-black text-xl tracking-tight group-hover:text-primary-600 transition-colors leading-tight">
                          {cert.course.title}
                        </h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">
                          {cert.certificate_code}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />{' '}
                          {formatDate(cert.issued_at)}
                        </span>
                        <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                          <CheckCircle className="w-4 h-4" /> Genuine
                        </span>
                      </div>

                      <div className="pt-2 space-y-3">
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1 rounded-xl font-black uppercase tracking-widest text-[9px] border-2"
                            onClick={() => downloadCertificate(cert.certificate_code)}
                          >
                            <Download className="w-4 h-4 mr-2" /> PDF
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-xl px-4 border-2"
                            onClick={() =>
                              window.open(certificateService.getShareUrl(cert.certificate_code))
                            }
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>

                        {minted ? (
                          <div className="space-y-3">
                            <Button
                              variant="outline"
                              fullWidth
                              className="rounded-xl bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 font-black uppercase tracking-widest text-[9px] py-4"
                              onClick={() =>
                                window.open(
                                  `https://mumbai.polygonscan.com/tx/${nft?.transaction_hash}`
                                )
                              }
                            >
                              <Box className="w-4 h-4 mr-2" /> View on Blockchain
                            </Button>
                            <Button
                              variant="ghost"
                              fullWidth
                              className="rounded-xl text-[9px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800"
                              onClick={() => {
                                const cid = nft?.metadata_uri.replace('ipfs://', '')
                                window.open(`https://ipfs.io/ipfs/${cid}`)
                              }}
                            >
                              <Globe className="w-4 h-4 mr-2" /> IPFS Metadata
                            </Button>
                          </div>
                        ) : (
                          <Button
                            fullWidth
                            className="rounded-xl font-black uppercase tracking-widest text-[9px] py-4 shadow-lg shadow-primary-500/20"
                            onClick={() => mintNFTMutation.mutate(cert.course.id)}
                            disabled={isMintingThis}
                          >
                            {isMintingThis ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4 mr-2" />
                            )}
                            Anchoring as NFT
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !hasError && filteredCertificates.length === 0 && (
          <Card className="text-center py-20 bg-gray-50 dark:bg-gray-900 border-none shadow-inner rounded-[2.5rem]">
            <div className="w-24 h-24 rounded-[1.5rem] bg-white dark:bg-gray-800 flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <Award className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
              No Assets Found
            </h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Complete your first course to populate your vault.
            </p>
          </Card>
        )}
      </div>
    </AnimatedPage>
  )
}
