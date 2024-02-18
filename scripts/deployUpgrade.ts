import hre, {ethers, upgrades} from "hardhat";
import {swrngAddressBeta, swrngAddressLive, verifyContracts} from "./helpers";
import {SamWitchRNG} from "../typechain-types";
import {networkConstants} from "../constants/network_constants";

// Upgrade rng
async function main() {
  const [owner] = await ethers.getSigners();
  console.log(
    `Upgrading contracts with the account: ${owner.address} on chain id: ${(await ethers.provider.getNetwork()).chainId}`,
  );

  const timeout = 600 * 1000; // 10 minutes

  const swrngAddress = swrngAddressBeta;

  const SamWitchRNG = await ethers.getContractFactory("SamWitchRNG");
  const swrng = (await upgrades.upgradeProxy(swrngAddress, SamWitchRNG, {
    kind: "uups",
    timeout,
  })) as unknown as SamWitchRNG;
  await swrng.waitForDeployment();

  const {shouldVerify} = await networkConstants(hre);
  if (shouldVerify) {
    try {
      const addresses: string[] = [await swrng.getAddress()];
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
