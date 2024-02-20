import hre, {ethers, upgrades} from "hardhat";
import {swvrfAddressBeta, swvrfAddressLive, verifyContracts} from "./helpers";
import {SamWitchVRF} from "../typechain-types";
import {networkConstants} from "../constants/network_constants";

// Upgrade vrf
async function main() {
  const [owner] = await ethers.getSigners();
  console.log(
    `Upgrading contracts with the account: ${owner.address} on chain id: ${(await ethers.provider.getNetwork()).chainId}`,
  );

  const timeout = 600 * 1000; // 10 minutes

  const swvrfAddress = swvrfAddressBeta;

  const SamWitchVRF = await ethers.getContractFactory("SamWitchVRF");
  const swvrf = (await upgrades.upgradeProxy(swvrfAddress, SamWitchVRF, {
    kind: "uups",
    timeout,
  })) as unknown as SamWitchVRF;
  await swvrf.waitForDeployment();

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
