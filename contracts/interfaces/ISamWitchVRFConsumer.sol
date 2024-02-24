// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISamWitchVRFConsumer {
  /**
   * @notice fulfillRandomness handles the VRF response. Your contract must
   * @notice implement it.
   *
   * @param requestId The Id initially returned by requestRandomness
   * @param randomWords the VRF output expanded to the requested number of words
   */
  function fulfillRandomWords(bytes32 requestId, uint[] calldata randomWords) external;
}
