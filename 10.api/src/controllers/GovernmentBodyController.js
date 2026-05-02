import { revokeAccess, setGovermentBody, grantAccess, getGovermentBody } from "../services/govenmentBodyService.js";

const chaincodeName = "basic";
const channelName = "mychannel"
export async function createGovermentBodyAccount(req, res) {
    try {
        let payload = {
            "org": req.body.org,
            "channelName": channelName,
            "chaincodeName": chaincodeName,
            "data": req.body.data
        }
        console.log("payload", payload)
        let result = await setGovermentBody(payload);
        console.log(result)
        res.send(result)
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}



export async function giveGrantAccess(req, res) {
    try {
        let payload = {
            "org": req.body.org,
            "channelName": channelName,
            "chaincodeName": chaincodeName,
            "receiverCountryID": req.body.receiverCountryID,
            "giverCountryID": req.userId
        }
        console.log("payload", payload)
        let result = await grantAccess(payload);
        console.log(result)
        res.send(result)
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}


export async function RevokeAccess(req, res) {
    try {
        let payload = {
            "org": req.body.org,
            "channelName": channelName,
            "chaincodeName": chaincodeName,
            "receiverCountryID": req.body.receiverCountryID,
            "giverCountryID": req.userId
        }
        console.log("payload", payload)
        let result = await revokeAccess(payload);
        console.log(result)
        res.send(result)
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}
export async function govermentBodyData(req, res) {
    try {
        let payload = {
            "org": req.org,
            "channelName": channelName,
            "chaincodeName": chaincodeName,
            "userId": req.query.userId ? req.query.userId : req.userId
        }
        console.log("payload", payload)
        let result = await getGovermentBody(payload);
        console.log("result app", result)
        res.json(result)
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}


