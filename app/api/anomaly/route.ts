import { NextRequest, NextResponse } from 'next/server'

/**
 * Mock Anomaly Detection API
 * Replace with actual ML model later
 */
export async function POST(request: NextRequest) {
  try {
    const activityData = await request.json()

    // Mock anomaly detection - always return safe
    return NextResponse.json({
      anomalies: [],
      trust_score: 95,
      status: 'safe',
    })
  } catch (error) {
    console.error('Anomaly API error:', error)
    return NextResponse.json(
      { error: 'Failed to detect anomalies' },
      { status: 500 }
    )
  }
}

// Get insights endpoint
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')

  return NextResponse.json({
    status: 'safe',
    message: 'No suspicious activity detected',
    recent_anomalies: 0,
    trust_score: 95,
  })
}
