/**
 * Kill process using port 3000
 * Run with: node scripts/kill-port.js
 */

const { exec } = require('child_process');

const port = process.argv[2] || '3000';

console.log(`Finding process using port ${port}...`);

// Find process using the port
exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
  if (error) {
    console.log(`✅ No process found using port ${port}`);
    return;
  }

  const lines = stdout.trim().split('\n');
  const pids = new Set();

  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length > 0) {
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    }
  });

  if (pids.size === 0) {
    console.log(`✅ No process found using port ${port}`);
    return;
  }

  console.log(`Found ${pids.size} process(es) using port ${port}:`);
  pids.forEach(pid => console.log(`  PID: ${pid}`));

  // Kill each process
  pids.forEach(pid => {
    exec(`taskkill /PID ${pid} /F`, (error, stdout, stderr) => {
      if (error) {
        console.log(`⚠️  Could not kill process ${pid}: ${error.message}`);
      } else {
        console.log(`✅ Killed process ${pid}`);
      }
    });
  });

  console.log(`\n✅ Port ${port} should now be free. You can now run: npm run dev`);
});

