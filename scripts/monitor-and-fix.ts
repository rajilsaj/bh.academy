#!/usr/bin/env node
/**
 * Smart Vercel Deployment Monitor
 * Continuously monitors Vercel logs, detects failures, and attempts automatic fixes
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

interface DeploymentError {
  type: string
  file?: string
  line?: number
  message: string
  context?: string
  suggestion?: string
  autoFix?: boolean
}

const LOG_FILE = path.join(__dirname, '../.deployment-monitor.log')
const MAX_LOG_LINES = 1000
const CHECK_INTERVAL = 30000 // 30 seconds
const DEPLOYMENT_TIMEOUT = 600000 // 10 minutes

let lastLogLineCount = 0
let lastDeploymentTime = 0
let deploymentInProgress = false

// Parse Vercel error logs
function parseErrorLogs(logs: string[]): DeploymentError[] {
  const errors: DeploymentError[] = []

  logs.forEach((line, index) => {
    // Type error detection
    if (line.includes('Type error:')) {
      const match = line.match(/Type error:(.+)/i)
      if (match) {
        errors.push({
          type: 'TypeScript',
          message: match[1].trim(),
          context: logs
            .slice(Math.max(0, index - 2), Math.min(logs.length, index + 3))
            .join('\n'),
          autoFix: false, // Type errors need human review
          suggestion: 'Review the type error and update types accordingly',
        })
      }
    }

    // Import error detection
    if (line.includes('Module not found') || line.includes('Cannot find module')) {
      const match = line.match(/['\"]([^'"]+)['\"]/i)
      if (match) {
        const moduleName = match[1]
        errors.push({
          type: 'MissingModule',
          message: `Module not found: ${moduleName}`,
          context: logs
            .slice(Math.max(0, index - 2), Math.min(logs.length, index + 3))
            .join('\n'),
          autoFix: true,
          suggestion: `Run: npm install ${moduleName}`,
        })
      }
    }

    // Missing property error
    if (line.includes('does not exist on type')) {
      errors.push({
        type: 'MissingProperty',
        message: line,
        context: logs
          .slice(Math.max(0, index - 2), Math.min(logs.length, index + 3))
          .join('\n'),
        autoFix: false,
        suggestion: 'Review the schema and add the missing property',
      })
    }

    // Export/Import mismatch
    if (
      line.includes('has no exported member') ||
      line.includes('is not exported from')
    ) {
      errors.push({
        type: 'ExportMismatch',
        message: line,
        context: logs
          .slice(Math.max(0, index - 2), Math.min(logs.length, index + 3))
          .join('\n'),
        autoFix: false,
        suggestion: 'Check the import and export statements',
      })
    }

    // Migration error
    if (line.includes('migration') && line.toLowerCase().includes('error')) {
      errors.push({
        type: 'MigrationError',
        message: line,
        context: logs
          .slice(Math.max(0, index - 2), Math.min(logs.length, index + 3))
          .join('\n'),
        autoFix: false,
        suggestion: 'Check migration files for syntax errors',
      })
    }
  })

  return errors
}

// Fetch logs from Vercel
async function fetchVercelLogs(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const vercelLogs: string[] = []
    const process = spawn('vercel', ['logs', 'bh-academy-seven.vercel.app', '--limit', '100'])

    process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n')
      vercelLogs.push(...lines.filter((l) => l.trim()))
    })

    process.stderr.on('data', (data) => {
      console.error(`Vercel error: ${data}`)
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve(vercelLogs)
      } else {
        reject(new Error(`Vercel logs fetch failed with code ${code}`))
      }
    })
  })
}

// Check deployment status
async function checkDeploymentStatus(): Promise<{
  isDeploying: boolean
  lastBuild: string
  status: string
}> {
  return new Promise((resolve) => {
    let output = ''
    const process = spawn('vercel', ['list', '--limit', '1'])

    process.stdout.on('data', (data) => {
      output += data.toString()
    })

    process.on('close', () => {
      const isDeploying = output.includes('Building') || output.includes('Queued')
      const status = isDeploying ? 'Building' : output.includes('Error') ? 'Failed' : 'Ready'

      resolve({
        isDeploying,
        lastBuild: new Date().toISOString(),
        status,
      })
    })
  })
}

// Apply automatic fix
async function applyAutoFix(error: DeploymentError): Promise<boolean> {
  console.log(`\n🔧 Attempting automatic fix for: ${error.type}`)

  if (error.type === 'MissingModule') {
    const match = error.message.match(/Module not found: (.+)/)
    if (match) {
      const moduleName = match[1]
      console.log(`📦 Installing missing module: ${moduleName}`)

      return new Promise((resolve) => {
        const npmProcess = spawn('npm', ['install', moduleName])
        npmProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Successfully installed ${moduleName}`)
            resolve(true)
          } else {
            console.log(`❌ Failed to install ${moduleName}`)
            resolve(false)
          }
        })
      })
    }
  }

  return false
}

// Log monitoring loop
async function monitorDeployment() {
  console.log('🚀 Starting Vercel Deployment Monitor')
  console.log(`📍 Monitoring: bh-academy-seven.vercel.app`)
  console.log(`⏱️  Check interval: ${CHECK_INTERVAL / 1000}s`)
  console.log('---')

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const status = await checkDeploymentStatus()

      console.log(`[${new Date().toLocaleTimeString()}] Status: ${status.status}`)

      if (status.isDeploying) {
        deploymentInProgress = true
        lastDeploymentTime = Date.now()
      }

      if (deploymentInProgress && !status.isDeploying) {
        console.log('📋 Deployment completed, checking logs...')

        try {
          const logs = await fetchVercelLogs()
          const errors = parseErrorLogs(logs)

          if (errors.length > 0) {
            console.log(`\n⚠️  Found ${errors.length} error(s):\n`)

            for (const error of errors) {
              console.log(`📌 Type: ${error.type}`)
              console.log(`   Message: ${error.message}`)
              if (error.suggestion) {
                console.log(`   💡 Suggestion: ${error.suggestion}`)
              }

              if (error.autoFix) {
                const fixed = await applyAutoFix(error)
                if (fixed) {
                  console.log('🔄 Fix applied, re-deploying...')
                  // Trigger re-deployment
                  const gitProcess = spawn('git', ['push', 'origin', 'main'])
                  gitProcess.on('close', () => {
                    console.log('✅ Pushed to trigger re-deployment')
                  })
                }
              }
              console.log('')
            }
          } else {
            console.log('✅ Deployment successful, no errors found!')
          }
        } catch (err) {
          console.error('Error fetching logs:', err)
        }

        deploymentInProgress = false
      }

      // Check for timeout
      if (
        deploymentInProgress &&
        Date.now() - lastDeploymentTime > DEPLOYMENT_TIMEOUT
      ) {
        console.log('⏰ Deployment timeout - build taking too long')
        deploymentInProgress = false
      }
    } catch (error) {
      console.error(`Monitor error: ${error}`)
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL))
  }
}

// Start monitoring
console.clear()
monitorDeployment().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitor stopped')
  process.exit(0)
})
