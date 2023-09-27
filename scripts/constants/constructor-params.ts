import { BigNumber } from "ethers";
import { toWei } from "../helpers";

interface IConstructorParams {
    MTC: {
        totalSupply: BigNumber;
    },
}

const CONSTRUCTOR_PARAMS: IConstructorParams = {
    MTC: {
        totalSupply: toWei(String(10_000_000_000)),
    },
};

export default CONSTRUCTOR_PARAMS;