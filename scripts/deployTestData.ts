import hre, {ethers} from "hardhat";
import {SamWitchRNG} from "../typechain-types";
import { swrngAddressBeta, swrngAddressLive, verifyContracts } from "./helpers";
import { networkConstants } from "../constants/network_constants";

async function main() {
  const [owner] = await ethers.getSigners();
  console.log(
    `Deploying test data with the account: ${owner.address} on chain id: ${(await ethers.provider.getNetwork()).chainId}`,
  );

  const swrngAddress = swrngAddressBeta;
  const swrng = (await ethers.getContractAt("SamWitchRNG", swrngAddress)) as SamWitchRNG;

  // swrng
  let tx = await swrng.registerConsumer("0x40567ad9cd25c56422807ed67f0e66f1825bdb91");
  await tx.wait();

  tx = await swrng.registerConsumer("0xf31517db9f0987002f3a0fb4f787dfb9e892f184");
  await tx.wait();

  const testRNGConsumer = await ethers.deployContract("TestRNGConsumer", [swrng]);
  console.log("testRNGConsumer deployed to: ", await swrng.getAddress());
  await testRNGConsumer.waitForDeployment();
  tx = await swrng.registerConsumer(testRNGConsumer);
  await tx.wait();

  tx = await testRNGConsumer.requestRandomWords(2);
  await tx.wait();
  console.log("Request random");

  const {shouldVerify} = await networkConstants(hre);
  if (shouldVerify) {
    try {
      const addresses: string[] = [await testRNGConsumer.getAddress()];
      console.log("Verifying contracts...");
      await verifyContracts(addresses, [swrngAddress]);
    } catch (e) {
      console.log(e);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
