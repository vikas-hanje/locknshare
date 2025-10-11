'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, Lock, Sparkles, Zap, Globe, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectWallet } from '@/components/ConnectWallet'
import { useStore } from '@/store/useStore'
import Link from 'next/link'

const features = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'Your files are encrypted client-side with RSA before upload.',
  },
  {
    icon: Globe,
    title: 'Decentralized Storage',
    description: 'Files stored on IPFS for true ownership and permanence.',
  },
  {
    icon: Sparkles,
    title: 'AI Semantic Search',
    description: 'Find files by meaning, not just name, using AI embeddings.',
  },
  {
    icon: Shield,
    title: 'Anomaly Detection',
    description: 'AI-powered security monitoring for your account activity.',
  },
  {
    icon: Zap,
    title: 'Web3 Native',
    description: 'Connect with MetaMask and own your identity.',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { isConnected } = useStore()

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard')
    }
  }, [isConnected, router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-xl">LockNShare</h1>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Powered by AI & Web3</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Decentralized File Sharing
            <br />
            <span className="text-foreground">Reimagined</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Secure, encrypted file storage on IPFS with AI-powered search and anomaly detection.
            Your files, your keys, your control.
          </p>

          <div className="flex items-center justify-center gap-4">
            <ConnectWallet />
            <Button variant="outline" size="lg" asChild>
              <Link href="#features">
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Why LockNShare?</h2>
          <p className="text-muted-foreground text-lg">
            The most advanced decentralized file sharing platform
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-primary rounded-2xl p-12 text-center text-primary-foreground"
        >
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-8 opacity-90">
            Connect your wallet and start sharing files securely today
          </p>
          <ConnectWallet />
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 LockNShare. All rights reserved.</p>
          <p className="text-sm mt-2">Built with Next.js, Supabase, IPFS, and AI</p>
        </div>
      </footer>
    </div>
  )
}
