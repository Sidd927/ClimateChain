const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ns = (registry, batch) => ethers.keccak256(ethers.toUtf8Bytes(`${registry}:${batch}`));
const ref = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));
const h = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));
const R = (n, start, end) => ({ ns: n, start, end });

const NS_A = ns("VCS", "18453");
const NS_B = ns("VCS", "18454");

async function deploy() {
  const [owner, registrar2, outsider, reviewer2] = await ethers.getSigners();
  const ledger = await (await ethers.getContractFactory("ClaimLedger")).deploy();
  return { ledger, owner, registrar2, outsider, reviewer2 };
}

/** Compute predecessor hints off-chain (as a client would), accounting for earlier ranges in the same submission. */
async function withHints(ledger, ranges) {
  const base = await ledger.nextNodeId();
  const inserted = [];
  const out = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    let hint = await ledger.hintFor(r.ns, r.start);
    let hintStart = hint === 0n ? -1n : (await ledger.getNode(r.ns, hint)).start;
    for (const x of inserted) {
      if (x.ns === r.ns && BigInt(x.start) < BigInt(r.start) && BigInt(x.start) > hintStart) { hint = x.id; hintStart = BigInt(x.start); }
    }
    inserted.push({ ns: r.ns, start: r.start, id: base + BigInt(i) });
    out.push({ ...r, prevHint: hint });
  }
  return out;
}

async function register(ledger, refStr, ranges, signer) {
  const c = signer ? ledger.connect(signer) : ledger;
  return c.registerClaim(ref(refStr), await withHints(ledger, ranges), h("claimant"), h("evidence"), h("report"));
}

/** Walk a namespace list and return its intervals; asserts sorted, disjoint and doubly linked. */
async function walk(ledger, n) {
  const out = [];
  let prev = 0n;
  let cur = await ledger.head(n);
  while (cur !== 0n) {
    const node = await ledger.getNode(n, cur);
    expect(node.linked).to.equal(true);
    expect(node.prev).to.equal(prev);
    if (out.length) expect(node.start > out[out.length - 1].end).to.equal(true);
    out.push({ id: cur, start: node.start, end: node.end, claimId: node.claimId });
    prev = cur;
    cur = node.next;
  }
  expect(await ledger.namespaceSize(n)).to.equal(BigInt(out.length));
  return out;
}

