import { createClient } from '@supabase/supabase-js'
import { User, FileMetadata, AccessLog, AnomalyRecord } from '@/types'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * User Management
 */
export async function createOrUpdateUser(userData: Partial<User>): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'wallet_address' })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating/updating user:', error)
    return null
  }
}

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId)
  } catch (error) {
    console.error('Error updating last login:', error)
  }
}

export async function updateUserUsername(userId: string, username: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ username: username })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating username:', error)
    return null
  }
}

export async function updateUserProfileImage(userId: string, profileImageUrl: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ profile_image_url: profileImageUrl })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating profile image:', error)
    return null
  }
}

/**
 * File Metadata Management
 */
export async function saveFileMetadata(metadata: Partial<FileMetadata>): Promise<FileMetadata | null> {
  try {
    // Ensure tags is properly formatted as array or null
    const cleanMetadata = {
      ...metadata,
      tags: metadata.tags && metadata.tags.length > 0 ? metadata.tags : null,
      embedding_vector: metadata.embedding_vector && metadata.embedding_vector.length > 0 
        ? metadata.embedding_vector 
        : null,
    }

    console.log('Saving file metadata:', cleanMetadata) // Debug log

    const { data, error } = await supabase
      .from('file_metadata')
      .insert(cleanMetadata)
      .select()
      .single()

    if (error) {
      console.error('Supabase error details:', error)
      throw error
    }
    
    console.log('File metadata saved:', data) // Debug log
    return data
  } catch (error) {
    console.error('Error saving file metadata:', error)
    return null
  }
}

export async function getUserFiles(userId: string): Promise<FileMetadata[]> {
  try {
    const { data, error } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user files:', error)
    return []
  }
}

// Get files accessible to user (owned + shared with them)
export async function getAccessibleFiles(userId: string, username?: string): Promise<FileMetadata[]> {
  try {
    // Get files owned by user
    const { data: ownedFiles, error: ownedError } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (ownedError) throw ownedError

    // If user has a username, get files shared with them
    if (username) {
      // Use Postgres array operator to check if username is in shared_with array
      const { data: sharedFiles, error: sharedError } = await supabase
        .from('file_metadata')
        .select('*')
        .filter('shared_with', 'cs', `{${username}}`) // cs = contains, uses Postgres array syntax
        .neq('user_id', userId) // Don't include files they already own
        .order('created_at', { ascending: false })

      if (sharedError) {
        console.error('Error fetching shared files:', sharedError)
        // Continue with just owned files
        return ownedFiles || []
      }

      console.log(`✅ Found ${sharedFiles?.length || 0} files shared with @${username}`)

      // Combine owned and shared files
      return [...(ownedFiles || []), ...(sharedFiles || [])]
    }

    return ownedFiles || []
  } catch (error) {
    console.error('Error fetching accessible files:', error)
    return []
  }
}

export async function getFileById(fileId: string): Promise<FileMetadata | null> {
  try {
    const { data, error } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('id', fileId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching file:', error)
    return null
  }
}

export async function updateFileAccessCount(fileId: string): Promise<void> {
  try {
    const { data: file } = await supabase
      .from('file_metadata')
      .select('access_count')
      .eq('id', fileId)
      .single()

    if (file) {
      await supabase
        .from('file_metadata')
        .update({ access_count: (file.access_count || 0) + 1 })
        .eq('id', fileId)
    }
  } catch (error) {
    console.error('Error updating access count:', error)
  }
}

export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('file_metadata')
      .delete()
      .eq('id', fileId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

export async function updateFileMetadata(
  fileId: string,
  updates: Partial<FileMetadata>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('file_metadata')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating file metadata:', error)
    return false
  }
}

/**
 * Access Logs
 */
export async function createAccessLog(logData: Partial<AccessLog>): Promise<void> {
  try {
    await supabase
      .from('access_logs')
      .insert(logData)
  } catch (error) {
    console.error('Error creating access log:', error)
  }
}

export async function getUserAccessLogs(userId: string, limit = 50): Promise<AccessLog[]> {
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching access logs:', error)
    return []
  }
}

/**
 * Anomaly Records
 */
export async function createAnomalyRecord(anomalyData: Partial<AnomalyRecord>): Promise<void> {
  try {
    await supabase
      .from('anomaly_records')
      .insert(anomalyData)
  } catch (error) {
    console.error('Error creating anomaly record:', error)
  }
}

export async function getUserAnomalies(userId: string, limit = 10): Promise<AnomalyRecord[]> {
  try {
    const { data, error } = await supabase
      .from('anomaly_records')
      .select('*')
      .eq('user_id', userId)
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching anomalies:', error)
    return []
  }
}

export async function resolveAnomaly(anomalyId: string): Promise<void> {
  try {
    await supabase
      .from('anomaly_records')
      .update({ resolved: true })
      .eq('id', anomalyId)
  } catch (error) {
    console.error('Error resolving anomaly:', error)
  }
}

/**
 * Search with embeddings
 */
export async function searchFilesByEmbedding(
  queryEmbedding: number[],
  userId: string,
  limit = 10
): Promise<FileMetadata[]> {
  try {
    // This would use a vector similarity search in Supabase with pgvector
    // For now, we'll do a basic search
    const { data, error } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('user_id', userId)
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error searching files:', error)
    return []
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string) {
  try {
    // Get total uploads
    const { count: uploadCount } = await supabase
      .from('file_metadata')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get total storage
    const { data: files } = await supabase
      .from('file_metadata')
      .select('file_size')
      .eq('user_id', userId)

    const totalStorage = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0

    // Get anomaly count
    const { count: anomalyCount } = await supabase
      .from('anomaly_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('resolved', false)

    // Get recent IPs
    const { data: logs } = await supabase
      .from('access_logs')
      .select('ip_address')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10)

    const recentIps = [...new Set(logs?.map(log => log.ip_address).filter(Boolean))] as string[]

    return {
      total_uploads: uploadCount || 0,
      total_storage_used: totalStorage,
      anomaly_count: anomalyCount || 0,
      recent_ips: recentIps,
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return {
      total_uploads: 0,
      total_storage_used: 0,
      anomaly_count: 0,
      recent_ips: [],
    }
  }
}
