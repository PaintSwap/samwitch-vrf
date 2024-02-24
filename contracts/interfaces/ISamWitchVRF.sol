// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISamWitchVRF {
  event ConsumerRegistered(address consumer);
  event RandomWordsRequested(
    bytes32 requestId,
    uint256 callbackGasLimit,
    uint256 numWords,
    address consumer,
    uint256 nonce
  );
  event RandomWordsFulfilled(bytes32 requestId, uint[] randomWords, address oracle);

  error FulfillmentFailed(bytes32 requestId);
  error InvalidConsumer(address consumer);
  error InvalidProof();
  error InvalidPublicKey();
  error OnlyOracle();
  error CommitmentMismatch();

  /**
   * @notice Request some number of random words
   *
   * @param numWords The number of words to request
   * @param callbackGasLimit The amount of gas to provide the consumer
   */
  function requestRandomWords(uint256 numWords, uint256 callbackGasLimit) external returns (bytes32 requestId);

  /**
   * @notice Fulfill the request for random words
   *
   * @param requestId The ID of the request
   * @param oracle The address of the oracle fulfilling the request
   * @param fulfillAddress The address to fulfill the request
   * @param callbackGasLimit The amount of gas to provide the consumer
   * @param numWords The number of words to fulfill
   * @param publicKey The public key of the oracle
   * @param proof The proof of the random words
   */
  function fulfillRandomWords(
    bytes32 requestId,
    address oracle,
    address fulfillAddress,
    uint256 callbackGasLimit,
    uint256 numWords,
    uint256[2] memory publicKey,
    uint256[4] memory proof
  ) external returns (bool callSuccess);
}
