import hre, {ethers} from "hardhat";
import {SamWitchVRF} from "../typechain-types";
import {swvrfAddressBeta, swvrfAddressLive, verifyContracts} from "./helpers";
import {networkConstants} from "../constants/network_constants";

async function main() {
  const [owner] = await ethers.getSigners();
  console.log(
    `Deploying test data with the account: ${owner.address} on chain id: ${(await ethers.provider.getNetwork()).chainId}`,
  );

  const swvrfAddress = swvrfAddressBeta;
  const swvrf = (await ethers.getContractAt("SamWitchVRF", swvrfAddress)) as SamWitchVRF;

  // swvrf
  let tx = await swvrf.registerConsumer("0x40567ad9cd25c56422807ed67f0e66f1825bdb91");
  await tx.wait();

  tx = await swvrf.registerConsumer("0xf31517db9f0987002f3a0fb4f787dfb9e892f184");
  await tx.wait();

  const testVRFConsumer = await ethers.deployContract("TestVRFConsumer", [swvrf]);
  console.log("testVRFConsumer deployed to: ", await swvrf.getAddress());
  await testVRFConsumer.waitForDeployment();
  tx = await swvrf.registerConsumer(testVRFConsumer);
  await tx.wait();

  const callbackGasLimit = 1_000_000;
  tx = await testVRFConsumer.requestRandomWords(2, callbackGasLimit);
  await tx.wait();
  console.log("Request random");

  const {shouldVerify} = await networkConstants(hre);
  if (shouldVerify) {
    try {
      const addresses: string[] = [await testVRFConsumer.getAddress()];
      console.log("Verifying contracts...");
      await verifyContracts(addresses, [[swvrfAddress]]);
    } catch (e) {
      console.log(e);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
