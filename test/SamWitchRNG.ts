import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers, upgrades} from "hardhat";
import {expect} from "chai";
import {SamWitchRNG, TestRNGConsumer} from "../typechain-types";

describe("SamWitchRNG", function () {
  async function deployContractsFixture() {
    const [owner, alice, bob, charlie, dev] = await ethers.getSigners();

    const caller = bob.address;
    const SamWitchRNG = await ethers.getContractFactory("SamWitchRNG");
    const samWitchRNG = (await upgrades.deployProxy(SamWitchRNG, [caller], {
      kind: "uups",
    })) as unknown as SamWitchRNG;

    const rngConsumer = (await ethers.deployContract("TestRNGConsumer", [samWitchRNG])) as TestRNGConsumer;

    return {
      samWitchRNG,
      rngConsumer,
      owner,
      alice,
      bob,
      charlie,
      dev,
    };
  }

  it("Simple fullment", async function () {
    const {samWitchRNG, rngConsumer, bob} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    // Request 1 random word
    const numWords = 1;
    let tx = await rngConsumer.requestRandomWords(numWords);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const randomNum = ethers.hexlify(ethers.randomBytes(32));
    const gasLimit = 1_000_000;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256[]"], [[randomNum]]);
    tx = await samWitchRNG.connect(bob).fulfillRandomWords(requestId, data, rngConsumer, gasLimit);
    receipt = await tx.wait();
    log = samWitchRNG.interface.parseLog(receipt?.logs[0]);

    expect(log?.args[1]).to.deep.eq(data);
    expect(log?.name).to.eq("RandomWordsFulfilled");

    expect(ethers.toBeHex(await rngConsumer.allRandomWords(requestId, 0))).to.deep.eq(randomNum);
  });

  it("Initialize function constraints", async function () {
    const {bob} = await loadFixture(deployContractsFixture);
    const samWitchRNG = await ethers.deployContract("SamWitchRNG");

    await expect(samWitchRNG.connect(bob).initialize(bob)).to.be.reverted;
  });

  it("Fulfilling again is allowed (consumer must revert itself)", async function () {
    const {samWitchRNG, rngConsumer, bob} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    // Request 1 random word
    const numWords = 1;
    let tx = await rngConsumer.requestRandomWords(numWords);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const randomNum = ethers.hexlify(ethers.randomBytes(32));
    const gasLimit = 1_000_000;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256[]"], [[randomNum]]);
    tx = await samWitchRNG.connect(bob).fulfillRandomWords(requestId, data, rngConsumer, gasLimit);
    receipt = await tx.wait();
    log = samWitchRNG.interface.parseLog(receipt?.logs[0]);

    // Can call fulfill again, it is a requirement that it is reverted on the consumer side if the requestId is already fulfilled
    await expect(samWitchRNG.connect(bob).fulfillRandomWords(requestId, data, rngConsumer, gasLimit)).to.not.be
      .reverted;
  });

  it("Only the caller can fulfill the random words", async function () {
    const {samWitchRNG, rngConsumer, alice} = await loadFixture(deployContractsFixture);
    const gasLimit = 1_000_000;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256[]"], [[1]]);
    await expect(
      samWitchRNG.connect(alice).fulfillRandomWords(ethers.encodeBytes32String("1"), data, rngConsumer, gasLimit),
    ).to.be.revertedWithCustomError(samWitchRNG, "OnlyCaller");
  });

  it("Consumer ran out of gas", async function () {
    const {samWitchRNG, rngConsumer, bob} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    // Request 1 random word
    const numWords = 1;
    let tx = await rngConsumer.requestRandomWords(numWords);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const randomNum = ethers.hexlify(ethers.randomBytes(32));
    const gasLimit = 1;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256[]"], [[randomNum]]);
    await expect(
      samWitchRNG.connect(bob).fulfillRandomWords(requestId, data, rngConsumer, gasLimit),
    ).to.be.revertedWithCustomError(samWitchRNG, "FulfillmentFailed");
  });

  it("Consumer reverts", async function () {
    const {samWitchRNG, rngConsumer, bob} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await samWitchRNG.registerConsumer(rngConsumer);

    // Request 1 random word
    const numWords = 1;
    let tx = await rngConsumer.requestRandomWords(numWords);
    let receipt = await tx.wait();

    let log = samWitchRNG.interface.parseLog(receipt?.logs[0]);
    const requestId = log.args[0];

    const randomNum = ethers.hexlify(ethers.randomBytes(32));
    const gasLimit = 1_000_000;
    await rngConsumer.setShouldRevert(true);
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256[]"], [[randomNum]]);
    await expect(
      samWitchRNG.connect(bob).fulfillRandomWords(requestId, data, rngConsumer, gasLimit),
    ).to.be.revertedWithCustomError(samWitchRNG, "FulfillmentFailed");
  });

  it("Registering consume can only be done by the owner", async function () {
    const {samWitchRNG, rngConsumer, bob} = await loadFixture(deployContractsFixture);

    // samWitchRNG is allowed to call the oracle callbacks
    await expect(samWitchRNG.connect(bob).registerConsumer(rngConsumer)).to.be.revertedWithCustomError(
      samWitchRNG,
      "OwnableUnauthorizedAccount",
    );
  });

  it("Request random words from a non-registered consumer", async function () {
    const {samWitchRNG, rngConsumer} = await loadFixture(deployContractsFixture);

    // Request 1 random word
    const numWords = 1;
    await expect(rngConsumer.requestRandomWords(numWords)).to.be.revertedWithCustomError(
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
