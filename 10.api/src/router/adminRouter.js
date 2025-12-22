
import express from 'express' 
import { addDisease, adminData, confirmation, createAdminAccount, getAllAdmin, getAllAdmindata, getDisease, isConfirmed, pendingUser, shareDataByAdmin, AddAuthorizedCountries, authorizedCountries } from '../controllers/adminController.js';
import authenticate from '../middleware/authenticate.js';

const adminRouter = express.Router()
adminRouter.post("/create-admin-account", createAdminAccount)
adminRouter.get('/getAdminData',authenticate, adminData);
adminRouter.get('/getAllAdminData',authenticate, getAllAdmindata);
adminRouter.get('/getAllAdmin', getAllAdmin);
adminRouter.post("/give-confirmation", authenticate, confirmation)
adminRouter.post("/share-data-by-admin", authenticate, shareDataByAdmin)
adminRouter.get('/get-diseases', authenticate, getDisease);
adminRouter.get('/pending-user', authenticate, pendingUser);
adminRouter.get('/isConfirmed', authenticate, isConfirmed);
adminRouter.post('/add-disease', authenticate, addDisease);
adminRouter.post('/add-disease', authenticate, addDisease);
adminRouter.post('/add-authorized-countries', authenticate, AddAuthorizedCountries);
adminRouter.get('/get-authorized-countries', authenticate, authorizedCountries);
export default adminRouter