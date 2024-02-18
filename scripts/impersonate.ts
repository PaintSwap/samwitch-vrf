import {ethers, upgrades} from "hardhat";
import {swrngAddressBeta} from "./helpers";
import {SamWitchRNG} from "../typechain-types";

async function main() {
  const network = await ethers.provider.getNetwork();
  console.log(`ChainId: ${network.chainId}`);

  const callerOwner = await ethers.getImpersonatedSigner("0x6f7911cbbd4b5a1d2bdaa817a76056e510d728e7");
  const timeout = 600 * 1000; // 10 minutes

  const swrngAddress = swrngAddressBeta;

  const SamWitchRNG = await ethers.getContractFactory("SamWitchRNG");
  const swrng = (await upgrades.upgradeProxy(swrngAddress, SamWitchRNG, {
    kind: "uups",
    timeout,
  })) as unknown as SamWitchRNG;
  await swrng.waitForDeployment();

  const requestId = "0x267b4ab2162460a0cd6db41638332b1a643b41b2d53d05cad91a8f0bebd989f1";
  const fulfill = "0x681da1c055158b6d7f8fca53aec984bd7f7be0af";
  const randomWords = [
    "0x6c05e1ca9d79db1118a558c1c2aabea689e8c6afe91ca9c1444c9fb371258058",
    "0x6be4e2383c983b892556a0190175b81367466a69fa6fb61709c4c1d0b5e7d69c",
  ];
  const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256[]"], [randomWords]);
  const gasLimit = 6_000_000;
  await swrng.connect(callerOwner).fulfillRandomWords(requestId, data, fulfill, gasLimit);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
