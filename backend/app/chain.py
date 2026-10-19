"""ClaimLedger adapter (web3.py). The chain is the source of truth for anchored claims."""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from functools import cached_property

from eth_abi import decode as abi_decode
from eth_account import Account
from eth_utils import keccak, to_checksum_address
from web3 import Web3
from web3.exceptions import ContractCustomError, ContractLogicError

from .config import settings

log = logging.getLogger("onceonly.chain")

STATUS = {0: "none", 1: "active", 2: "challenged", 3: "revoked", 4: "withdrawn"}


class ChainUnavailable(RuntimeError):
    pass


@dataclass
class Revert:
    name: str
    args: dict
    raw: str

    def to_dict(self):
        return {"error": self.name, "args": self.args, "raw": self.raw}


def namespace(registry: str, batch_id: str) -> bytes:
    return keccak(text=f"{registry}:{batch_id}")


def b32(hex_or_text: str) -> bytes:
    """bytes32 from a 0x hex string (sha256/keccak digests) or keccak of plain text."""
    if hex_or_text.startswith("0x") and len(hex_or_text) == 66:
        return bytes.fromhex(hex_or_text[2:])
    if len(hex_or_text) == 64:
        try:
            return bytes.fromhex(hex_or_text)
        except ValueError:
            pass
    return keccak(text=hex_or_text)


def ranges_with_hints(contract, ranges: list[tuple[bytes, int, int]]) -> list[tuple[bytes, int, int, int]]:
    """Attach predecessor hints (O(k) eth_calls, off-chain) so registration verifies in O(1) on chain.

    Ranges earlier in the same submission are accounted for: node ids are assigned
    sequentially from nextNodeId(), so their ids are predictable (a concurrent
    registration can make a hint stale; the contract then reverts with BadHint and
    the caller retries)."""
    base = contract.functions.nextNodeId().call()
    out, inserted = [], []
    for i, (ns, start, end) in enumerate(ranges):
        hint = contract.functions.hintFor(ns, start).call()
        hint_start = contract.functions.getNode(ns, hint).call()[0] if hint else -1
        for x_ns, x_start, x_id in inserted:
            if x_ns == ns and hint_start < x_start < start:
                hint, hint_start = x_id, x_start
        inserted.append((ns, start, base + i))
        out.append((ns, start, end, hint))
    return out


