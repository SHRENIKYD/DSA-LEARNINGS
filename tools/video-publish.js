// Dispatch and monitor the existing release workflows; never change their Play settings or versioning.
const { execFileSync } = require('node:child_process');
const gh = args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function publish(workflow, recover, cli = gh, wait = pause) {
  const repo = process.env.GITHUB_REPOSITORY || 'SHRENIKYD/DSA-LEARNINGS';
  const list = () => JSON.parse(cli(['run', 'list', '--repo', repo, '--workflow', workflow, '--branch', 'main', '--event', 'workflow_dispatch', '--limit', '10', '--json', 'databaseId,status,conclusion,createdAt']));
  let run;
  if (recover) {
    run = list()[0];
    if (!run || run.conclusion === 'success') return;
    if (run.status === 'completed') cli(['run', 'rerun', String(run.databaseId), '--repo', repo]);
  } else {
    const existing = new Set(list().map(r => r.databaseId));
    cli(['workflow', 'run', workflow, '--repo', repo, '--ref', 'main']);
    for (let i = 0; i < 12; i++) {
      run = list().find(r => !existing.has(r.databaseId));
      if (run) break;
      await wait(5000);
    }
    if (!run) throw new Error(`Cannot locate dispatched ${workflow} run`);
  }
  console.log(`Waiting for ${workflow}: ${run.databaseId}`);
  // gh exits nonzero on a failed workflow; the parent video job must fail too.
  cli(['run', 'watch', String(run.databaseId), '--repo', repo, '--exit-status', '--interval', '20']);
}
async function main() {
  const recover = process.argv.includes('--recover');
  await publish('pages.yml', recover);
  if (recover || process.argv.includes('--app')) {
    let recoverApp = recover;
    if (recover) {
      const version = require('../package.json').appVersion;
      try { gh(['release', 'view', 'app-v' + version, '--repo', process.env.GITHUB_REPOSITORY || 'SHRENIKYD/DSA-LEARNINGS']); }
      catch { recoverApp = false; } // A website failure may have prevented app dispatch entirely.
    }
    await publish('android.yml', recoverApp);
  }
}
module.exports = { publish };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
