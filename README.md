# SWRNG (SamWitchRNG)

[![Continuous integration](https://github.com/PaintSwap/samwitch-rng/actions/workflows/main.yml/badge.svg)](https://github.com/PaintSwap/samwitch-rng/actions/workflows/main.yml)

![swrng](https://github.com/PaintSwap/samwitch-rng/assets/84033732/d2a77205-5479-42ca-a9ee-94b38544ec3d)
This is a simple Random Number Generator contract/consumer. It is gas efficient as it does not check for any request ids which exist, it's common for the consumers to check this already, and is actually a requirement with SWRNG.

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