class Ledger:
    def __init__(self):
        if not settings.deployment_file.exists():
            raise ChainUnavailable(f"No deployment file at {settings.deployment_file}. Run `make chain` and `make deploy`.")
        self.deployment = json.loads(settings.deployment_file.read_text())
        self.w3 = Web3(Web3.HTTPProvider(settings.rpc_url, request_kwargs={"timeout": 15}))
        if not self.w3.is_connected():
            raise ChainUnavailable(f"Cannot reach chain RPC at {settings.rpc_url}")
        self.chain_id = self.w3.eth.chain_id
        if self.chain_id != self.deployment["chainId"]:
            raise ChainUnavailable(f"RPC chainId {self.chain_id} != deployment chainId {self.deployment['chainId']}")
        self.address = to_checksum_address(self.deployment["address"])
        if self.w3.eth.get_code(self.address) in (b"", b"\x00"):
            raise ChainUnavailable(f"No contract code at {self.address}; the local chain was probably restarted. Run `make deploy`.")
        self.c = self.w3.eth.contract(address=self.address, abi=self.deployment["abi"])
        self.registrar = Account.from_key(settings.registrar_key) if settings.registrar_key else None
        self.reviewer = Account.from_key(settings.reviewer_key) if settings.reviewer_key else self.registrar
        self.challenger = Account.from_key(settings.challenger_key) if settings.challenger_key else self.registrar
        if self.registrar is None:
            raise ChainUnavailable("REGISTRAR_PRIVATE_KEY is not set (see .env.example)")

    @cached_property
    def _errors(self) -> dict[bytes, tuple[str, list[str], list[str]]]:
        out = {}
        for item in self.deployment["abi"]:
            if item.get("type") == "error":
                types = [i["type"] for i in item["inputs"]]
                names = [i["name"] for i in item["inputs"]]
                sig = f"{item['name']}({','.join(types)})"
                out[keccak(text=sig)[:4]] = (item["name"], types, names)
        return out

    def decode_revert(self, data) -> Revert:
        if isinstance(data, str):
            raw = data
            data = bytes.fromhex(data[2:] if data.startswith("0x") else data)
        else:
            raw = "0x" + bytes(data).hex()
        sel = data[:4]
        if sel in self._errors:
            name, types, names = self._errors[sel]
            vals = abi_decode(types, data[4:])
            args = {n: ("0x" + v.hex() if isinstance(v, bytes) else v) for n, v in zip(names, vals)}
            return Revert(name, args, raw)
        return Revert("UnknownRevert", {}, raw)

    def revert_from_exception(self, e: Exception) -> Revert:
        """Find ABI-encoded custom-error data anywhere in a web3/RPC exception and decode it."""
        candidates = []
        data = getattr(e, "data", None)
        if isinstance(data, (bytes, bytearray)):
            candidates.append("0x" + bytes(data).hex())
        elif isinstance(data, str):
            candidates.append(data)
        elif isinstance(data, dict) and isinstance(data.get("data"), str):
            candidates.append(data["data"])
        candidates += re.findall(r"0x[0-9a-fA-F]{8,}", str(e))
        for c in candidates:
            try:
                raw = bytes.fromhex(c[2:])
            except ValueError:
                continue
            if raw[:4] in self._errors:
                return self.decode_revert(raw)
        msg = str(e)
        m = re.search(r"reverted with (?:custom error|reason string) '?([^']+)'?", msg)
        return Revert("ContractLogicError", {"message": m.group(1) if m else msg[:300]}, "")

    def info(self) -> dict:
        return {
            "rpc_url": settings.rpc_url,
            "chain_id": self.chain_id,
            "network": self.deployment.get("network"),
            "public_network": self.chain_id != 31337,
            "address": self.address,
            "deploy_block": self.deployment.get("deployBlock"),
            "block_number": self.w3.eth.block_number,
            "claim_count": self.c.functions.claimCount().call(),
            "registrar": self.registrar.address,
        }

    # ------------------------------------------------------------------ tx

    def _send(self, account, fn, gas: int | None = None) -> dict:
        tx = fn.build_transaction({
            "from": account.address,
            "nonce": self.w3.eth.get_transaction_count(account.address),
            "chainId": self.chain_id,
            **({"gas": gas} if gas else {}),
        })
        signed = account.sign_transaction(tx)
        h = signed.hash
        try:
            self.w3.eth.send_raw_transaction(signed.raw_transaction)
        except Exception:
            # Hardhat automine mines a reverting tx and then reports the revert as an RPC error.
            try:
                self.w3.eth.get_transaction_receipt(h)
            except Exception:
                raise
        rcpt = self.w3.eth.wait_for_transaction_receipt(h, timeout=60)
        return {"tx_hash": "0x" + bytes(h).hex().removeprefix("0x"), "block_number": rcpt.blockNumber, "gas_used": rcpt.gasUsed, "status": rcpt.status, "receipt": rcpt}

    def _simulate(self, account, fn) -> Revert | None:
        try:
            fn.call({"from": account.address})
            return None
        except (ContractCustomError, ContractLogicError) as e:
            return self.revert_from_exception(e)
        except Exception as e:  # e.g. Web3RPCError carrying the revert payload
            if "revert" not in str(e).lower():
                raise
            return self.revert_from_exception(e)

    def check_range(self, registry: str, batch_id: str, start: int, end: int) -> dict:
        free, cid, os_, oe = self.c.functions.checkRange(namespace(registry, batch_id), start, end).call()
        return {"free": free, "conflicting_claim_id": cid, "overlap_start": os_, "overlap_end": oe}

    def register(self, ref: str, blocks: list[dict], commitment: str, evidence_hash: str, report_hash: str, submit_on_revert: bool = False) -> dict:
        ranges = [(namespace(b["registry"], b["batch_id"]), int(b["unit_start"]), int(b["unit_end"])) for b in blocks]
        fn = self.c.functions.registerClaim(b32(ref), ranges_with_hints(self.c, ranges), b32(commitment), b32(evidence_hash), b32(report_hash))
        rev = self._simulate(self.registrar, fn)
        if rev is not None:
            out = {"ok": False, "revert": rev.to_dict(), "submitted": False}
            if submit_on_revert:
                # Broadcast anyway (fixed gas, no estimation) so the rejection is a mined, failed transaction.
                try:
                    res = self._send(self.registrar, fn, gas=900_000)
                    out.update({"submitted": True, "tx_hash": res["tx_hash"], "block_number": res["block_number"], "tx_status": res["status"], "gas_used": res["gas_used"]})
                except Exception as e:  # some nodes refuse to mine/return failing txs
                    out.update({"submitted": False, "submit_error": str(e)[:300]})
            return out
        res = self._send(self.registrar, fn)
        logs = self.c.events.ClaimRegistered().process_receipt(res["receipt"])
        claim_id = logs[0]["args"]["claimId"] if logs else None
        return {"ok": res["status"] == 1, "claim_id": claim_id, "tx_hash": res["tx_hash"], "block_number": res["block_number"], "gas_used": res["gas_used"]}

    def challenge(self, claim_id: int, reason: str) -> dict:
        fn = self.c.functions.openChallenge(claim_id, keccak(text=reason))
        rev = self._simulate(self.challenger, fn)
        if rev:
            return {"ok": False, "revert": rev.to_dict()}
        res = self._send(self.challenger, fn)
        return {"ok": True, "tx_hash": res["tx_hash"], "block_number": res["block_number"], "challenger": self.challenger.address}

    def resolve(self, claim_id: int, upheld: bool, note: str) -> dict:
        fn = self.c.functions.resolveChallenge(claim_id, upheld, keccak(text=note))
        rev = self._simulate(self.reviewer, fn)
        if rev:
            return {"ok": False, "revert": rev.to_dict()}
        res = self._send(self.reviewer, fn)
        return {"ok": True, "tx_hash": res["tx_hash"], "block_number": res["block_number"]}

    def withdraw(self, claim_id: int) -> dict:
        fn = self.c.functions.withdrawClaim(claim_id)
        rev = self._simulate(self.registrar, fn)
        if rev:
            return {"ok": False, "revert": rev.to_dict()}
        res = self._send(self.registrar, fn)
        return {"ok": True, "tx_hash": res["tx_hash"], "block_number": res["block_number"]}

    def get_claim(self, claim_id: int) -> dict:
        c = self.c.functions.getClaim(claim_id).call()
        ranges = self.c.functions.getRanges(claim_id).call()
        ref, commitment, evidence, report, registrar, registered_at, status = c
        return {
            "claim_id": claim_id,
            "ref_hash": "0x" + ref.hex(),
            "claimant_commitment": "0x" + commitment.hex(),
            "evidence_hash": "0x" + evidence.hex(),
            "report_hash": "0x" + report.hex(),
            "registrar": registrar,
            "registered_at": registered_at,
            "status": STATUS.get(status, str(status)),
            "ranges": [{"namespace": "0x" + ns.hex(), "unit_start": s, "unit_end": e} for ns, s, e in ranges],
        }

    def claim_id_by_ref(self, ref: str) -> int:
        return self.c.functions.claimIdByRef(b32(ref)).call()


_ledger: Ledger | None = None


def get_ledger(refresh: bool = False) -> Ledger:
    global _ledger
    if _ledger is None or refresh:
        _ledger = Ledger()
    return _ledger


def try_ledger() -> tuple[Ledger | None, str | None]:
    try:
        return get_ledger(), None
    except ChainUnavailable as e:
        return None, str(e)
    except Exception as e:  # connection errors etc.
        return None, f"{type(e).__name__}: {e}"
