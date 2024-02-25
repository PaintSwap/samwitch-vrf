# SWVRF (SamWitchVRF)

[![Continuous integration](https://github.com/PaintSwap/samwitch-vrf/actions/workflows/main.yml/badge.svg)](https://github.com/PaintSwap/samwitch-vrf/actions/workflows/main.yml)

![overall](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/doublesharp/8264fd8eb852ea096bf7ee56a7ab695a/raw/samwitch-vrf-overall.json)
![statements](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/doublesharp/8264fd8eb852ea096bf7ee56a7ab695a/raw/samwitch-vrf-statements.json)
![branches](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/doublesharp/8264fd8eb852ea096bf7ee56a7ab695a/raw/samwitch-vrf-branches.json)
![functions](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/doublesharp/8264fd8eb852ea096bf7ee56a7ab695a/raw/samwitch-vrf-functions.json)
![lines](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/doublesharp/8264fd8eb852ea096bf7ee56a7ab695a/raw/samwitch-vrf-lines.json)

![swvrf](https://github.com/PaintSwap/samwitch-vrf/assets/84033732/4caebec8-7e8d-4416-9f59-91e827ecbdd3)

This is a Verifiable Random Function smart contract handler, which requests random numbers from an oracle, and has a callback called once the random numbers are ready. There are no costs in requesting a number, but there needs to be enough native gas (FTM) on the oracle signer to be able to call the callbacks.

## Consume Random Numbers

### Install via NPM

Install using `yarn` or `npm`.

```shell
npm install -D @samwitch/vrf
```

```shell
yarn add -D @samwitch/vrf
```

### Include in Solidity Contracts

To request a random number in your contract you must implement `ISamWitchVRFConsumer.fulfillRandomWords(bytes32 requestId, uint256[] calldata randomWords)` to receive the response to your request. The service can be called using the `ISamWitchVRF` interface, and ensuring
that the results are only provided by the randomness service contract.

```ts
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ISamWitchVRFConsumer } from "@samwitch/vrf/contracts/interfaces/ISamWitchVRFConsumer.sol";
import { ISamWitchVRF } from "@samwitch/vrf/contracts/interfaces/ISamWitchVRF.sol";

contract TestVRFConsumer is ISamWitchVRFConsumer {
  ISamWitchVRF public samWitchVRF;
  mapping(bytes32 requestId => uint256[] randomWords) public allRandomWords;

  error OnlySamWitchVRF();

  modifier onlySamWitchVRF() {
    if (msg.sender != address(samWitchVRF)) {
      revert OnlySamWitchVRF();
    }
    _;
  }

  constructor(ISamWitchVRF _samWitchVRF) {
    samWitchVRF = _samWitchVRF;
  }

  function requestRandomWords(
    uint256 numWords,
    uint256 callbackGasLimit
  ) external onlyOwner returns (bytes32 requestId) {
    requestId = samWitchVRF.requestRandomWords(numWords, callbackGasLimit);
  }

  // Called by the VRF contract to fulfill a random number request
  function fulfillRandomWords(
    bytes32 requestId,
    uint256[] calldata randomWords
  ) external override onlySamWitchVRF {
    allRandomWords[requestId] = randomWords;
  }
}
```

## Remote Deployment

If you want to deploy your own randomness service and manage it from another project, you must first import it into your Solidity contracts. This can be done by creating a file such as `./Imports.sol` with the contents:

```ts
// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import {SamWitchVRF} from "@samwitch/vrf/contracts/SamWitchVRF.sol";

```

You can then reference this artifact name in TypeScript files, like in this `ethers-v6` and `hardhat` proxy example.

```ts
import { SamWitchVRF } from "@samwitch/vrf";

async function deployContractsFixture() {
  const [owner] = await ethers.getSigners();
  const SamWitchVRF = await ethers.getContractFactory("SamWitchVRF");
  const samWitchVRF = (await upgrades.deployProxy(
    SamWitchVRF,
    [owner.address],
    {
      kind: "uups",
    },
  )) as unknown as SamWitchVRF;
  console.log("SamWitchVRF deployed at", await samWitchVRF.getAddress());
}
```

## Development & Testing

To start copy the `.env.sample` file to `.env` and fill in `PRIVATE_KEY` at a minimum (starts with `0x`).

```shell
# To compile the contracts
yarn compile

# To run the tests
yarn test

# To get code coverage
yarn coverage

# To deploy all contracts
yarn deploy --network <network>
yarn deploy --network fantom_testnet

# Export abi
yarn abi

# To fork or open a node connection
yarn fork
yarn fork --fork <rpc_url>
yarn fork --fork https://rpc.ftm.tools

# To impersonate an account on a forked or local blockchain for debugging
yarn impersonate
```
