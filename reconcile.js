// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

const latestByTransaction = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n").filter((l) => l.length > 0);
for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  if (!event.txn_id) {
    continue;
  }

  const timestamp = Date.parse(event.ts);
  const previous = latestByTransaction.get(event.txn_id);
  if (!previous || timestamp > previous.timestamp) {
    latestByTransaction.set(event.txn_id, { event, timestamp });
  }
}

let totalCents = 0;
let count = 0;
for (const { event } of latestByTransaction.values()) {
  if (event.status !== "success") {
    continue;
  }

  const amount = String(event.amount).replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) {
    throw new Error(`Invalid amount for transaction ${event.txn_id}: ${event.amount}`);
  }

  const fractionalCents = Number((match[2] || "").padEnd(2, "0"));
  totalCents += Number(match[1]) * 100 + fractionalCents;
  count += 1;
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(totalCents / 100)}`);
}
