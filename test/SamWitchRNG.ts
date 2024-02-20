import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers, upgrades} from "hardhat";
import {expect} from "chai";
import {SamWitchRNG, TestRNGConsumer} from "../typechain-types";

const elliptic = require("elliptic");
const ecvrf = require("vrf-ts-256");

describe("SamWitchRNG", function () {
  async function deployContractsFixture() {
    const [owner, alice, bob, charlie, dev] = await ethers.getSigners();

    const oracle = bob.address;
    const SamWitchRNG = await ethers.getContractFactory("SamWitchRNG");
    const samWitchRNG = (await upgrades.deployProxy(SamWitchRNG, [oracle], {
      kind: "uups",
    })) as unknown as SamWitchRNG;

    const rngConsumer = (await ethers.deployContract("TestRNGConsumer", [samWitchRNG])) as TestRNGConsumer;
    const alicesPrivateKey = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    const bobsPrivateKey = "5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

    return {
      samWitchRNG,
      rngConsumer,
      owner,
      alice,
      bob,
      charlie,
      dev,
      alicesPrivateKey,
      bobsPrivateKey,
    };
  }

  it("Simple fullment", async function () {
    const {samWitchRNG, rngConsumer, bob, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 3_000_000;
    let tx = await rngConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await rngConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    tx = await samWitchRNG.fulfillRandomWords(
      requestId,
      bob,
      rngConsumer,
      callbackGasLimit,
      numWords,
      publicKey,
      proof,
    );
    receipt = await tx.wait();

    log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    expect(log?.name).to.eq("RandomWordsFulfilled");
  });

  it("Initialize function constraints", async function () {
    const {bob} = await loadFixture(deployContractsFixture);
    const samWitchRNG = await ethers.deployContract("SamWitchRNG");

    await expect(samWitchRNG.initialize(bob)).to.be.reverted;
  });

  it("Fulfilling again is allowed (consumer must revert itself)", async function () {
    const {samWitchRNG, rngConsumer, bob, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    let tx = await rngConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await rngConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    tx = await samWitchRNG.fulfillRandomWords(
      requestId,
      bob,
      rngConsumer,
      callbackGasLimit,
      numWords,
      publicKey,
      proof,
    );
    receipt = await tx.wait();
    log = samWitchRNG.interface.parseLog(receipt?.logs[0]);

    // Cannot fulfill again
    await expect(
      samWitchRNG.fulfillRandomWords(requestId, bob, rngConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.be.revertedWithCustomError(samWitchRNG, "CommitmentMismatch");
  });

  it("Anyone can call fulfill as long as the signature is signed by the oracle", async function () {
    const {samWitchRNG, rngConsumer, alice, bob, alicesPrivateKey, bobsPrivateKey} =
      await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    let tx = await rngConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    // Create a hash of your data
    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await rngConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);

    // Sign the hash
    const publicKeyWrongSigner = getPublicKey(alicesPrivateKey);
    const proofWrongSigner = getProof(alicesPrivateKey, message);

    await expect(
      samWitchRNG
        .connect(alice)
        .fulfillRandomWords(
          requestId,
          bob,
          rngConsumer,
          callbackGasLimit,
          numWords,
          publicKeyWrongSigner,
          proofWrongSigner,
        ),
    ).to.be.revertedWithCustomError(samWitchRNG, "InvalidPublicKey");

    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);
    await expect(
      samWitchRNG
        .connect(alice)
        .fulfillRandomWords(requestId, bob, rngConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.not.be.reverted;
  });

  it("Must pass a real oracle to fulfil ", async function () {
    const {samWitchRNG, rngConsumer, alice, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    let tx = await rngConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await rngConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    await expect(
      samWitchRNG.fulfillRandomWords(requestId, alice, rngConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.be.revertedWithCustomError(samWitchRNG, "OnlyOracle");
  });

  it("Consumer ran out of gas", async function () {
    const {samWitchRNG, rngConsumer, bob, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 1;
    let tx = await rngConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await rngConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    await expect(
      samWitchRNG.fulfillRandomWords(requestId, bob, rngConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.be.revertedWithCustomError(samWitchRNG, "FulfillmentFailed");
  });

  it("Consumer reverts", async function () {
    const {samWitchRNG, rngConsumer, bob, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    let tx = await rngConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await rngConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    await rngConsumer.setShouldRevert(true);
    await expect(
      samWitchRNG.fulfillRandomWords(requestId, bob, rngConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.be.revertedWithCustomError(samWitchRNG, "FulfillmentFailed");
  });

  it("Registering consume can only be done by the owner", async function () {
    const {samWitchRNG, rngConsumer, alice} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await expect(samWitchRNG.connect(alice).registerConsumer(rngConsumer)).to.be.revertedWithCustomError(
      samWitchRNG,
      "OwnableUnauthorizedAccount",
    );
  });

  it("Request random words from a non-registered consumer", async function () {
    const {samWitchRNG, rngConsumer} = await loadFixture(deployContractsFixture);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    await expect(rngConsumer.requestRandomWords(numWords, callbackGasLimit)).to.be.revertedWithCustomError(
      samWitchRNG,
      "InvalidConsumer",
    );
  });

  it("Try to upgrade the contract with & without using the owner", async function () {
    const {samWitchRNG, owner, alice} = await loadFixture(deployContractsFixture);

    let SamWitchRNG = (await ethers.getContractFactory("SamWitchRNG")).connect(alice);
    await expect(
      upgrades.upgradeProxy(samWitchRNG, SamWitchRNG, {
        kind: "uups",
      }),
    ).to.be.revertedWithCustomError(samWitchRNG, "OwnableUnauthorizedAccount");

    SamWitchRNG = SamWitchRNG.connect(owner);
    await expect(
      upgrades.upgradeProxy(samWitchRNG, SamWitchRNG, {
        kind: "uups",
      }),
    ).to.not.be.reverted;
  });
});

const getProof = (privateKey: string, message: string) => {
  const rawProof = ecvrf.prove(privateKey, message.slice(2));
  return [
    "0x" + rawProof.decoded.gammaX.toString("hex"),
    "0x" + rawProof.decoded.gammaY.toString("hex"),
    "0x" + rawProof.decoded.c.toString("hex"),
    "0x" + rawProof.decoded.s.toString("hex"),
  ];
};

const getPublicKey = (privateKey: string) => {
  const EC = new elliptic.ec("secp256k1");
  const public_key = EC.keyFromPrivate(privateKey).getPublic();
  return ["0x" + public_key.x.toString("hex"), "0x" + public_key.y.toString("hex")];
};
