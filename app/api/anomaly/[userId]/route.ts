import { NextRequest, NextResponse } from 'next/server'

/**
 * Mock Anomaly Insights API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  return NextResponse.json({
    status: 'safe',
    message: 'No suspicious activity detected',
    recent_anomalies: 0,
    trust_score: 95,
  })
}
