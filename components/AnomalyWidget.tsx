'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, AlertCircle, CheckCircle, Check, AlertOctagon } from 'lucide-react'
import { useAnomalyMonitor } from '@/hooks/useAnomalyMonitor'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function AnomalyWidget() {
  const { anomalies, trustScore, securityStatus, isLoading, resolveAnomaly } = useAnomalyMonitor()
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const getStatusIcon = () => {
    switch (securityStatus) {
      case 'safe':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 10
            }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <CheckCircle className="h-5 w-5 text-green-500" />
            </motion.div>
          </motion.div>
        )
      case 'warning':
        return (
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </motion.div>
        )
      case 'alert':
        return (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <AlertCircle className="h-5 w-5 text-red-500" />
          </motion.div>
        )
      default:
        return <Shield className="h-5 w-5 text-blue-500" />
    }
  }

  const getStatusColor = () => {
    switch (securityStatus) {
      case 'safe':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'alert':
        return 'text-red-500'
      default:
        return 'text-blue-500'
    }
  }

  const getStatusText = () => {
    switch (securityStatus) {
      case 'safe':
        return 'All Clear'
      case 'warning':
        return 'Minor Issues'
      case 'alert':
        return 'Attention Required'
      default:
        return 'Unknown'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="font-semibold">{getStatusText()}</p>
                <p className="text-sm text-muted-foreground">
                  {anomalies.filter(a => !a.resolved).length} unresolved alert(s)
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{trustScore}%</p>
              <p className="text-xs text-muted-foreground">Trust Score</p>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {anomalies.filter(a => !a.resolved).map((anomaly, index) => (
              <motion.div
                key={anomaly.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.05 
                }}
                className="p-3 rounded-lg border mb-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          anomaly.severity === 'critical' || anomaly.severity === 'high'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {anomaly.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {anomaly.anomaly_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{anomaly.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(anomaly.detected_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setResolvingId(anomaly.id)
                      try {
                        await resolveAnomaly(anomaly.id)
                        toast.success('Anomaly confirmed. Trust score restored.')
                      } catch (error) {
                        toast.error('Failed to resolve anomaly')
                      } finally {
                        setResolvingId(null)
                      }
                    }}
                    disabled={resolvingId === anomaly.id}
                    className="whitespace-nowrap"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    It was me
                  </Button>
                </div>
                {(anomaly.anomaly_type === 'ip_mismatch' || anomaly.severity === 'high' || anomaly.severity === 'critical') && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex gap-2 text-xs">
                      <AlertOctagon className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">If this wasn&apos;t you:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>Change your MetaMask password immediately</li>
                          <li>Check for unauthorized wallet access</li>
                          <li>Review recent file access logs</li>
                          <li>Enable 2FA on your MetaMask account</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {anomalies.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-8 text-muted-foreground"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2
                }}
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                </motion.div>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                No security alerts
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm"
              >
                Your account activity looks normal
              </motion.p>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
