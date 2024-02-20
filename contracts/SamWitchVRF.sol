// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {VRF} from "./VRF.sol";

import {ISamWitchVRFConsumer} from "./ISamWitchVRFConsumer.sol";

/// @title SamWitchVRF - Verifiable Random Number
/// @author Sam Witch (SamWitchVRF & Estfor Kingdom)
/// @notice This contract listens for requests for VRF, and allows the oracle to fulfill random numbers
contract SamWitchVRF is UUPSUpgradeable, OwnableUpgradeable {
  event ConsumerRegistered(address consumer);
  event RandomWordsRequested(bytes32 requestId, address fulfillAddress, uint256 numWords, uint256 nonce);
  event RandomWordsFulfilled(bytes32 requestId, uint[] randomWords, address oracle);

  error FulfillmentFailed(bytes32 requestId);
  error InvalidConsumer(address consumer);
  error InvalidProof();
  error InvalidPublicKey();
  error OnlyOracle();
  error CommitmentMismatch();

  mapping(address consumer => uint64 nonce) public consumers;
  mapping(address oracles => bool isOracle) public oracles;
  mapping(bytes32 requestId => bytes32 commitment) private requestCommitments;

  // 5k is plenty for an EXTCODESIZE call (2600) + warm CALL (100)
  // and some arithmetic operations.
  uint256 private constant GAS_FOR_CALL_EXACT_CHECK = 5_000;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /// @notice Initialize the contract as part of the proxy contract deployment
  function initialize(address _oracle) external payable initializer {
    __UUPSUpgradeable_init();
    __Ownable_init(_msgSender());
    oracles[_oracle] = true;
  }

  /// @notice Called by the requester to make a full request, which provides
  /// all of its parameters as arguments
  /// @param numWords Number of random words to request
  /// @return requestId Request ID
  function requestRandomWords(uint256 numWords, uint256 callbackGasLimit) external returns (bytes32 requestId) {
    uint64 currentNonce = consumers[msg.sender];
    if (currentNonce == 0) {
      revert InvalidConsumer(msg.sender);
    }

    uint64 nonce = ++currentNonce;
    consumers[msg.sender] = currentNonce;
    requestId = _computeRequestId(msg.sender, nonce);

    requestCommitments[requestId] = keccak256(
      abi.encode(requestId, callbackGasLimit, numWords, msg.sender, block.chainid)
    );

    emit RandomWordsRequested(requestId, msg.sender, numWords, nonce);
  }

  /// @notice Fulfill the request
  /// @param requestId Request ID
  /// @param fulfillAddress Address that will be called to fulfill
  /// @return callSuccess If the fulfillment call succeeded
  function fulfillRandomWords(
    bytes32 requestId,
    address oracle,
    address fulfillAddress,
    uint256 callbackGasLimit,
    uint256 numWords,
    uint256[2] memory publicKey,
    uint256[4] memory proof
  ) external returns (bool callSuccess) {
    if (!oracles[oracle]) {
      revert OnlyOracle();
    }

    bytes32 commitment = keccak256(abi.encode(requestId, callbackGasLimit, numWords, fulfillAddress, block.chainid));
    if (requestCommitments[requestId] != commitment) {
      revert CommitmentMismatch();
    }

    // Verify the public key & proof are correct
    if (VRF.pointToAddress(publicKey[0], publicKey[1]) != oracle) {
      revert InvalidPublicKey();
    }
    bool verified = VRF.verify(publicKey, proof, bytes.concat(commitment));
    if (!verified) {
      revert InvalidProof();
    }

    // Get random words out of the proof
    uint256 randomness = _randomValueFromVRFProof(proof);
    uint256[] memory randomWords = new uint256[](numWords);
    for (uint256 i = 0; i < numWords; ++i) {
      randomWords[i] = uint256(keccak256(abi.encode(randomness, i)));
    }
    delete requestCommitments[requestId];

    // Call the consumer contract callback
    bytes memory data = abi.encodeWithSelector(
      ISamWitchVRFConsumer.fulfillRandomWords.selector,
      requestId,
      randomWords
    );
    callSuccess = _callWithExactGas(callbackGasLimit, fulfillAddress, data);
    if (callSuccess) {
      emit RandomWordsFulfilled(requestId, randomWords, oracle);
    } else {
      revert FulfillmentFailed(requestId);
    }
  }

  function registerConsumer(address _consumer) external onlyOwner {
    consumers[_consumer] = 1;
    emit ConsumerRegistered(_consumer);
  }

  function _computeRequestId(address sender, uint64 nonce) private pure returns (bytes32) {
    return keccak256(abi.encodePacked(sender, nonce));
  }

  /**
   * @dev calls target address with exactly gasAmount gas and data as calldata
   * or reverts if at least gasAmount gas is not available.
   */
  function _callWithExactGas(uint256 gasAmount, address target, bytes memory data) private returns (bool success) {
    // solhint-disable-next-line no-inline-assembly
    assembly ("memory-safe") {
      let g := gas()
      // Compute g -= GAS_FOR_CALL_EXACT_CHECK and check for underflow
      // The gas actually passed to the callee is min(gasAmount, 63//64*gas available).
      // We want to ensure that we revert if gasAmount >  63//64*gas available
      // as we do not want to provide them with less, however that check itself costs
      // gas.  GAS_FOR_CALL_EXACT_CHECK ensures we have at least enough gas to be able
      // to revert if gasAmount >  63//64*gas available.
      if lt(g, GAS_FOR_CALL_EXACT_CHECK) {
        revert(0, 0)
      }
      g := sub(g, GAS_FOR_CALL_EXACT_CHECK)
      // if g - g//64 <= gasAmount, revert
      // (we subtract g//64 because of EIP-150)
      if iszero(gt(sub(g, div(g, 64)), gasAmount)) {
        revert(0, 0)
      }
      // solidity calls check that a contract actually exists at the destination, so we do the same
      if iszero(extcodesize(target)) {
        revert(0, 0)
      }
      // call and return whether we succeeded. ignore return data
      // call(gas,addr,value,argsOffset,argsLength,retOffset,retLength)
      success := call(gasAmount, target, 0, add(data, 0x20), mload(data), 0, 0)
    }
    return success;
  }

  function _randomValueFromVRFProof(uint256[4] memory _proof) private view returns (uint256 output) {
    return uint256(keccak256(abi.encode(block.chainid, _proof[0], _proof[1])));
  }

  // solhint-disable-next-line no-empty-blocks
  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
