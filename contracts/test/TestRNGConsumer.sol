// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISamWitchRNGConsumer} from "../ISamWitchRNGConsumer.sol";
import {SamWitchRNG} from "../SamWitchRNG.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TestRNGConsumer is ISamWitchRNGConsumer, Ownable {
  error ShouldRevertTrue();
  error OnlySamWitchRNG();

  SamWitchRNG public samWitchRNG;
  mapping(bytes32 requestId => uint256[] randomWords) public allRandomWords;
  bool private shouldRevert;

  modifier onlySamWitchRNG() {
    if (msg.sender != address(samWitchRNG)) {
      revert OnlySamWitchRNG();
    }
    _;
  }

  constructor(SamWitchRNG _samWitchRNG) Ownable(msg.sender) {
    samWitchRNG = _samWitchRNG;
  }

  function requestRandomWords(
    uint256 numWords,
    uint256 callbackGasLimit
  ) external onlyOwner returns (bytes32 requestId) {
    requestId = samWitchRNG.requestRandomWords(numWords, callbackGasLimit);
  }

  // Called by the RNG contract to fulfill a random number request
  function fulfillRandomWords(bytes32 requestId, uint256[] calldata randomWords) external onlySamWitchRNG {
    allRandomWords[requestId] = randomWords;
    if (shouldRevert) {
      revert ShouldRevertTrue();
    }
  }

  function setShouldRevert(bool _shouldRevert) external {
    shouldRevert = _shouldRevert;
  }
}
