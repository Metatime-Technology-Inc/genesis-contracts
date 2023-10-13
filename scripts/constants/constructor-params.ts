import { Address } from "hardhat-deploy/types";

interface ConstructorParams {
  Bridge: {
    mtcAddress: Address;
  };
}

export default {
  Bridge: {
    mtcAddress: "0xB93ee4522C44Ef4cD7EE8c83B9Fe1A421b4b42C3",
  },
} as ConstructorParams;
