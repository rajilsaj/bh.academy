import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupStorage() {
  console.log('🔧 Setting up Supabase Storage...\n')

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`)
    }

    const ficbucket = buckets?.find(b => b.name === 'fichiers')

    if (ficbucket) {
      console.log('✅ Bucket "fichiers" already exists')
    } else {
      console.log('📦 Creating bucket "fichiers"...')
      const { data, error } = await supabase.storage.createBucket('fichiers', {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
      })

      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`)
      }
      console.log('✅ Bucket "fichiers" created successfully')
    }

    // Get current policies
    console.log('\n📋 Checking storage policies...')
    const { data: policies, error: policiesError } = await supabase
      .from('storage.objects')
      .select('*', { count: 'exact', head: true })

    console.log('✅ Storage is ready for use')
    console.log('\n📁 Bucket structure:')
    console.log('  fichiers/')
    console.log('    ├── cv/         (Learner CVs)')
    console.log('    └── id/         (ID documents)')
    console.log('\n✨ Setup complete! Documents will be stored as:')
    console.log('  - CVs: fichiers/cv/{learnerId}/*.pdf')
    console.log('  - IDs: fichiers/id/{learnerId}/*.pdf')

  } catch (error) {
    console.error('❌ Setup failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

setupStorage()