describe("ClaimLedger", function () {
  describe("registration", function () {
    it("registers a claim and exposes it for verification", async function () {
      const { ledger, owner } = await loadFixture(deploy);
      await expect(register(ledger, "OO-1", [R(NS_A, 1000, 1999)]))
        .to.emit(ledger, "ClaimRegistered")
        .withArgs(1, ref("OO-1"), owner.address, 1, 1000);
      const c = await ledger.getClaim(1);
      expect(c.status).to.equal(1); // Active
      expect(c.evidenceHash).to.equal(h("evidence"));
      expect(await ledger.claimIdByRef(ref("OO-1"))).to.equal(1);
      const ranges = await ledger.getRanges(1);
      expect(ranges[0].start).to.equal(1000n);
      expect(await ledger.claimCount()).to.equal(1);
    });

    it("rejects a second registration of the same claim reference (duplicate record)", async function () {
      const { ledger } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1, 10)]);
      await expect(register(ledger, "OO-1", [R(NS_B, 1, 10)]))
        .to.be.revertedWithCustomError(ledger, "ClaimRefExists")
        .withArgs(ref("OO-1"), 1);
    });

    it("rejects an exact duplicate range (double use)", async function () {
      const { ledger } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1000, 1999)]);
      await expect(register(ledger, "OO-2", [R(NS_A, 1000, 1999)]))
        .to.be.revertedWithCustomError(ledger, "RangeOverlap")
        .withArgs(NS_A, 1, 1000, 1999);
    });

    it("rejects a partial overlap and reports the exact overlapping units", async function () {
      const { ledger } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1000, 1999)]);
      await expect(register(ledger, "OO-2", [R(NS_A, 1500, 2500)]))
        .to.be.revertedWithCustomError(ledger, "RangeOverlap")
        .withArgs(NS_A, 1, 1500, 1999);
      await expect(register(ledger, "OO-3", [R(NS_A, 1200, 1300)]))
        .to.be.revertedWithCustomError(ledger, "RangeOverlap")
        .withArgs(NS_A, 1, 1200, 1300);
      await expect(register(ledger, "OO-4", [R(NS_A, 1, 5000)]))
        .to.be.revertedWithCustomError(ledger, "RangeOverlap")
        .withArgs(NS_A, 1, 1000, 1999);
    });

    it("accepts adjacent ranges (no shared unit) and keeps the list sorted", async function () {
      const { ledger } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1000, 1999)]);
      await expect(register(ledger, "OO-2", [R(NS_A, 2000, 2999)])).to.emit(ledger, "ClaimRegistered");
      await expect(register(ledger, "OO-3", [R(NS_A, 1, 999)])).to.emit(ledger, "ClaimRegistered");
      const list = await walk(ledger, NS_A);
      expect(list.map((x) => x.start)).to.deep.equal([1n, 1000n, 2000n]);
    });

    it("treats the same unit numbers in different batches as distinct units", async function () {
      const { ledger } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1, 500)]);
      await expect(register(ledger, "OO-2", [R(NS_B, 1, 500)])).to.emit(ledger, "ClaimRegistered");
    });

    it("is atomic: one conflicting range rejects the whole multi-range claim", async function () {
      const { ledger } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 100, 199)]);
      await expect(register(ledger, "OO-2", [R(NS_B, 1, 10), R(NS_A, 150, 160)]))
        .to.be.revertedWithCustomError(ledger, "RangeOverlap");
      expect(await ledger.claimCount()).to.equal(1);
      const [free] = await ledger.checkRange(NS_B, 1, 10);
      expect(free).to.equal(true);
      expect(await ledger.namespaceSize(NS_B)).to.equal(0n);
    });

    it("accepts several disjoint ranges in one namespace in a single claim", async function () {
      const { ledger } = await loadFixture(deploy);
      await register(ledger, "OO-0", [R(NS_A, 500, 599)]);
      await expect(register(ledger, "OO-1", [R(NS_A, 100, 199), R(NS_A, 300, 399), R(NS_A, 700, 799)])).to.emit(ledger, "ClaimRegistered");
      const list = await walk(ledger, NS_A);
      expect(list.map((x) => x.start)).to.deep.equal([100n, 300n, 500n, 700n]);
    });

    it("rejects invalid and self-overlapping ranges", async function () {
      const { ledger } = await loadFixture(deploy);
      await expect(register(ledger, "X", [])).to.be.revertedWithCustomError(ledger, "EmptyRanges");
      await expect(register(ledger, "X", [R(NS_A, 10, 9)])).to.be.revertedWithCustomError(ledger, "InvalidRange").withArgs(0);
      await expect(register(ledger, "X", [R(NS_A, 0, 9)])).to.be.revertedWithCustomError(ledger, "InvalidRange").withArgs(0);
      await expect(register(ledger, "X", [R(NS_A, 1, 10), R(NS_A, 10, 20)]))
        .to.be.revertedWithCustomError(ledger, "InvalidRange").withArgs(1);
    });

    it("only registrars can register", async function () {
      const { ledger, outsider, registrar2 } = await loadFixture(deploy);
      await expect(register(ledger, "OO-1", [R(NS_A, 1, 2)], outsider)).to.be.revertedWithCustomError(ledger, "NotRegistrar");
      await expect(ledger.connect(outsider).setRegistrar(outsider.address, true)).to.be.revertedWithCustomError(ledger, "NotOwner");
      await ledger.setRegistrar(registrar2.address, true);
      await expect(register(ledger, "OO-1", [R(NS_A, 1, 2)], registrar2)).to.emit(ledger, "ClaimRegistered");
    });
  });

  describe("hints", function () {
    async function threeClaims() {
      const f = await deploy();
      await register(f.ledger, "A", [R(NS_A, 100, 199)]); // node 1
      await register(f.ledger, "B", [R(NS_A, 300, 399)]); // node 2
      await register(f.ledger, "C", [R(NS_A, 500, 599)]); // node 3
      return f;
    }
    const raw = (ledger, refStr, n, s, e, hint) => ledger.registerClaim(ref(refStr), [{ ns: n, start: s, end: e, prevHint: hint }], h("c"), h("e"), h("r"));

    it("hintFor returns the predecessor node", async function () {
      const { ledger } = await loadFixture(threeClaims);
      expect(await ledger.hintFor(NS_A, 50)).to.equal(0n);
      expect(await ledger.hintFor(NS_A, 250)).to.equal(1n);
      expect(await ledger.hintFor(NS_A, 450)).to.equal(2n);
      expect(await ledger.hintFor(NS_A, 900)).to.equal(3n);
    });

    it("rejects a hint that is too far left or too far right with BadHint", async function () {
      const { ledger } = await loadFixture(threeClaims);
      await expect(raw(ledger, "X", NS_A, 450, 460, 1)).to.be.revertedWithCustomError(ledger, "BadHint").withArgs(NS_A, 1); // too far left
      await expect(raw(ledger, "X", NS_A, 250, 260, 3)).to.be.revertedWithCustomError(ledger, "BadHint").withArgs(NS_A, 3); // too far right
      await expect(raw(ledger, "X", NS_A, 250, 260, 0)).to.be.revertedWithCustomError(ledger, "BadHint"); // head, but node 1 precedes
      await expect(raw(ledger, "X", NS_A, 250, 260, 99)).to.be.revertedWithCustomError(ledger, "BadHint").withArgs(NS_A, 99); // unknown node
      await expect(raw(ledger, "X", NS_B, 250, 260, 1)).to.be.revertedWithCustomError(ledger, "BadHint"); // node of another namespace
      await expect(raw(ledger, "X", NS_A, 250, 260, 1)).to.emit(ledger, "ClaimRegistered"); // correct hint
    });

    it("reports a genuine overlap as RangeOverlap even through a neighbour hint", async function () {
      const { ledger } = await loadFixture(threeClaims);
      await expect(raw(ledger, "X", NS_A, 350, 360, 1)).to.be.revertedWithCustomError(ledger, "RangeOverlap").withArgs(NS_A, 2, 350, 360);
      await expect(raw(ledger, "X", NS_A, 150, 160, 1)).to.be.revertedWithCustomError(ledger, "RangeOverlap").withArgs(NS_A, 1, 150, 160);
    });

    it("getRanges still reports a claim's ranges after its units are released", async function () {
      const { ledger } = await loadFixture(threeClaims);
      await ledger.withdrawClaim(2);
      const r = await ledger.getRanges(2);
      expect([r[0].ns, r[0].start, r[0].end]).to.deep.equal([NS_A, 300n, 399n]);
    });

    it("released nodes cannot be used as hints", async function () {
      const { ledger } = await loadFixture(threeClaims);
      await ledger.withdrawClaim(2);
      await walk(ledger, NS_A);
      await expect(raw(ledger, "X", NS_A, 450, 460, 2)).to.be.revertedWithCustomError(ledger, "BadHint").withArgs(NS_A, 2);
      await expect(raw(ledger, "X", NS_A, 300, 399, 1)).to.emit(ledger, "ClaimRegistered"); // units of withdrawn claim are free again
    });
  });

  describe("pre-flight", function () {
    it("checkRange reports conflicts without a transaction", async function () {
      const { ledger } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1000, 1999)]);
      const [free, id, os, oe] = await ledger.checkRange(NS_A, 1900, 2100);
      expect([free, id, os, oe]).to.deep.equal([false, 1n, 1900n, 1999n]);
      const res = await ledger.checkRange(NS_A, 2000, 2100);
      expect(res[0]).to.equal(true);
    });
  });

  describe("challenge lifecycle", function () {
    it("anyone can challenge; units stay locked while challenged", async function () {
      const { ledger, outsider } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1, 100)]);
      await expect(ledger.connect(outsider).openChallenge(1, h("reason")))
        .to.emit(ledger, "ClaimChallenged").withArgs(1, outsider.address, h("reason"));
      expect((await ledger.getClaim(1)).status).to.equal(2);
      await expect(register(ledger, "OO-2", [R(NS_A, 50, 60)])).to.be.revertedWithCustomError(ledger, "RangeOverlap");
      await expect(ledger.connect(outsider).openChallenge(1, h("again")))
        .to.be.revertedWithCustomError(ledger, "BadStatus");
    });

    it("upheld challenge revokes the claim and releases its units", async function () {
      const { ledger, outsider } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1, 100)]);
      await ledger.connect(outsider).openChallenge(1, h("reason"));
      await expect(ledger.connect(outsider).resolveChallenge(1, true, h("x"))).to.be.revertedWithCustomError(ledger, "NotReviewer");
      await expect(ledger.resolveChallenge(1, true, h("resolution")))
        .to.emit(ledger, "ChallengeResolved").withArgs(1, true, h("resolution"));
      expect((await ledger.getClaim(1)).status).to.equal(3); // Revoked
      expect(await ledger.namespaceSize(NS_A)).to.equal(0n);
      await expect(register(ledger, "OO-2", [R(NS_A, 1, 100)])).to.emit(ledger, "ClaimRegistered");
    });

    it("dismissed challenge returns the claim to active", async function () {
      const { ledger, outsider } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1, 100)]);
      await ledger.connect(outsider).openChallenge(1, h("reason"));
      await ledger.resolveChallenge(1, false, h("dismissed"));
      expect((await ledger.getClaim(1)).status).to.equal(1);
      await expect(ledger.resolveChallenge(1, true, h("x"))).to.be.revertedWithCustomError(ledger, "BadStatus");
    });

    it("only the original registrar can withdraw; withdrawal releases units", async function () {
      const { ledger, outsider } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1, 100)]);
      await expect(ledger.connect(outsider).withdrawClaim(1)).to.be.revertedWithCustomError(ledger, "NotRegistrar");
      await expect(ledger.withdrawClaim(1)).to.emit(ledger, "ClaimWithdrawn").withArgs(1);
      await expect(register(ledger, "OO-2", [R(NS_A, 1, 100)])).to.emit(ledger, "ClaimRegistered");
    });

    it("unknown claim ids revert", async function () {
      const { ledger } = await loadFixture(deploy);
      await expect(ledger.getClaim(0)).to.be.revertedWithCustomError(ledger, "UnknownClaim");
      await expect(ledger.getClaim(5)).to.be.revertedWithCustomError(ledger, "UnknownClaim");
    });
  });

  describe("invariants (randomized, seeded)", function () {
    const locks = (s) => s === "active" || s === "challenged";
    const statusCode = { active: 1n, challenged: 2n, revoked: 3n, withdrawn: 4n };

    async function checkModel(ledger, model) {
      for (const c of model) expect((await ledger.getClaim(c.id)).status).to.equal(statusCode[c.status]);
      for (const n of [NS_A, NS_B]) {
        const list = await walk(ledger, n);
        const live = model.filter((c) => c.ns === n && locks(c.status)).sort((a, b) => a.start - b.start);
        expect(list.map((x) => [Number(x.start), Number(x.end)])).to.deep.equal(live.map((c) => [c.start, c.end]));
      }
    }

    it("with correct hints: accepts exactly the non-overlapping ranges (150 ops vs reference model)", async function () {
      const { ledger, outsider } = await loadFixture(deploy);
      let seed = 20261019;
      const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
      const model = [];
      let nextId = 1, accepted = 0, rejected = 0;
      for (let i = 0; i < 150; i++) {
        const op = rnd(10);
        if (op < 7 || model.length === 0) {
          const n = [NS_A, NS_B][rnd(2)];
          const start = 1 + rnd(400);
          const end = start + rnd(40);
          const clash = model.find((c) => c.ns === n && locks(c.status) && c.start <= end && start <= c.end);
          const tx = register(ledger, `R-${i}`, [R(n, start, end)]);
          if (clash) { await expect(tx).to.be.revertedWithCustomError(ledger, "RangeOverlap"); rejected++; }
          else { await tx; model.push({ id: nextId++, ns: n, start, end, status: "active" }); accepted++; }
        } else {
          const c = model[rnd(model.length)];
          if (c.status === "active" && op === 7) { await ledger.connect(outsider).openChallenge(c.id, h("r")); c.status = "challenged"; }
          else if (c.status === "challenged") { const up = rnd(2) === 0; await ledger.resolveChallenge(c.id, up, h("s")); c.status = up ? "revoked" : "active"; }
          else if (c.status === "active" && op === 9) { await ledger.withdrawClaim(c.id); c.status = "withdrawn"; }
        }
      }
      await checkModel(ledger, model);
      expect(accepted).to.be.greaterThan(10);
      expect(rejected).to.be.greaterThan(10);
    });

    it("with adversarial random hints: never accepts an overlapping range (300 attempts)", async function () {
      const { ledger } = await loadFixture(deploy);
      let seed = 7;
      const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
      const model = [];
      let nextId = 1, acceptedWithRandomHint = 0;
      for (let i = 0; i < 300; i++) {
        const n = [NS_A, NS_B][rnd(2)];
        const start = 1 + rnd(2000);
        const end = start + rnd(60);
        const maxNode = Number(await ledger.nextNodeId());
        const hint = rnd(4) === 0 ? 0 : 1 + rnd(maxNode + 2); // includes unknown and foreign-namespace nodes
        const clash = model.find((c) => c.ns === n && c.start <= end && start <= c.end);
        const tx = ledger.registerClaim(ref(`Z-${i}`), [{ ns: n, start, end, prevHint: hint }], h("c"), h("e"), h("r"));
        let ok = true;
        try { await tx; } catch { ok = false; }
        if (ok) {
          expect(clash, `accepted overlapping range ${start}-${end}`).to.equal(undefined);
          model.push({ id: nextId++, ns: n, start, end, status: "active" });
          acceptedWithRandomHint++;
        } else if (!clash) {
          // a wrong hint may reject a free range; the correct hint must then succeed
          await register(ledger, `Z-${i}-retry`, [R(n, start, end)]);
          model.push({ id: nextId++, ns: n, start, end, status: "active" });
        }
      }
      await checkModel(ledger, model);
      expect(acceptedWithRandomHint).to.be.greaterThan(0);
    });
  });

  describe("gas", function () {
    it("registration cost is flat as a namespace fills (hinted list) but grows for the linear v0", async function () {
      const [owner] = await ethers.getSigners();
      const hinted = await (await ethers.getContractFactory("ClaimLedger")).deploy();
      const linear = await (await ethers.getContractFactory("ClaimLedgerLinear")).deploy();
      const sizes = [0, 10, 50, 200];
      const rows = [];
      let filled = 0;
      for (const k of sizes) {
        for (; filled < k; filled++) {
          const s = 1 + filled * 10;
          await register(hinted, `F-${filled}`, [R(NS_A, s, s + 4)]);
          await linear.registerClaim(ref(`F-${filled}`), [R(NS_A, s, s + 4)], h("c"), h("e"), h("r"));
        }
        const s = 1_000_000 + k;
        const g1 = await (await register(hinted, `M-${k}`, [R(NS_A, s, s)])).wait();
        const g2 = await (await linear.registerClaim(ref(`M-${k}`), [R(NS_A, s, s)], h("c"), h("e"), h("r"))).wait();
        rows.push({ existing: k, hinted: Number(g1.gasUsed), linear: Number(g2.gasUsed) });
        filled++; // the measurement claim also occupies a slot
      }
      console.table(rows);
      // k=0 pays one-time first writes for the namespace (head, size); from then on the cost must not grow with k
      const hs = rows.slice(1).map((r) => r.hinted);
      expect(Math.max(...hs) - Math.min(...hs)).to.be.lessThan(1_000);
      expect(rows[rows.length - 1].linear).to.be.greaterThan(rows[0].linear * 2);
      // The committed results file is regenerated only on request (make gas), so ordinary test runs leave the tree clean.
      if (!process.env.WRITE_GAS) return;
      require("fs").mkdirSync(require("path").join(__dirname, "../../eval/results"), { recursive: true });
      require("fs").writeFileSync(require("path").join(__dirname, "../../eval/results/gas.json"), JSON.stringify({ generated_at: new Date().toISOString(), note: "Gas for registering one single-range claim into a namespace that already holds k active ranges (Hardhat, solc 0.8.24, optimizer 200).", rows }, null, 2));
      void owner;
    });
  });
});
