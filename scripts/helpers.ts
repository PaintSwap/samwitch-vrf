import {run} from "hardhat";

// If there's an error with build-info not matching then delete cache/artifacts folder and try again
export const verifyContracts = async (addresses: string[], args: any[][] = []) => {
  for (const address of addresses) {
    const constructorArguments = args.length == addresses.length ? args[addresses.indexOf(address)] : [];
    await run("verify:verify", {
      address,
      constructorArguments,
    });
  }
  console.log("Verified all contracts");
};

export const swvrfAddressBeta = "0x067FF89B1E3315fc4a11C732339A13Af326730a5";
export const swvrfAddressLive = "";
