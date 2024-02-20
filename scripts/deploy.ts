import hre, {ethers, upgrades} from "hardhat";
import {networkConstants} from "../constants/network_constants";
import {verifyContracts} from "./helpers";
import {SamWitchVRF} from "../typechain-types";

// Deploy everything
async function main() {
  const [owner] = await ethers.getSigners();
  console.log(
    `Deploying contracts with the account: ${owner.address} on chain id: ${(await ethers.provider.getNetwork()).chainId}`,
  );

  // Who is allowed to call the oracle callbacks
  const callerBeta = "0x6f7911cbbd4b5a1d2bdaa817a76056e510d728e7";
  const callerLive = "0x28ade840602d0363a2ab675479f1b590b23b0490";
  const caller = callerBeta;

  // Deploy SamWitchVRF
  const SamWitchVRF = await ethers.getContractFactory("SamWitchVRF");
  const swvrf = (await upgrades.deployProxy(SamWitchVRF, [caller], {
    kind: "uups",
    timeout: 600 * 1000, // 10 minutes
  })) as unknown as SamWitchVRF;
  await swvrf.waitForDeployment();
  console.log("Deployed SamWitchVRF to:", await swvrf.getAddress());

  const {shouldVerify} = await networkConstants(hre);
  if (shouldVerify) {
    try {
      const addresses: string[] = [await swvrf.getAddress()];
      console.log("Verifying contracts...");
      await verifyContracts(addresses);
    } catch (e) {
      console.log(e);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
