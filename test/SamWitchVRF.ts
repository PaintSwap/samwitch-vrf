import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers, upgrades} from "hardhat";
import {expect} from "chai";
import {SamWitchVRF, TestVRFConsumer} from "../typechain-types";

const elliptic = require("elliptic");
const ecvrf = require("vrf-ts-256");

describe("SamWitchVRF", function () {
  async function deployContractsFixture() {
    const [owner, alice, bob, charlie, dev] = await ethers.getSigners();

    const oracle = bob.address;
    const SamWitchVRF = await ethers.getContractFactory("SamWitchVRF");
    const samWitchVRF = (await upgrades.deployProxy(SamWitchVRF, [oracle], {
      kind: "uups",
    })) as unknown as SamWitchVRF;

    const vrfConsumer = (await ethers.deployContract("TestVRFConsumer", [samWitchVRF])) as TestVRFConsumer;
    const alicesPrivateKey = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    const bobsPrivateKey = "5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

    return {
      samWitchVRF,
      vrfConsumer,
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
    const {samWitchVRF, vrfConsumer, bob, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    await samWitchVRF.registerConsumer(vrfConsumer);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 3_000_000;
    let tx = await vrfConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchVRF.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await vrfConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    tx = await samWitchVRF.fulfillRandomWords(
      requestId,
      bob,
      vrfConsumer,
      callbackGasLimit,
      numWords,
      publicKey,
      proof,
    );
    receipt = await tx.wait();

    log = samWitchVRF.interface.parseLog(receipt?.logs[0]);
    expect(log?.name).to.eq("RandomWordsFulfilled");
  });

  it("Initialize function constraints", async function () {
    const {bob} = await loadFixture(deployContractsFixture);
    const samWitchVRF = await ethers.deployContract("SamWitchVRF");

    await expect(samWitchVRF.initialize(bob)).to.be.reverted;
  });

  it("Fulfilling again is allowed (consumer must revert itself)", async function () {
    const {samWitchVRF, vrfConsumer, bob, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    await samWitchVRF.registerConsumer(vrfConsumer);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    let tx = await vrfConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchVRF.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await vrfConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    tx = await samWitchVRF.fulfillRandomWords(
      requestId,
      bob,
      vrfConsumer,
      callbackGasLimit,
      numWords,
      publicKey,
      proof,
    );
    receipt = await tx.wait();
    log = samWitchVRF.interface.parseLog(receipt?.logs[0]);

    // Cannot fulfill again
    await expect(
      samWitchVRF.fulfillRandomWords(requestId, bob, vrfConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.be.revertedWithCustomError(samWitchVRF, "CommitmentMismatch");
  });

  it("Anyone can call fulfill as long as the signature is signed by the oracle", async function () {
    const {samWitchVRF, vrfConsumer, alice, bob, alicesPrivateKey, bobsPrivateKey} =
      await loadFixture(deployContractsFixture);

    await samWitchVRF.registerConsumer(vrfConsumer);

    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    let tx = await vrfConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchVRF.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await vrfConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);

    // Sign the hash
    const publicKeyWrongSigner = getPublicKey(alicesPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    await expect(
      samWitchVRF
        .connect(alice)
        .fulfillRandomWords(requestId, bob, vrfConsumer, callbackGasLimit, numWords, publicKeyWrongSigner, proof),
    ).to.be.revertedWithCustomError(samWitchVRF, "InvalidPublicKey");

    const publicKey = getPublicKey(bobsPrivateKey);
    const proofWrongSigner = getProof(alicesPrivateKey, message);

    await expect(
      samWitchVRF
        .connect(alice)
        .fulfillRandomWords(requestId, bob, vrfConsumer, callbackGasLimit, numWords, publicKey, proofWrongSigner),
    ).to.be.revertedWithCustomError(samWitchVRF, "InvalidProof");

    await expect(
      samWitchVRF
        .connect(alice)
        .fulfillRandomWords(requestId, bob, vrfConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.not.be.reverted;
  });

  it("Must pass a real oracle to fulfil ", async function () {
    const {samWitchVRF, vrfConsumer, alice, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    await samWitchVRF.registerConsumer(vrfConsumer);

    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    let tx = await vrfConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchVRF.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await vrfConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    await expect(
      samWitchVRF.fulfillRandomWords(requestId, alice, vrfConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.be.revertedWithCustomError(samWitchVRF, "OnlyOracle");
  });

  it("Consumer ran out of gas", async function () {
    const {samWitchVRF, vrfConsumer, bob, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    await samWitchVRF.registerConsumer(vrfConsumer);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 1;
    let tx = await vrfConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchVRF.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await vrfConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    await expect(
      samWitchVRF.fulfillRandomWords(requestId, bob, vrfConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.be.revertedWithCustomError(samWitchVRF, "FulfillmentFailed");
  });

  it("Consumer reverts", async function () {
    const {samWitchVRF, vrfConsumer, bob, bobsPrivateKey} = await loadFixture(deployContractsFixture);

    await samWitchVRF.registerConsumer(vrfConsumer);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    let tx = await vrfConsumer.requestRandomWords(numWords, callbackGasLimit);
    let receipt = await tx.wait();

    let log = samWitchVRF.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const {chainId} = await ethers.provider.getNetwork();
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256", "address", "uint256"],
      [requestId, callbackGasLimit, numWords, await vrfConsumer.getAddress(), chainId],
    );
    const message = ethers.keccak256(encodedParams);
    const publicKey = getPublicKey(bobsPrivateKey);
    const proof = getProof(bobsPrivateKey, message);

    await vrfConsumer.setShouldRevert(true);
    await expect(
      samWitchVRF.fulfillRandomWords(requestId, bob, vrfConsumer, callbackGasLimit, numWords, publicKey, proof),
    ).to.be.revertedWithCustomError(samWitchVRF, "FulfillmentFailed");
  });

  it("Registering consumer can only be done by the owner", async function () {
    const {samWitchVRF, vrfConsumer, alice} = await loadFixture(deployContractsFixture);

    await expect(samWitchVRF.connect(alice).registerConsumer(vrfConsumer)).to.be.revertedWithCustomError(
      samWitchVRF,
      "OwnableUnauthorizedAccount",
    );
  });

  it("Request random words from a non-registered consumer", async function () {
    const {samWitchVRF, vrfConsumer} = await loadFixture(deployContractsFixture);

    // Request 1 random word
    const numWords = 1;
    const callbackGasLimit = 1_000_000;
    await expect(vrfConsumer.requestRandomWords(numWords, callbackGasLimit)).to.be.revertedWithCustomError(
      samWitchVRF,
      "InvalidConsumer",
    );
  });

  it("Try to upgrade the contract with & without using the owner", async function () {
    const {samWitchVRF, owner, alice} = await loadFixture(deployContractsFixture);

    let SamWitchVRF = (await ethers.getContractFactory("SamWitchVRF")).connect(alice);
    await expect(
      upgrades.upgradeProxy(samWitchVRF, SamWitchVRF, {
        kind: "uups",
      }),
    ).to.be.revertedWithCustomError(samWitchVRF, "OwnableUnauthorizedAccount");

    SamWitchVRF = SamWitchVRF.connect(owner);
    await expect(
      upgrades.upgradeProxy(samWitchVRF, SamWitchVRF, {
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
