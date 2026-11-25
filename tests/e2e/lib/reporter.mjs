export function createSuiteCollector(tierName) {
  const checks = [];

  async function check(id, description, fn) {
    const startedAt = Date.now();
    try {
      await fn();
      checks.push({
        id,
        description,
        passed: true,
        durationMs: Date.now() - startedAt,
        error: null,
      });
    } catch (err) {
      checks.push({
        id,
        description,
        passed: false,
        durationMs: Date.now() - startedAt,
        error: err?.stack || err?.message || String(err),
      });
    }
  }

  function summary() {
    const passed = checks.filter((c) => c.passed).length;
    const failed = checks.length - passed;
    return {
      tier: tierName,
      total: checks.length,
      passed,
      failed,
      checks,
    };
  }

  return { check, summary };
}

export function printTierReport(report) {
  console.log(`\n=== ${report.tier} (${report.passed}/${report.total} passed) ===`);
  for (const c of report.checks) {
    const mark = c.passed ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${c.id}: ${c.description} (${c.durationMs}ms)`);
    if (!c.passed && c.error) {
      const indented = c.error
        .split('\n')
        .map((l) => `      ${l}`)
        .join('\n');
      console.log(indented);
    }
  }
}
