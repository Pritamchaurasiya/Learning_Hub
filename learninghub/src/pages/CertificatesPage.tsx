import { useState, useEffect, useCallback, useMemo } from 'react'
import { Award, Download, Calendar, CheckCircle, ExternalLink, Wallet, ShieldCheck, Zap, Box, Globe } from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { motion } from 'framer-motion'
import { certificateService, type Certificate } from '../services/certificateService'
import { web3Service, type NFTCertificate, type Web3Profile } from '../services/web3Service'
import { useStore } from '../stores/useStore'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [nftCertificates, setNFTCertificates] = useState<NFTCertificate[]>([])
  const [web3Profile, setWeb3Profile] = useState<Web3Profile | null>(null)
  
  const [filter, setFilter] = useState<'all' | 'valid' | 'nft'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isMinting, setIsMinting] = useState<string | null>(null)
  const [, setError] = useState<string | null>(null)
  
  const { addToast } = useStore()

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [certsRes, nftsRes, profileRes] = await Promise.all([
        certificateService.getCertificates(),
        web3Service.getNFTCertificates(),
        web3Service.getProfile()
      ])
      
      setCertificates(certsRes.data || [])
      setNFTCertificates(nftsRes || [])
      setWeb3Profile(profileRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credentials')
      console.error('[CertificatesPage] Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const connectWallet = async () => {
    try {
      // Mocking wallet connection (simulating window.ethereum)
      const mockAddress = `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
      await web3Service.updateWallet(mockAddress)
      await fetchData()
      addToast({ message: 'Wallet linked to neural profile', type: 'success' })
    } catch (err) {
      addToast({ message: 'Wallet connection failed', type: 'error' })
    }
  }

  const mintNFT = async (courseId: string) => {
    if (!web3Profile?.wallet_address) {
      addToast({ message: 'Please connect wallet first', type: 'info' })
      return
    }
    
    try {
      setIsMinting(courseId)
      await web3Service.mintNFT(courseId)
      await fetchData()
      addToast({ message: 'Certificate anchored to blockchain!', type: 'success' })
    } catch (err) {
      addToast({ message: 'Blockchain anchoring failed', type: 'error' })
    } finally {
      setIsMinting(null)
    }
  }

  const isMinted = (courseId: string) => {
    return nftCertificates.some(nft => nft.course.id === courseId)
  }

  const filteredCertificates = useMemo(() => {
    if (filter === 'nft') return certificates.filter(c => isMinted(c.course.id))
    return certificates
  }, [certificates, filter, nftCertificates])

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
    } catch (err) {
      addToast({ message: 'Failed to download certificate', type: 'error' })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <>
      <SEO title="Credentials - Web3 Vault" />

      <div className="space-y-8">
        {/* Web3 Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gray-900 text-white p-8 md:p-12 shadow-2xl">
           <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
              <Box className="w-64 h-64 rotate-12" />
           </div>
           
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-widest border border-primary-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" /> Blockchain Secured
                 </div>
                 <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">Credential Vault</h1>
                 <p className="text-gray-400 max-w-md font-medium">
                    Your learning achievements are permanent, verifiable, and tradable on the decentralized web.
                 </p>
              </div>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-6 w-full md:w-auto min-w-[320px]">
                 {web3Profile?.wallet_address ? (
                   <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-emerald-400" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Wallet</p>
                            <p className="text-sm font-mono font-bold truncate max-w-[180px]">
                               {web3Profile.wallet_address.slice(0, 6)}...{web3Profile.wallet_address.slice(-4)}
                            </p>
                         </div>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                         <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Decentralized ID (DID)</p>
                         <p className="text-[10px] font-mono text-primary-400 truncate">{web3Profile.did}</p>
                      </div>
                   </div>
                 ) : (
                   <div className="text-center space-y-4 py-2">
                      <div className="w-12 h-12 rounded-2xl bg-primary-500/20 flex items-center justify-center mx-auto">
                         <Zap className="w-6 h-6 text-primary-400 animate-pulse" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Wallet Not Connected</p>
                      <Button onClick={connectWallet} className="w-full rounded-xl bg-white text-gray-900 border-none font-black text-[10px] py-4">
                         Connect Web3 Profile
                      </Button>
                   </div>
                 )}
              </Card>
           </div>
        </section>

        {/* Filters */}
        <div className="flex items-center justify-between">
           <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
              {(['all', 'valid', 'nft'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    filter === t 
                      ? 'bg-white dark:bg-gray-900 text-primary-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
           </div>
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Total Assets: {certificates.length}
           </div>
        </div>

        {/* Certificates Grid */}
        {isLoading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map(cert => {
              const minted = isMinted(cert.course.id)
              const nft = nftCertificates.find(n => n.course.id === cert.course.id)
              
              return (
                <Card key={cert.id} className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-none rounded-3xl bg-white dark:bg-gray-900/50">
                  <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-indigo-500 to-primary-600 flex items-center justify-center">
                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }}>
                       <Award className="w-24 h-24 text-white/50 group-hover:text-white transition-all duration-500" />
                    </motion.div>
                    
                    {minted && (
                      <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5 backdrop-blur-md">
                        <ShieldCheck className="w-3 h-3" /> Anchored
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-black text-lg tracking-tight group-hover:text-primary-600 transition-colors">
                         {cert.course.title}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{cert.certificate_code}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                       <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(cert.issued_at)}</span>
                       <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Genuine</span>
                    </div>

                    <div className="pt-4 border-t border-gray-50 dark:border-gray-800 space-y-3">
                       <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => downloadCertificate(cert.certificate_code)}>
                             <Download className="w-4 h-4 mr-2" /> PDF
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl px-3" onClick={() => window.open(certificateService.getShareUrl(cert.certificate_code))}>
                             <ExternalLink className="w-4 h-4" />
                          </Button>
                       </div>
                       
                       {minted ? (
                         <div className="space-y-2">
                            <Button 
                                variant="outline" 
                                fullWidth 
                                size="sm" 
                                className="rounded-xl bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 font-black uppercase tracking-widest text-[9px] py-4"
                                onClick={() => window.open(`https://mumbai.polygonscan.com/tx/${nft?.transaction_hash}`)}
                            >
                                <Box className="w-3.5 h-3.5 mr-2" /> View on Blockchain
                            </Button>
                            <Button 
                                variant="ghost" 
                                fullWidth 
                                size="sm" 
                                className="rounded-xl text-[9px] font-bold uppercase tracking-widest"
                                onClick={() => {
                                   const cid = nft?.metadata_uri.replace('ipfs://', '')
                                   window.open(`https://ipfs.io/ipfs/${cid}`)
                                }}
                            >
                                <Globe className="w-3.5 h-3.5 mr-2" /> IPFS Metadata
                            </Button>
                         </div>
                       ) : (
                         <Button 
                            fullWidth 
                            size="sm" 
                            className="rounded-xl font-black uppercase tracking-widest text-[9px] py-4"
                            onClick={() => mintNFT(cert.course.id)}
                            isLoading={isMinting === cert.course.id}
                         >
                            <Zap className="w-3.5 h-3.5 mr-2" /> Anchoring as NFT
                         </Button>
                       )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredCertificates.length === 0 && (
           <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
              <Award className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-black uppercase tracking-widest">No Assets Found</h3>
              <p className="text-sm text-gray-500 font-medium">Complete your first course to populate your vault.</p>
           </div>
        )}
      </div>
    </>
  )
}
