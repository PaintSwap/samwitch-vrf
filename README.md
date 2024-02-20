# SWVRF (SamWitchVRF)

[![Continuous integration](https://github.com/PaintSwap/samwitch-vrf/actions/workflows/main.yml/badge.svg)](https://github.com/PaintSwap/samwitch-vrf/actions/workflows/main.yml)

![swvrf](https://github.com/PaintSwap/samwitch-vrf/assets/84033732/4caebec8-7e8d-4416-9f59-91e827ecbdd3)
This is a Verifiable Random Function smart contract handler, which requests random numbers from an oracle, and has a callback called once the random numbers are ready. There are no costs in requesting a number, but there needs to be enough native gas (FTM) on the oracle signer to be able to call the callbacks.

To start copy the `.env.sample` file to `.env` and fill in `PRIVATE_KEY` at a minimum (starts with `0x`).

```shell
yarn install

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
