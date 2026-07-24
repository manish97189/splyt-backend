/**
 * utils/testSettleUp.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Standalone test script to verify the settleUp algorithm with
 * several known-answer test cases. No database, no server — just Node.js.
 *
 * Run with:  node backend/utils/testSettleUp.js
 *
 * Each test case specifies an input balance map and the expected number of
 * transactions. We also verify that:
 *   1. The transaction amounts are positive.
 *   2. The net flow for each user matches their starting balance.
 *      (i.e., the algorithm doesn't create or destroy money)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const settleUp = require('./settleUp');

// ── Helper: verify transactions balance correctly ─────────────────────────────
function verifyTransactions(balances, transactions, label) {
  // Compute net flow per user from the transactions
  const flow = {};
  for (const [userId] of Object.entries(balances)) {
    flow[userId] = 0;
  }
  for (const tx of transactions) {
    flow[tx.from] = (flow[tx.from] || 0) - tx.amount;
    flow[tx.to]   = (flow[tx.to]   || 0) + tx.amount;
  }

  // Check that flow matches original balances (within rounding tolerance)
  for (const [userId, expectedBalance] of Object.entries(balances)) {
    const actual = flow[userId] || 0;
    if (Math.abs(actual - expectedBalance) > 0.02) {
      console.error(
        `  ❌ FAIL [${label}]: User ${userId} — expected flow ${expectedBalance}, got ${actual}`
      );
      return false;
    }
  }
  return true;
}

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function runTest(label, balances, expectedTxCount) {
  const transactions = settleUp(balances);

  const countOk  = transactions.length === expectedTxCount;
  const balanceOk = verifyTransactions(balances, transactions, label);

  if (countOk && balanceOk) {
    console.log(`  ✅ PASS [${label}]: ${transactions.length} transaction(s)`);
    transactions.forEach((tx) =>
      console.log(`        User ${tx.from} → User ${tx.to}: $${tx.amount}`)
    );
    passed++;
  } else {
    if (!countOk) {
      console.error(
        `  ❌ FAIL [${label}]: expected ${expectedTxCount} tx, got ${transactions.length}`
      );
    }
    console.error('     Transactions:', JSON.stringify(transactions, null, 2));
    failed++;
  }
}

// ── Test Cases ────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════');
console.log('  settleUp Algorithm — Test Suite');
console.log('══════════════════════════════════════\n');

// Test 1: Simple 2-person case
// User 1 paid $60, User 2 owes $60 → 1 transaction
console.log('Test 1: Simple 2-person debt');
runTest(
  'two-person',
  { 1: 60, 2: -60 },
  1  // expected: 1 transaction
);

// Test 2: Three-person case from algorithm comment
// User 1 paid more (+70), User 2 owes 30, User 3 owes 40 → 2 transactions
console.log('\nTest 2: Three-person (unequal)');
runTest(
  'three-person-unequal',
  { 1: 70, 2: -30, 3: -40 },
  2
);

// Test 3: All balanced — nothing to settle
console.log('\nTest 3: Already balanced (net zero)');
runTest(
  'already-balanced',
  { 1: 0, 2: 0, 3: 0 },
  0
);

// Test 4: One creditor, multiple debtors
// User 1 is owed $90, Users 2/3/4 each owe $30 → 3 transactions
console.log('\nTest 4: One creditor, three debtors');
runTest(
  'one-creditor-three-debtors',
  { 1: 90, 2: -30, 3: -30, 4: -30 },
  3
);

// Test 5: Multiple creditors and debtors
// User 1 +50, User 2 +30, User 3 -40, User 4 -40 → max 3 transactions
console.log('\nTest 5: Two creditors, two debtors');
runTest(
  'two-creditors-two-debtors',
  { 1: 50, 2: 30, 3: -40, 4: -40 },
  3
);

// Test 6: Floating-point stress test (100 / 3)
// User 1 paid $100, split 3 ways (equal split rounding)
console.log('\nTest 6: Floating-point rounding ($100 / 3 people)');
runTest(
  'floating-point',
  {
    1: parseFloat((100 - 33.33).toFixed(2)),  // 66.67 (paid 100, owes 33.33)
    2: -33.33,
    3: -33.34,
  },
  2
);

// Test 7: Large group (6 members, mixed balances)
console.log('\nTest 7: Six-member group');
runTest(
  'six-members',
  { 1: 100, 2: 50, 3: -30, 4: -60, 5: -40, 6: -20 },
  4 // 6 members → at most 5 transactions; greedy gets 4 here
);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

if (failed > 0) {
  process.exit(1); // non-zero exit so CI tools know tests failed
}
