'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { useAnomalyMonitor } from '@/hooks/useAnomalyMonitor'
import { motion } from 'framer-motion'

export function AnomalyWidget() {
  const { anomalies, trustScore, securityStatus, isLoading } = useAnomalyMonitor()

  const getStatusIcon = () => {
    switch (securityStatus) {
      case 'safe':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />
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

          {anomalies.slice(0, 3).map((anomaly, index) => (
            <motion.div
              key={anomaly.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 rounded-lg border"
            >
              <div className="flex items-start justify-between">
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
                  <p className="text-sm">{anomaly.description}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {anomalies.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No security alerts</p>
              <p className="text-sm">Your account activity looks normal</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
