import { BenchmarkSuite, CONCURRENCY_LEVELS, StatisticalMetrics } from './benchmark-downloads';

/**
 * Generate the HTML header and style section for the report
 */
export function generateHtmlHeader(suite: BenchmarkSuite): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download Performance Baseline - ${suite.environment}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    .text-right { text-align: right; }
    .small { background-color: #e3f2fd; }
    .medium { background-color: #fff9c4; }
    .large { background-color: #ffccbc; }
    .api { border-left: 4px solid #4caf50; }
    .proxy { border-left: 4px solid #2196f3; }
    
    /* Chart styles */
    .chart-container { 
      width: 100%; 
      height: 400px; 
      margin-bottom: 30px; 
      position: relative;
    }
    
    /* Card for metrics */
    .metric-card {
      background: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      padding: 15px;
    }
    
    .metric-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: bold;
    }
    
    .metric-label {
      font-size: 14px;
      color: #666;
    }
    
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="container">
`;
}

/**
 * Generate the summary section of the HTML report
 */
export function generateSummarySection(suite: BenchmarkSuite, stats: StatisticalMetrics[]): string {
  const successRate = (suite.successful / suite.totalTests) * 100;
  const totalDuration = suite.endTime - suite.startTime;

  return `
    <h1>Download Performance Baseline Report</h1>
    
    <div class="summary">
      <h2>Summary</h2>
      <p><strong>Environment:</strong> ${suite.environment}</p>
      <p><strong>Base URL:</strong> ${suite.baseUrl}</p>
      <p><strong>Test Date:</strong> ${suite.date}</p>
      <p><strong>Total Duration:</strong> ${(totalDuration / 1000).toFixed(2)}s</p>
      <p><strong>Tests:</strong> ${suite.totalTests}</p>
      <p><strong>Success Rate:</strong> ${successRate.toFixed(2)}% (${suite.successful} passed, ${suite.failed} failed)</p>
    </div>
    
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-title">Avg API Response Time</div>
        <div class="metric-value">${Math.round(stats.filter((s) => s.testType === 'api').reduce((sum, s) => sum + s.avg, 0) / stats.filter((s) => s.testType === 'api').length)}ms</div>
        <div class="metric-label">Overall Average</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">Avg Proxy Response Time</div>
        <div class="metric-value">${Math.round(stats.filter((s) => s.testType === 'proxy').reduce((sum, s) => sum + s.avg, 0) / stats.filter((s) => s.testType === 'proxy').length)}ms</div>
        <div class="metric-label">Overall Average</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">Avg TTFB</div>
        <div class="metric-value">${Math.round(stats.reduce((sum, s) => sum + s.avgTtfb, 0) / stats.length)}ms</div>
        <div class="metric-label">Time to First Byte</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-title">Avg Transfer Speed</div>
        <div class="metric-value">${Math.round(stats.reduce((sum, s) => sum + s.avgTransferSpeed, 0) / stats.length)} KB/s</div>
        <div class="metric-label">Download Speed</div>
      </div>
    </div>
`;
}

/**
 * Generate the charts section of the HTML report
 */
export function generateChartsSection(): string {
  return `
    <h2>Performance by Asset Size and Type</h2>
    
    <div class="chart-container">
      <canvas id="responseTimes"></canvas>
    </div>
    
    <h2>Concurrency Impact</h2>
    
    <div class="chart-container">
      <canvas id="concurrencyImpact"></canvas>
    </div>
`;
}

/**
 * Generate the metrics table for the HTML report
 */
export function generateMetricsTable(stats: StatisticalMetrics[]): string {
  return `
    <h2>Detailed Metrics</h2>
    
    <table>
      <thead>
        <tr>
          <th>Book</th>
          <th>Size Category</th>
          <th>Test Type</th>
          <th>Concurrency</th>
          <th>Sample Size</th>
          <th class="text-right">Avg (ms)</th>
          <th class="text-right">Median (ms)</th>
          <th class="text-right">Min (ms)</th>
          <th class="text-right">Max (ms)</th>
          <th class="text-right">P95 (ms)</th>
          <th class="text-right">TTFB (ms)</th>
          <th class="text-right">Speed (KB/s)</th>
          <th class="text-right">Avg Size (KB)</th>
        </tr>
      </thead>
      <tbody>
        ${stats
          .map(
            (stat) => `
          <tr class="${stat.category} ${stat.testType}">
            <td>${stat.name}</td>
            <td>${stat.category}</td>
            <td>${stat.testType}</td>
            <td>${stat.concurrencyLevel}</td>
            <td>${stat.count}</td>
            <td class="text-right">${Math.round(stat.avg)}</td>
            <td class="text-right">${Math.round(stat.median)}</td>
            <td class="text-right">${Math.round(stat.min)}</td>
            <td class="text-right">${Math.round(stat.max)}</td>
            <td class="text-right">${Math.round(stat.p95)}</td>
            <td class="text-right">${Math.round(stat.avgTtfb)}</td>
            <td class="text-right">${Math.round(stat.avgTransferSpeed)}</td>
            <td class="text-right">${(stat.avgSize / 1024).toFixed(2)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
`;
}

/**
 * Generate the raw results table for the HTML report
 */
export function generateRawResultsTable(suite: BenchmarkSuite): string {
  return `
    <h2>Raw Test Results</h2>
    
    <table>
      <thead>
        <tr>
          <th>Book</th>
          <th>Asset</th>
          <th>Category</th>
          <th>Test Type</th>
          <th>Concurrency</th>
          <th>Test #</th>
          <th>Status</th>
          <th class="text-right">Total Time (ms)</th>
          <th class="text-right">TTFB (ms)</th>
          <th class="text-right">Download (ms)</th>
          <th class="text-right">Size (KB)</th>
          <th class="text-right">Speed (KB/s)</th>
        </tr>
      </thead>
      <tbody>
        ${suite.results
          .filter((r) => r.success)
          .map(
            (result) => `
            <tr>
              <td>${result.bookSlug}</td>
              <td>${result.assetName}</td>
              <td>${result.category}</td>
              <td>${result.testType}</td>
              <td>${result.concurrencyLevel}</td>
              <td>${result.testIndex + 1}</td>
              <td>${result.metrics.status || 'N/A'}</td>
              <td class="text-right">${result.metrics.totalDurationMs}</td>
              <td class="text-right">${result.metrics.ttfbMs}</td>
              <td class="text-right">${result.metrics.downloadDurationMs}</td>
              <td class="text-right">${result.metrics.contentLength ? (result.metrics.contentLength / 1024).toFixed(2) : 'N/A'}</td>
              <td class="text-right">${result.metrics.transferSpeedKBps || 'N/A'}</td>
            </tr>
          `
          )
          .join('')}
      </tbody>
    </table>
`;
}

/**
 * Generate the JavaScript for charts in the HTML report
 */
export function generateChartScripts(stats: StatisticalMetrics[]): string {
  return `
  <script>
    // Prepare chart data
    window.onload = function() {
      // Create response times chart
      const responseTimesCtx = document.getElementById('responseTimes').getContext('2d');
      
      new Chart(responseTimesCtx, {
        type: 'bar',
        data: {
          labels: ['Small', 'Medium', 'Large'],
          datasets: [
            {
              label: 'API Response Time (ms)',
              data: [
                ${Math.round(stats.filter((s) => s.category === 'small' && s.testType === 'api').reduce((sum, s) => sum + s.avg, 0) / stats.filter((s) => s.category === 'small' && s.testType === 'api').length || 0)},
                ${Math.round(stats.filter((s) => s.category === 'medium' && s.testType === 'api').reduce((sum, s) => sum + s.avg, 0) / stats.filter((s) => s.category === 'medium' && s.testType === 'api').length || 0)},
                ${Math.round(stats.filter((s) => s.category === 'large' && s.testType === 'api').reduce((sum, s) => sum + s.avg, 0) / stats.filter((s) => s.category === 'large' && s.testType === 'api').length || 0)}
              ],
              backgroundColor: 'rgba(76, 175, 80, 0.5)',
              borderColor: 'rgba(76, 175, 80, 1)',
              borderWidth: 1
            },
            {
              label: 'Proxy Response Time (ms)',
              data: [
                ${Math.round(stats.filter((s) => s.category === 'small' && s.testType === 'proxy').reduce((sum, s) => sum + s.avg, 0) / stats.filter((s) => s.category === 'small' && s.testType === 'proxy').length || 0)},
                ${Math.round(stats.filter((s) => s.category === 'medium' && s.testType === 'proxy').reduce((sum, s) => sum + s.avg, 0) / stats.filter((s) => s.category === 'medium' && s.testType === 'proxy').length || 0)},
                ${Math.round(stats.filter((s) => s.category === 'large' && s.testType === 'proxy').reduce((sum, s) => sum + s.avg, 0) / stats.filter((s) => s.category === 'large' && s.testType === 'proxy').length || 0)}
              ],
              backgroundColor: 'rgba(33, 150, 243, 0.5)',
              borderColor: 'rgba(33, 150, 243, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Response Time (ms)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Asset Size Category'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Average Response Time by Asset Size and Access Method'
            }
          }
        }
      });
      
      // Create concurrency impact chart
      const concurrencyCtx = document.getElementById('concurrencyImpact').getContext('2d');
      
      const concurrencyLevels = [${CONCURRENCY_LEVELS.join(', ')}];
      
      new Chart(concurrencyCtx, {
        type: 'line',
        data: {
          labels: concurrencyLevels,
          datasets: [
            {
              label: 'API Response Time (ms)',
              data: concurrencyLevels.map(level => {
                const filtered = stats.filter(s => s.testType === 'api' && s.concurrencyLevel === level);
                return filtered.length > 0 ? Math.round(filtered.reduce((sum, s) => sum + s.avg, 0) / filtered.length) : null;
              }),
              borderColor: 'rgba(76, 175, 80, 1)',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              tension: 0.1,
              fill: true
            },
            {
              label: 'Proxy Response Time (ms)',
              data: concurrencyLevels.map(level => {
                const filtered = stats.filter(s => s.testType === 'proxy' && s.concurrencyLevel === level);
                return filtered.length > 0 ? Math.round(filtered.reduce((sum, s) => sum + s.avg, 0) / filtered.length) : null;
              }),
              borderColor: 'rgba(33, 150, 243, 1)',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              tension: 0.1,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Response Time (ms)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Concurrency Level'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Response Time vs Concurrency Level'
            }
          }
        }
      });
    };
  </script>
`;
}

/**
 * Generate a complete HTML report from benchmark results
 */
export function generateHtmlReport(suite: BenchmarkSuite, stats: StatisticalMetrics[]): string {
  return (
    generateHtmlHeader(suite) +
    generateSummarySection(suite, stats) +
    generateChartsSection() +
    generateMetricsTable(stats) +
    generateRawResultsTable(suite) +
    `  </div>\n` +
    generateChartScripts(stats) +
    `</body>\n</html>\n`
  );
}
