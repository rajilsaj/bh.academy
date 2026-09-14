#!/usr/bin/env node
/**
 * Claude-Powered Vercel Deployment Agent
 * Monitors Vercel deployments, pulls logs, and triggers Claude for intelligent analysis
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface DeploymentLog {
  timestamp: string
  lines: string[]
  hasErrors: boolean
}

interface AnalysisResult {
  severity: 'critical' | 'warning' | 'info'
  errorType: string
  description: string
  suggestedFixes: string[]
  autoFixable: boolean
  recommendation: string
}

const LOG_FILE = path.join(__dirname, '../.deployment-logs.json')
const CHECK_INTERVAL = 60000 // 60 seconds between checks
const PROJECT_NAME = 'bh-academy-seven.vercel.app'

let lastDeploymentId = ''
let isMonitoring = false

// Fetch latest deployment from Vercel
async function getLatestDeployment(): Promise<{ id: string; status: string; url: string }> {
  return new Promise((resolve) => {
    let output = ''
    const proc = spawn('vercel', ['list', '--limit', '1', '--json'])

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', () => {
      try {
        const data = JSON.parse(output)
        if (data.deployments && data.deployments[0]) {
          const deployment = data.deployments[0]
          resolve({
            id: deployment.uid,
            status: deployment.state,
            url: deployment.url,
          })
        }
      } catch (e) {
        resolve({ id: '', status: 'unknown', url: '' })
      }
    })
  })
}

// Fetch Vercel deployment logs
async function fetchDeploymentLogs(): Promise<DeploymentLog> {
  return new Promise((resolve) => {
    let output = ''
    const proc = spawn('vercel', ['logs', PROJECT_NAME, '--limit', '200'])

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', () => {
      const lines = output.split('\n').filter((l) => l.trim())
      const hasErrors = lines.some(
        (l) =>
          l.toLowerCase().includes('error') ||
          l.toLowerCase().includes('failed') ||
          l.toLowerCase().includes('type error')
      )

      resolve({
        timestamp: new Date().toISOString(),
        lines,
        hasErrors,
      })
    })
  })
}

// Analyze logs using Claude API (mock - would use @anthropic-ai/sdk in production)
async function analyzeWithClaude(logs: string[]): Promise<AnalysisResult> {
  // This is a placeholder that demonstrates what the analysis would look like
  // In production, this would call Claude API via @anthropic-ai/sdk
  // with a detailed prompt about Vercel error patterns

  const logText = logs.join('\n')

  if (logText.includes('Type error:')) {
    return {
      severity: 'critical',
      errorType: 'TypeScript Compilation',
      description: 'Build failed due to TypeScript type errors detected in the codebase.',
      suggestedFixes: ['Review reported type errors', 'Add missing type annotations', 'Update type definitions'],
      autoFixable: false,
      recommendation: 'Manual review required. Check the error messages above for specific line numbers and required types.',
    }
  }

  if (logText.includes('Module not found') || logText.includes('Cannot find module')) {
    return {
      severity: 'critical',
      errorType: 'Missing Dependency',
      description: 'Build failed due to a missing or uninstalled package.',
      suggestedFixes: [
        'Run npm install to restore dependencies',
        'Check package.json for required packages',
        'Verify package versions are compatible',
      ],
      autoFixable: true,
      recommendation: 'Running npm install to restore dependencies...',
    }
  }

  if (logText.includes('migration') && logText.toLowerCase().includes('error')) {
    return {
      severity: 'critical',
      errorType: 'Database Migration',
      description: 'Database migration failed during build process.',
      suggestedFixes: [
        'Review migration syntax',
        'Check database connection settings',
        'Verify migration order and dependencies',
      ],
      autoFixable: false,
      recommendation: 'Database migrations require manual review. Check MONITORING.md for troubleshooting.',
    }
  }

  if (logText.includes('Building')) {
    return {
      severity: 'info',
      errorType: 'Build In Progress',
      description: 'Deployment is currently building.',
      suggestedFixes: [],
      autoFixable: false,
      recommendation: 'No action needed. Waiting for build to complete...',
    }
  }

  return {
    severity: 'info',
    errorType: 'Unknown',
    description: 'No specific errors detected in logs.',
    suggestedFixes: [],
    autoFixable: false,
    recommendation: 'Build appears to be progressing normally. Continue monitoring.',
  }
}

// Apply automatic fixes
async function applyFix(analysis: AnalysisResult): Promise<boolean> {
  console.log(`\n🔧 Applying fix for: ${analysis.errorType}`)

  if (analysis.errorType === 'Missing Dependency') {
    console.log('📦 Running npm install...')

    return new Promise((resolve) => {
      const npmProc = spawn('npm', ['install'])

      npmProc.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies restored successfully')
          console.log('🔄 Triggering new deployment...')

          const gitProc = spawn('git', ['push', 'origin', 'main'])
          gitProc.on('close', () => {
            console.log('📤 New deployment triggered')
            resolve(true)
          })
        } else {
          console.log('❌ Failed to restore dependencies')
          resolve(false)
        }
      })
    })
  }

  return false
}

// Log analysis to file
function saveAnalysis(analysis: AnalysisResult) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    analysis,
  }

  const logs = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')) : []
  logs.push(logEntry)

  // Keep last 50 entries
  if (logs.length > 50) {
    logs.shift()
  }

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2))
}

// Display analysis in terminal
function displayAnalysis(analysis: AnalysisResult) {
  console.log('\n' + '='.repeat(60))

  const severityEmoji = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
  }

  console.log(`${severityEmoji[analysis.severity]} ${analysis.severity.toUpperCase()}: ${analysis.errorType}`)
  console.log('-'.repeat(60))
  console.log(`📝 ${analysis.description}`)

  if (analysis.suggestedFixes.length > 0) {
    console.log('\n💡 Suggested Fixes:')
    analysis.suggestedFixes.forEach((fix, i) => {
      console.log(`   ${i + 1}. ${fix}`)
    })
  }

  console.log(`\n🎯 ${analysis.recommendation}`)
  console.log('='.repeat(60) + '\n')
}

// Main monitoring loop
async function monitor() {
  console.log('🚀 Claude-Powered Deployment Agent Started')
  console.log(`📍 Monitoring: ${PROJECT_NAME}`)
  console.log(`⏱️ Check interval: ${CHECK_INTERVAL / 1000}s`)
  console.log('📊 Analysis logs: ' + LOG_FILE)
  console.log('---\n')

  isMonitoring = true

  // eslint-disable-next-line no-constant-condition
  while (isMonitoring) {
    try {
      const deployment = await getLatestDeployment()

      console.log(`[${new Date().toLocaleTimeString()}] Checking deployment status: ${deployment.status}`)

      if (deployment.id && deployment.id !== lastDeploymentId) {
        console.log(`📦 New deployment detected: ${deployment.id}`)
        lastDeploymentId = deployment.id

        // Wait a moment for logs to populate
        await new Promise((r) => setTimeout(r, 5000))

        const logs = await fetchDeploymentLogs()

        if (logs.hasErrors) {
          console.log('❌ Errors detected in build logs')

          const analysis = await analyzeWithClaude(logs.lines)
          displayAnalysis(analysis)
          saveAnalysis(analysis)

          if (analysis.autoFixable) {
            const fixed = await applyFix(analysis)
            if (fixed) {
              console.log('✅ Automatic fix applied and new deployment triggered')
            }
          }
        } else {
          console.log('✅ Deployment successful - no errors detected')
        }
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL))
    } catch (error) {
      console.error(`Monitor error: ${error}`)
    }
  }
}

// Start monitoring
console.clear()
monitor().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Claude Deployment Agent stopped')
  isMonitoring = false
  process.exit(0)
})
