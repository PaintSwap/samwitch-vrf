// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISamWitchVRFConsumer} from "../interfaces/ISamWitchVRFConsumer.sol";
import {SamWitchVRF} from "../SamWitchVRF.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TestVRFConsumer is ISamWitchVRFConsumer, Ownable {
  error ShouldRevertTrue();
  error OnlySamWitchVRF();

  SamWitchVRF public samWitchVRF;
  mapping(bytes32 requestId => uint256[] randomWords) public allRandomWords;
  bool private shouldRevert;

  modifier onlySamWitchVRF() {
    if (msg.sender != address(samWitchVRF)) {
      revert OnlySamWitchVRF();
    }
    _;
  }

  constructor(SamWitchVRF _samWitchVRF) Ownable(msg.sender) {
    samWitchVRF = _samWitchVRF;
  }

  function requestRandomWords(
    uint256 numWords,
    uint256 callbackGasLimit
  ) external onlyOwner returns (bytes32 requestId) {
    requestId = samWitchVRF.requestRandomWords(numWords, callbackGasLimit);
  }

  // Called by the VRF contract to fulfill a random number request
  function fulfillRandomWords(bytes32 requestId, uint256[] calldata randomWords) external onlySamWitchVRF {
    allRandomWords[requestId] = randomWords;
    if (shouldRevert) {
      revert ShouldRevertTrue();
    }
  }

  function setShouldRevert(bool _shouldRevert) external {
    shouldRevert = _shouldRevert;
  }
}
