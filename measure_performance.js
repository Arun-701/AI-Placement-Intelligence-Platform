#!/usr/bin/env node
/**
 * Performance Measurement Script for Adaptive Assessment
 * Measures Ollama calls, generation time, and validates question quality
 */

const fs = require('fs');
const path = require('path');

// Color output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function parseServerLogs(logFile) {
    if (!fs.existsSync(logFile)) {
        log(`⚠ Log file not found: ${logFile}`, 'yellow');
        return null;
    }

    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n');

    const metrics = {
        perfLogs: [],
        ollamaCalls: 0,
        totalMs: null,
        questionCount: 0,
        batchSize: null,
        milestones: [],
        errors: []
    };

    let currentMilestone = null;
    
    for (const line of lines) {
        // Count [PERF] logs
        if (line.includes('[PERF]')) {
            metrics.perfLogs.push(line);
            
            // Extract metrics
            const msMatch = line.match(/ollamaMs=(\d+)/);
            const totalMatch = line.match(/totalMs=(\d+)/);
            const batchMatch = line.match(/batchSize=(\d+)/);
            const milestoneMatch = line.match(/milestone=([^\s]+)/);
            
            if (milestoneMatch && !metrics.milestones.includes(milestoneMatch[1])) {
                metrics.milestones.push(milestoneMatch[1]);
            }
            
            if (batchMatch) {
                metrics.batchSize = Math.max(metrics.batchSize || 0, parseInt(batchMatch[1]));
            }
        }
        
        // Count Ollama calls (by POST to /api/generate)
        if (line.includes('POST /api/generate') || line.includes('api/generate')) {
            metrics.ollamaCalls++;
        }
        
        // Get total assessment time
        if (line.includes('[PERF] assessment totalMs=')) {
            const match = line.match(/totalMs=(\d+)/);
            if (match) {
                metrics.totalMs = parseInt(match[1]);
            }
        }
        
        // Get question count
        if (line.includes('[ADAPTIVE_MILESTONE_SAVED]') || line.includes('questionCount:')) {
            const match = line.match(/questionCount[=:][\s]*(\d+)/);
            if (match) {
                metrics.questionCount = parseInt(match[1]);
            }
        }
        
        // Track errors
        if (line.includes('[ADAPTIVE_FATAL_ERROR]') || line.includes('error')) {
            metrics.errors.push(line);
        }
    }

    return metrics;
}

function calculateMetrics(metrics) {
    if (!metrics || metrics.ollamaCalls === 0) {
        return null;
    }

    return {
        ollamaCalls: metrics.ollamaCalls,
        questionsGenerated: metrics.questionCount || 'unknown',
        callsPerQuestion: metrics.questionCount > 0 ? (metrics.ollamaCalls / metrics.questionCount).toFixed(2) : 'N/A',
        avgTimePerCall: metrics.totalMs > 0 ? (metrics.totalMs / metrics.ollamaCalls).toFixed(0) : 'N/A',
        totalTime: metrics.totalMs ? `${metrics.totalMs}ms` : 'unknown',
        batchSize: metrics.batchSize || 'N/A',
        milestones: metrics.milestones.length,
        errors: metrics.errors.length
    };
}

async function main() {
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║  ADAPTIVE ASSESSMENT OPTIMIZATION MEASUREMENT SCRIPT      ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');

    // Check if we have server logs
    const serverDir = path.join(__dirname, 'server');
    const logFile = path.join(serverDir, 'server.log');
    const consoleLogFile = path.join(__dirname, 'server_console.log');

    log('📊 PERFORMANCE ANALYSIS', 'blue');
    log('═'.repeat(60), 'blue');

    const metrics = parseServerLogs(logFile) || parseServerLogs(consoleLogFile);

    if (!metrics || metrics.perfLogs.length === 0) {
        log('\n⚠ No performance data found in logs', 'yellow');
        log('\nTo measure performance:', 'yellow');
        log('1. Start server: cd server && node server.js 2>&1 | tee server.log', 'yellow');
        log('2. Run test: node test_adaptive_trace.js', 'yellow');
        log('3. Run this script: node measure_performance.js\n', 'yellow');
        process.exit(0);
    }

    const summary = calculateMetrics(metrics);

    if (summary) {
        log('\n📈 METRICS SUMMARY', 'green');
        log('─'.repeat(60), 'green');
        log(`Total Ollama Calls:        ${summary.ollamaCalls}`, 'cyan');
        log(`Questions Generated:       ${summary.questionsGenerated}`, 'cyan');
        log(`Calls per Question:        ${summary.callsPerQuestion}`, 'cyan');
        log(`Avg Time per Call:         ${summary.avgTimePerCall}ms`, 'cyan');
        log(`Total Generation Time:     ${summary.totalTime}`, 'cyan');
        log(`Max Batch Size:            ${summary.batchSize}`, 'cyan');
        log(`Milestones Processed:      ${summary.milestones}`, 'cyan');
        log(`Errors:                    ${summary.errors}`, summary.errors > 0 ? 'red' : 'green');

        // Optimization assessment
        log('\n💡 OPTIMIZATION ASSESSMENT', 'blue');
        log('─'.repeat(60), 'blue');
        
        if (summary.callsPerQuestion < 1.5) {
            log(`✓ Batch optimization is working! (${summary.callsPerQuestion} calls/question)`, 'green');
        } else if (summary.callsPerQuestion === 1) {
            log('⚠ Batch generation not active (fallback to individual generation)', 'yellow');
        } else {
            log('? Unexpected call/question ratio', 'yellow');
        }

        if (summary.batchSize > 1) {
            log(`✓ Batch generation active with batch size: ${summary.batchSize}`, 'green');
        }
    }

    // Show raw perf logs
    log('\n📋 DETAILED PERFORMANCE LOGS', 'blue');
    log('─'.repeat(60), 'blue');
    if (metrics.perfLogs.length > 0) {
        metrics.perfLogs.forEach(line => {
            const sanitized = line.split('[PERF]')[1] || line;
            log(`[PERF]${sanitized}`, 'cyan');
        });
    }

    // Recommendations
    log('\n🎯 RECOMMENDATIONS', 'blue');
    log('─'.repeat(60), 'blue');
    
    if (summary) {
        if (summary.callsPerQuestion < 1.5 && summary.batchSize > 1) {
            log('✓ Optimization is active and effective', 'green');
            log('✓ Batch generation is working correctly', 'green');
            log(`✓ Expected speedup: ~${Math.round(1 / parseFloat(summary.callsPerQuestion))}x faster`, 'green');
        } else if (summary.errors > 0) {
            log('⚠ Some errors detected in generation process', 'yellow');
            log('→ Check server logs for [ADAPTIVE_FATAL_ERROR]', 'yellow');
        } else {
            log('ℹ Consider testing with Ollama running for accurate measurements', 'cyan');
        }
    }

    log('\n✨ MEASUREMENT COMPLETE\n', 'green');
}

main().catch(err => {
    log(`\n✗ Error: ${err.message}\n`, 'red');
    process.exit(1);
});
