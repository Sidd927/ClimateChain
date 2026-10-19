// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ClaimLedger — every retired carbon unit can back at most one active claim.
/// @notice Records public claims over registry unit ranges and enforces that the unit
///         ranges of active (or challenged) claims never overlap within a namespace.
///         A namespace is keccak256("<REGISTRY>:<BATCH_ID>") because registry unit
///         numbers are only unique inside an issuance batch.
/// @dev    Stores no documents or names: only ranges (already public on registries),
///         a salted claimant commitment and document/report hashes.
contract ClaimLedger {
    enum Status { None, Active, Challenged, Revoked, Withdrawn }

    struct Range {
        bytes32 ns;
        uint64 start;
        uint64 end; // inclusive
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

    struct Entry {
        uint256 claimId;
        uint64 start;
        uint64 end;
    }

    address public owner;
    mapping(address => bool) public isRegistrar;
    mapping(address => bool) public isReviewer;

    Claim[] private _claims; // index 0 unused so claim ids start at 1
    mapping(uint256 => Range[]) private _ranges;
    mapping(bytes32 => Entry[]) private _byNamespace;
    mapping(bytes32 => uint256) public claimIdByRef;

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
    ///         on the first unit already backing another active or challenged claim.
    function registerClaim(
        bytes32 ref,
        Range[] calldata ranges,
        bytes32 claimantCommitment,
        bytes32 evidenceHash,
        bytes32 reportHash
    ) external returns (uint256 claimId) {
        if (!isRegistrar[msg.sender]) revert NotRegistrar();
        if (ranges.length == 0) revert EmptyRanges();
        uint256 existing = claimIdByRef[ref];
        if (existing != 0) revert ClaimRefExists(ref, existing);

        uint256 units;
        for (uint256 i = 0; i < ranges.length; i++) {
            Range calldata r = ranges[i];
            if (r.start == 0 || r.end < r.start) revert InvalidRange(i);
            // ranges inside the same submission must not overlap each other
            for (uint256 j = 0; j < i; j++) {
                if (ranges[j].ns == r.ns && ranges[j].start <= r.end && r.start <= ranges[j].end) {
                    revert InvalidRange(i);
                }
            }
            (bool free, uint256 other, uint64 os, uint64 oe) = checkRange(r.ns, r.start, r.end);
            if (!free) revert RangeOverlap(r.ns, other, os, oe);
            units += uint256(r.end - r.start) + 1;
        }

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
        for (uint256 i = 0; i < ranges.length; i++) {
            _ranges[claimId].push(ranges[i]);
            _byNamespace[ranges[i].ns].push(Entry(claimId, ranges[i].start, ranges[i].end));
        }
        emit ClaimRegistered(claimId, ref, msg.sender, ranges.length, units);
    }

    /// @notice Pre-flight check: is [start, end] in namespace ns free of active claims?
    function checkRange(bytes32 ns, uint64 start, uint64 end)
        public
        view
        returns (bool free, uint256 conflictingClaimId, uint64 overlapStart, uint64 overlapEnd)
    {
        Entry[] storage entries = _byNamespace[ns];
        for (uint256 k = 0; k < entries.length; k++) {
            Entry storage e = entries[k];
            if (e.start <= end && start <= e.end && _locksUnits(_claims[e.claimId].status)) {
                return (false, e.claimId, start > e.start ? start : e.start, end < e.end ? end : e.end);
            }
        }
        return (true, 0, 0, 0);
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
        c.status = upheld ? Status.Revoked : Status.Active;
        emit ChallengeResolved(claimId, upheld, resolutionHash);
    }

    /// @notice The registrar that submitted an active claim may withdraw it, releasing its units.
    function withdrawClaim(uint256 claimId) external {
        Claim storage c = _claim(claimId);
        if (c.registrar != msg.sender) revert NotRegistrar();
        if (c.status != Status.Active) revert BadStatus(claimId, c.status);
        c.status = Status.Withdrawn;
        emit ClaimWithdrawn(claimId);
    }

    // ---------------------------------------------------------------- views

    function claimCount() external view returns (uint256) {
        return _claims.length - 1;
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return _claim(claimId);
    }

    function getRanges(uint256 claimId) external view returns (Range[] memory) {
        _claim(claimId);
        return _ranges[claimId];
    }

    function namespaceSize(bytes32 ns) external view returns (uint256) {
        return _byNamespace[ns].length;
    }

    // ------------------------------------------------------------ internal

    function _claim(uint256 claimId) private view returns (Claim storage c) {
        if (claimId == 0 || claimId >= _claims.length) revert UnknownClaim(claimId);
        c = _claims[claimId];
    }

    function _locksUnits(Status s) private pure returns (bool) {
        return s == Status.Active || s == Status.Challenged;
    }
}
