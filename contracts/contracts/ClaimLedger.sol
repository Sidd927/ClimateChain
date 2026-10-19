// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ClaimLedger — every retired carbon unit can back at most one active claim.
/// @notice Records public claims over registry unit ranges and enforces that the unit
///         ranges of active (or challenged) claims never overlap within a namespace.
///         A namespace is keccak256("<REGISTRY>:<BATCH_ID>") because registry unit
///         numbers are only unique inside an issuance batch.
/// @dev    Each namespace keeps its active ranges in a sorted, doubly linked list of
///         disjoint intervals. Registration takes a predecessor hint (computed off-chain
///         with `hintFor`) and verifies only the two neighbours, so the on-chain cost is
///         O(1) regardless of how many claims share a batch. A wrong hint can only make
///         the call revert (BadHint); it can never cause an overlapping range to be accepted.
///         Stores no documents or names: only ranges (already public on registries),
///         a salted claimant commitment and document/report hashes.
contract ClaimLedger {
    enum Status { None, Active, Challenged, Revoked, Withdrawn }

    struct Range {
        bytes32 ns;
        uint64 start;
        uint64 end; // inclusive
    }

    /// @param prevHint id of the linked node immediately before this range in its
    ///        namespace, or 0 to insert at the head of the list.
    struct RangeInput {
        bytes32 ns;
        uint64 start;
        uint64 end;
        uint64 prevHint;
    }

    struct Claim {
        bytes32 ref;
        bytes32 claimantCommitment;
        bytes32 evidenceHash;
        bytes32 reportHash;
        address registrar;
        uint64 registeredAt;
        Status status;
    }

    struct Node {
        uint64 start;
        uint64 end;
        uint64 prev;
        uint64 next;
        uint64 claimId;
        bool linked;
    }

    address public owner;
    mapping(address => bool) public isRegistrar;
    mapping(address => bool) public isReviewer;

    Claim[] private _claims; // index 0 unused so claim ids start at 1
    mapping(uint256 => uint64[]) private _claimNodes;
    mapping(bytes32 => uint256) public claimIdByRef;

    mapping(bytes32 => uint64) public head;
    mapping(bytes32 => mapping(uint64 => Node)) private _nodes;
    mapping(uint64 => bytes32) private _nodeNs;
    mapping(bytes32 => uint256) public namespaceSize; // active ranges per namespace
    uint64 public nextNodeId = 1;

    event RegistrarSet(address indexed account, bool enabled);
    event ReviewerSet(address indexed account, bool enabled);
    event ClaimRegistered(uint256 indexed claimId, bytes32 indexed ref, address indexed registrar, uint256 rangeCount, uint256 units);
    event ClaimChallenged(uint256 indexed claimId, address indexed challenger, bytes32 reasonHash);
    event ChallengeResolved(uint256 indexed claimId, bool upheld, bytes32 resolutionHash);
    event ClaimWithdrawn(uint256 indexed claimId);

    error NotOwner();
    error NotRegistrar();
    error NotReviewer();
    error EmptyRanges();
    error InvalidRange(uint256 index);
    error ClaimRefExists(bytes32 ref, uint256 existingClaimId);
    error RangeOverlap(bytes32 ns, uint256 existingClaimId, uint64 overlapStart, uint64 overlapEnd);
    error BadHint(bytes32 ns, uint64 hint);
    error UnknownClaim(uint256 claimId);
    error BadStatus(uint256 claimId, Status status);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        isRegistrar[msg.sender] = true;
        isReviewer[msg.sender] = true;
        _claims.push(); // sentinel
        emit RegistrarSet(msg.sender, true);
        emit ReviewerSet(msg.sender, true);
    }

    // ---------------------------------------------------------------- admin

    function setRegistrar(address account, bool enabled) external onlyOwner {
        isRegistrar[account] = enabled;
        emit RegistrarSet(account, enabled);
    }

    function setReviewer(address account, bool enabled) external onlyOwner {
        isReviewer[account] = enabled;
        emit ReviewerSet(account, enabled);
    }

    // ------------------------------------------------------------- registry

    /// @notice Register a claim over one or more unit ranges. Reverts with RangeOverlap
    ///         if any unit already backs another active or challenged claim.
    function registerClaim(
        bytes32 ref,
        RangeInput[] calldata ranges,
        bytes32 claimantCommitment,
        bytes32 evidenceHash,
        bytes32 reportHash
    ) external returns (uint256 claimId) {
        if (!isRegistrar[msg.sender]) revert NotRegistrar();
        if (ranges.length == 0) revert EmptyRanges();
        uint256 existing = claimIdByRef[ref];
        if (existing != 0) revert ClaimRefExists(ref, existing);

        claimId = _claims.length;
        _claims.push(Claim({
            ref: ref,
            claimantCommitment: claimantCommitment,
            evidenceHash: evidenceHash,
            reportHash: reportHash,
            registrar: msg.sender,
            registeredAt: uint64(block.timestamp),
            status: Status.Active
        }));
        claimIdByRef[ref] = claimId;

        uint256 units;
        for (uint256 i = 0; i < ranges.length; i++) {
            RangeInput calldata r = ranges[i];
            if (r.start == 0 || r.end < r.start) revert InvalidRange(i);
            uint64 id = _insert(r.ns, r.start, r.end, r.prevHint, uint64(claimId), i);
            _claimNodes[claimId].push(id);
            units += uint256(r.end - r.start) + 1;
        }
        emit ClaimRegistered(claimId, ref, msg.sender, ranges.length, units);
    }

    /// @dev O(1): verify the new interval fits strictly between `hint` and its successor.
    function _insert(bytes32 ns, uint64 start, uint64 end, uint64 hint, uint64 claimId, uint256 index) private returns (uint64 id) {
        uint64 nextId;
        if (hint != 0) {
            Node storage p = _nodes[ns][hint];
            if (!p.linked) revert BadHint(ns, hint);
            if (p.end >= start) {
                if (p.start <= end) _overlap(ns, p, start, end, claimId, index);
                revert BadHint(ns, hint); // predecessor lies after the new range
            }
            nextId = p.next;
        } else {
            nextId = head[ns];
        }
        if (nextId != 0) {
            Node storage n = _nodes[ns][nextId];
            if (n.start <= end) {
                if (n.end >= start) _overlap(ns, n, start, end, claimId, index);
                revert BadHint(ns, hint); // successor lies before the new range: hint too far left
            }
        }
        id = nextNodeId++;
        _nodes[ns][id] = Node(start, end, hint, nextId, claimId, true);
        _nodeNs[id] = ns;
        if (hint != 0) _nodes[ns][hint].next = id;
        else head[ns] = id;
        if (nextId != 0) _nodes[ns][nextId].prev = id;
        namespaceSize[ns] += 1;
    }

    function _overlap(bytes32 ns, Node storage other, uint64 start, uint64 end, uint64 claimId, uint256 index) private view {
        if (other.claimId == claimId) revert InvalidRange(index); // overlaps a range of the same submission
        revert RangeOverlap(ns, other.claimId, start > other.start ? start : other.start, end < other.end ? end : other.end);
    }

    function _unlinkClaim(uint256 claimId) private {
        uint64[] storage ids = _claimNodes[claimId];
        for (uint256 i = 0; i < ids.length; i++) {
            uint64 id = ids[i];
            bytes32 ns = _nodeNs[id];
            Node storage x = _nodes[ns][id];
            if (!x.linked) continue;
            if (x.prev != 0) _nodes[ns][x.prev].next = x.next;
            else head[ns] = x.next;
            if (x.next != 0) _nodes[ns][x.next].prev = x.prev;
            x.linked = false;
            namespaceSize[ns] -= 1;
        }
    }

    // ---------------------------------------------------------- off-chain helpers (views, O(k))

    /// @notice Predecessor hint for a range starting at `start`: the last linked node whose
    ///         start is below `start`, or 0 for the head. Meant for eth_call, not transactions.
    function hintFor(bytes32 ns, uint64 start) public view returns (uint64 prevId) {
        uint64 cur = head[ns];
        while (cur != 0) {
            Node storage n = _nodes[ns][cur];
            if (n.start >= start) break;
            prevId = cur;
            cur = n.next;
        }
    }

    /// @notice Pre-flight check: is [start, end] in namespace ns free of active claims?
    function checkRange(bytes32 ns, uint64 start, uint64 end)
        public
        view
        returns (bool free, uint256 conflictingClaimId, uint64 overlapStart, uint64 overlapEnd)
    {
        uint64 cur = head[ns];
        while (cur != 0) {
            Node storage n = _nodes[ns][cur];
            if (n.start > end) break;
            if (n.end >= start) {
                return (false, n.claimId, start > n.start ? start : n.start, end < n.end ? end : n.end);
            }
            cur = n.next;
        }
        return (true, 0, 0, 0);
    }

    function getNode(bytes32 ns, uint64 id) external view returns (Node memory) {
        return _nodes[ns][id];
    }

    // ----------------------------------------------------------- lifecycle

    /// @notice Anyone may contest an active claim; its units stay locked during review.
    function openChallenge(uint256 claimId, bytes32 reasonHash) external {
        Claim storage c = _claim(claimId);
        if (c.status != Status.Active) revert BadStatus(claimId, c.status);
        c.status = Status.Challenged;
        emit ClaimChallenged(claimId, msg.sender, reasonHash);
    }

    /// @notice A reviewer upholds (revoke, units released) or dismisses (back to active).
    function resolveChallenge(uint256 claimId, bool upheld, bytes32 resolutionHash) external {
        if (!isReviewer[msg.sender]) revert NotReviewer();
        Claim storage c = _claim(claimId);
        if (c.status != Status.Challenged) revert BadStatus(claimId, c.status);
        if (upheld) {
            c.status = Status.Revoked;
            _unlinkClaim(claimId);
        } else {
            c.status = Status.Active;
        }
        emit ChallengeResolved(claimId, upheld, resolutionHash);
    }

    /// @notice The registrar that submitted an active claim may withdraw it, releasing its units.
    function withdrawClaim(uint256 claimId) external {
        Claim storage c = _claim(claimId);
        if (c.registrar != msg.sender) revert NotRegistrar();
        if (c.status != Status.Active) revert BadStatus(claimId, c.status);
        c.status = Status.Withdrawn;
        _unlinkClaim(claimId);
        emit ClaimWithdrawn(claimId);
    }

    // ---------------------------------------------------------------- views

    function claimCount() external view returns (uint256) {
        return _claims.length - 1;
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return _claim(claimId);
    }

    /// @notice The unit ranges a claim registered (kept even after it is revoked or withdrawn).
    function getRanges(uint256 claimId) external view returns (Range[] memory out) {
        _claim(claimId);
        uint64[] storage ids = _claimNodes[claimId];
        out = new Range[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            bytes32 ns = _nodeNs[ids[i]];
            Node storage n = _nodes[ns][ids[i]];
            out[i] = Range(ns, n.start, n.end);
        }
    }

    // ------------------------------------------------------------ internal

    function _claim(uint256 claimId) private view returns (Claim storage c) {
        if (claimId == 0 || claimId >= _claims.length) revert UnknownClaim(claimId);
        c = _claims[claimId];
    }
}
