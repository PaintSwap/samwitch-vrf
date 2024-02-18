# SWRNG (SamWitchRNG)

[![Continuous integration](https://github.com/PaintSwap/samwitch-rng/actions/workflows/main.yml/badge.svg)](https://github.com/PaintSwap/samwitch-rng/actions/workflows/main.yml)

![swrng](https://github.com/PaintSwap/samwitch-rng/assets/84033732/977c060f-e6e7-418f-9d44-1012599f41c6)

This is a simple Random Number Generator contract/consumer.

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
