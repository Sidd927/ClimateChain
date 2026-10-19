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

async function register(ledger, refStr, ranges, signer) {
  const c = signer ? ledger.connect(signer) : ledger;
  return c.registerClaim(ref(refStr), ranges, h("claimant"), h("evidence"), h("report"));
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

    it("accepts adjacent ranges (no shared unit)", async function () {
      const { ledger } = await loadFixture(deploy);
      await register(ledger, "OO-1", [R(NS_A, 1000, 1999)]);
      await expect(register(ledger, "OO-2", [R(NS_A, 2000, 2999)])).to.emit(ledger, "ClaimRegistered");
      await expect(register(ledger, "OO-3", [R(NS_A, 1, 999)])).to.emit(ledger, "ClaimRegistered");
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

  describe("invariant: active ranges never overlap (randomized, seeded)", function () {
    it("matches a reference model over 150 random operations", async function () {
      const { ledger, outsider } = await loadFixture(deploy);
      let seed = 20261019;
      const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
      const spaces = [NS_A, NS_B];
      const model = []; // {id, ns, start, end, status}
      const locks = (s) => s === "active" || s === "challenged";
      let nextId = 1, accepted = 0, rejected = 0;

      for (let i = 0; i < 150; i++) {
        const op = rnd(10);
        if (op < 7 || model.length === 0) {
          const n = spaces[rnd(2)];
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
      // on-chain state equals model, and the model's active set is pairwise disjoint
      const statusCode = { active: 1n, challenged: 2n, revoked: 3n, withdrawn: 4n };
      for (const c of model) expect((await ledger.getClaim(c.id)).status).to.equal(statusCode[c.status]);
      const live = model.filter((c) => locks(c.status));
      for (let a = 0; a < live.length; a++)
        for (let b = a + 1; b < live.length; b++)
          if (live[a].ns === live[b].ns) expect(live[a].start > live[b].end || live[b].start > live[a].end).to.equal(true);
      expect(accepted).to.be.greaterThan(10);
      expect(rejected).to.be.greaterThan(10);
    });
  });
});
