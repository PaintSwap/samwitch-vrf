// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {ISamWitchRNGConsumer} from "./ISamWitchRNGConsumer.sol";

/// @title SamWitchRNG - Random Number Generator
/// @author Sam Witch (SamWitchRNG & Estfor Kingdom)
/// @notice This contract listens for requests for RNG, and allows the oracle to fulfill random numbers
contract SamWitchRNG is UUPSUpgradeable, OwnableUpgradeable {
  event ConsumerRegistered(address consumer);
  event RandomWordsRequested(bytes32 requestId, address fulfillAddress, uint numWords);
  event RandomWordsFulfilled(bytes32 requestId, bytes data);

  error FulfillmentFailed(bytes32 requestId);
  error InvalidConsumer(address consumer);
  error OnlyOracle();
  error RequestAlreadyFulfilled();
  error RequestIdDoesNotExist(bytes32 requestId);

  mapping(address consumer => uint64 nonce) public consumers;
  address private oracle;

  // 5k is plenty for an EXTCODESIZE call (2600) + warm CALL (100)
  // and some arithmetic operations.
  uint private constant GAS_FOR_CALL_EXACT_CHECK = 5_000;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /// @notice Initialize the contract as part of the proxy contract deployment
  function initialize(address _oracle) external payable initializer {
    __UUPSUpgradeable_init();
    __Ownable_init(_msgSender());

    oracle = _oracle;
  }

  /// @notice Called by the requester to make a full request, which provides
  /// all of its parameters as arguments
  /// @param numWords Number of random words to request
  /// @return requestId Request ID
  function requestRandomWords(uint numWords) external returns (bytes32 requestId) {
    uint64 currentNonce = consumers[msg.sender];
    if (currentNonce == 0) {
      revert InvalidConsumer(msg.sender);
    }

    uint64 nonce = ++currentNonce;
    consumers[msg.sender] = currentNonce;
    requestId = _computeRequestId(msg.sender, nonce);

    emit RandomWordsRequested(
      requestId,
      msg.sender,
      numWords
    );
  }

  /// @notice Called by the allowed oracle to fulfill the request
  /// @param requestId Request ID
  /// @param randomWordsData The random words to assign (abi encoded)
  /// @param fulfillAddress Address that will be called to fulfill
  /// @return callSuccess If the fulfillment call succeeded
  function fulfillRandomWords(
    bytes32 requestId,
    bytes calldata randomWordsData,
    bytes calldata signature,
    address fulfillAddress,
    uint gasAmount
  ) external returns (bool callSuccess) {
    // Verify it was created by the oracle
    bytes32 signedDataHash = keccak256(abi.encodePacked(requestId, randomWordsData));
    bytes32 message = MessageHashUtils.toEthSignedMessageHash(signedDataHash);
    if (!SignatureChecker.isValidSignatureNow(oracle, message, signature)) {
      revert OnlyOracle();
    }

    // Call the consumer contract callback
    bytes memory data = abi.encodeWithSelector(
      ISamWitchRNGConsumer.fulfillRandomWords.selector,
      requestId,
      randomWordsData
    );
    callSuccess = _callWithExactGas(gasAmount, fulfillAddress, data);
    if (callSuccess) {
      emit RandomWordsFulfilled(requestId, randomWordsData);
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
  function _callWithExactGas(uint gasAmount, address target, bytes memory data) private returns (bool success) {
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

  // solhint-disable-next-line no-empty-blocks
  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
