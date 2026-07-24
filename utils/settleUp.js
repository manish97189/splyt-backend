/**
 * utils/settleUp.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Pure function that computes the MINIMUM number of transactions
 * needed to settle all debts within a group.
 *
 * ─── What "pure function" means ─────────────────────────────────────────────
 * A pure function has no side effects: it doesn't talk to a database, doesn't
 * modify global state, doesn't make HTTP calls. Given the same input it always
 * produces the same output. This makes it trivially unit-testable and easy to
 * reason about.
 *
 * ─── The Algorithm ───────────────────────────────────────────────────────────
 * INPUT:
 *   balances — an object: { userId: netBalance, ... }
 *     where netBalance = (total paid by this user) − (total owed by this user)
 *     Positive value → this person is owed money (creditor)
 *     Negative value → this person owes money (debtor)
 *
 * STEPS:
 *   1. Split members into two lists: creditors (balance > 0) and
 *      debtors (balance < 0).
 *   2. Sort creditors descending by balance (largest first).
 *      Sort debtors ascending by balance (most negative = biggest debtor first).
 *   3. Greedy two-pointer loop:
 *      a. Take the largest debtor D and the largest creditor C.
 *      b. The settlement amount is the smaller of |D| and C.
 *      c. Record transaction: D pays C that amount.
 *      d. Reduce both balances by the settlement amount.
 *      e. Remove D or C from their list if their balance reaches ~0.
 *      f. Repeat until both lists are empty.
 *
 * WHY GREEDY WORKS:
 *   Each iteration always reduces at least one person to zero balance,
 *   eliminating them from further consideration. This minimises transactions:
 *   n members → at most n−1 transactions (a spanning tree of debt).
 *   No algorithm can do better than n−1 in the general case.
 *
 * FLOATING-POINT NOTE:
 *   We use a tiny epsilon (0.005) when checking "is this balance ~0?" to
 *   handle floating-point precision errors (e.g., 0.00000001 remaining after
 *   dividing $100 by 3).
 *
 * OUTPUT:
 *   Array of transactions: [{ from: userId, to: userId, amount: number }, ...]
 *   Empty array if all balances are already 0.
 *
 * ─── Example ─────────────────────────────────────────────────────────────────
 *   balances = { 1: 70, 2: -30, 3: -40 }
 *   (User 1 paid more and is owed $70; User 2 owes $30; User 3 owes $40)
 *
 *   Step 1: creditors=[{id:1, b:70}], debtors=[{id:3, b:-40},{id:2, b:-30}]
 *   Step 2: settle = min(40, 70) = 40
 *           → tx: user 3 pays user 1 $40
 *           → user 1 balance: 70-40=30, user 3 balance: 0 (removed)
 *   Step 3: settle = min(30, 30) = 30
 *           → tx: user 2 pays user 1 $30
 *           → both reach 0 (removed)
 *   Result: [{from:3, to:1, amount:40}, {from:2, to:1, amount:30}] ✓
 * ─────────────────────────────────────────────────────────────────────────────
 */

const EPSILON = 0.005; // treat anything smaller than half a cent as zero

/**
 * settleUp
 * @param {Object} balances - { [userId]: netBalance }
 * @returns {Array<{from: string|number, to: string|number, amount: number}>}
 */
function settleUp(balances) {
  // ── Step 1: Separate into creditors and debtors ──────────────────────────
  const creditors = []; // people who are owed money
  const debtors   = []; // people who owe money

  for (const [userId, balance] of Object.entries(balances)) {
    const b = parseFloat(balance);
    if (b > EPSILON) {
      creditors.push({ id: userId, balance: b });
    } else if (b < -EPSILON) {
      debtors.push({ id: userId, balance: b });
    }
    // Balances within ±EPSILON are treated as settled — skip them
  }

  if (creditors.length === 0 || debtors.length === 0) {
    return []; // nothing to settle
  }

  // ── Step 2: Sort (largest amounts first) ─────────────────────────────────
  // Sort creditors largest-first (descending by balance)
  creditors.sort((a, b) => b.balance - a.balance);
  // Sort debtors most-negative-first (ascending by balance, i.e. -40 before -10)
  debtors.sort((a, b) => a.balance - b.balance);

  const transactions = [];

  // ── Step 3: Greedy matching loop ──────────────────────────────────────────
  let ci = 0; // index into creditors array
  let di = 0; // index into debtors array

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor   = debtors[di];

    // How much can we settle? The smaller of what the debtor owes and
    // what the creditor is owed.
    const settleAmount = Math.min(creditor.balance, Math.abs(debtor.balance));

    // Round to 2 decimal places to avoid floating-point dust
    const amount = parseFloat(settleAmount.toFixed(2));

    if (amount > EPSILON) {
      transactions.push({
        from:   debtor.id,   // debtor pays…
        to:     creditor.id, // …creditor
        amount,
      });
    }

    // Reduce both balances
    creditor.balance -= settleAmount;
    debtor.balance   += settleAmount; // debtor.balance is negative, so += makes it less negative

    // If the creditor is now ~settled, move to the next creditor
    if (creditor.balance < EPSILON) {
      ci++;
    }
    // If the debtor is now ~settled, move to the next debtor
    if (Math.abs(debtor.balance) < EPSILON) {
      di++;
    }
  }

  return transactions;
}

module.exports = settleUp;
