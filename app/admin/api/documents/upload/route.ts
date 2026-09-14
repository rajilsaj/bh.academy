import { NextRequest, NextResponse } from 'next/server'
import { auth, can } from '@/lib/auth'
import { db } from '@/lib/db'
import { learners } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Check authorization
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.user.role, 'gererUtilisateurs')) {
      return NextResponse.json(
        { error: 'Permission denied.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const learnerId = formData.get('learnerId') as string
    const docType = formData.get('docType') as 'cv' | 'id'

    if (!file || !learnerId || !docType) {
      return NextResponse.json(
        { error: 'Missing file, learnerId, or docType' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 10MB)' },
        { status: 400 }
      )
    }

    // Generate filename
    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${docType}/${learnerId}/${Date.now()}.${ext}`
    const bucket = 'fichiers'

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename)

    const publicUrl = publicData?.publicUrl

    // Update learner record
    const updateField = docType === 'cv' ? 'cvUrl' : 'idDocumentUrl'
    await db
      .update(learners)
      .set({ [updateField]: publicUrl })
      .where(eq(learners.id, learnerId))

    return NextResponse.json({
      success: true,
      message: `${docType === 'cv' ? 'CV' : "Document d'identité"} uploadé avec succès`,
      url: publicUrl,
    })
  } catch (error) {
    console.error('[document-upload]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    )
  }
}
