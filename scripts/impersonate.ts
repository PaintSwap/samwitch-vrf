import {ethers, upgrades} from "hardhat";
import {swrngAddressBeta} from "./helpers";
import {SamWitchRNG} from "../typechain-types";

async function main() {
  const network = await ethers.provider.getNetwork();
  console.log(`ChainId: ${network.chainId}`);

  const oracle = await ethers.getImpersonatedSigner("0x6f7911cbbd4b5a1d2bdaa817a76056e510d728e7");
  const timeout = 600 * 1000; // 10 minutes

  const swrngAddress = swrngAddressBeta;

  const SamWitchRNG = await ethers.getContractFactory("SamWitchRNG");
  const swrng = (await upgrades.upgradeProxy(swrngAddress, SamWitchRNG, {
    kind: "uups",
    timeout,
  })) as unknown as SamWitchRNG;
  await swrng.waitForDeployment();

  // Fill in what you want to do with the contract here
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
