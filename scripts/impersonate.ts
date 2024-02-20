import {ethers, upgrades} from "hardhat";
import {swvrfAddressBeta} from "./helpers";
import {SamWitchVRF} from "../typechain-types";

async function main() {
  const network = await ethers.provider.getNetwork();
  console.log(`ChainId: ${network.chainId}`);

  const oracle = await ethers.getImpersonatedSigner("0x6f7911cbbd4b5a1d2bdaa817a76056e510d728e7");
  const timeout = 600 * 1000; // 10 minutes

  const swvrfAddress = swvrfAddressBeta;

  const SamWitchVRF = await ethers.getContractFactory("SamWitchVRF");
  const swvrf = (await upgrades.upgradeProxy(swvrfAddress, SamWitchVRF, {
    kind: "uups",
    timeout,
  })) as unknown as SamWitchVRF;
  await swvrf.waitForDeployment();

  // Fill in what you want to do with the contract here
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
