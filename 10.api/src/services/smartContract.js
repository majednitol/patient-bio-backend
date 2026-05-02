
import { Gateway, Wallets } from 'fabric-network';
import { resolve } from 'path'
import { getCCP } from '../common/buildCCP.js';
import { buildWallet } from '../utils/AppUtils.js';
const walletPath = resolve("wallet");
export const smartContract = async (request, userId) => {
    // console.log("request",request)
    let OrgMSP = request.org;

    if (!OrgMSP) {
        throw new Error("Organization not specified in the request");
    }
    const org = OrgMSP.replace('MSP', '').toLowerCase();
    console.log("smartContract org 15",org,OrgMSP,userId)
    const ccp = getCCP(org);
    const wallet = await buildWallet(Wallets, walletPath);
    console.log("wallet", wallet)
console.log("ccp=",ccp)
    const gateway = new Gateway();

    await gateway.connect(ccp, {
        wallet,
        identity: userId,
        discovery: { enabled: false, asLocalhost: false }
    });
    const network = await gateway.getNetwork(request.channelName);
    // console.log("network",network)
    const contract = network.getContract(request.chaincodeName);
     console.log("network",network,contract,gateway)
    return contract
}