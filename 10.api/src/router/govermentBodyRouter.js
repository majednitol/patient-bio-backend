
import express from 'express' 
import { createGovermentBodyAccount, giveGrantAccess,RevokeAccess,govermentBodyData } from '../controllers/GovernmentBodyController.js';
import authenticate from '../middleware/authenticate.js';

const govRouter = express.Router()
govRouter.post("/create-goverment-body-account", createGovermentBodyAccount)
govRouter.get('/getGovermentBodyData',authenticate, govermentBodyData);
govRouter.post('/revoke-access', authenticate, RevokeAccess);
govRouter.post('/give-grant-access', authenticate, giveGrantAccess);
export default govRouter