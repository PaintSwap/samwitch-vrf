// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISamWitchRNGConsumer {
  /**
   * @notice fulfillRandomness handles the RNG response. Your contract must
   * @notice implement it.
   *
   * @param requestId The Id initially returned by requestRandomness
   * @param randomWords the RNG output expanded to the requested number of words
   */
  function fulfillRandomWords(bytes32 requestId, uint[] calldata randomWords) external;
}
