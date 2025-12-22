import { smartContract } from "./smartContract.js";
export async function getGovermentBody(request) {
  try {
    const govermentID = request.userId; 
    console.log("govermentID:", govermentID);
    const contract = await smartContract(request, govermentID);
    const result = await contract.evaluateTransaction(
      "GetGovermentBody",
      govermentID
    );
    const parsedResult = JSON.parse(result.toString());
    console.log("GetGovermentBody result:", parsedResult);
    return parsedResult;
  } catch (error) {
    console.error("Error in GetGovermentBody:", error);
    throw error;
  }
}


export async function getAuthorizedCountries(request) {
  try {
    const userId = request.userId
    console.log("userId", userId)
    const contract = await smartContract(request, userId)
    let result = await contract.evaluateTransaction("GetAuthorizedCountries", userId);
    console.log("result", result)
    return JSON.parse(result);
  } catch (error) {
    console.log(error)
  }
}


export async function getPendingUser(request) {
  try {
    const userId = request.userId
    console.log("userId", userId)
    const contract = await smartContract(request, userId)
    let result = await contract.evaluateTransaction("GetPendingTx");
    console.log("result", result)
    return JSON.parse(result);
  } catch (error) {
    console.log(error)
  }
}
export async function GetIsConfirmed(request) {
  try {
    const userId = request.userId
    console.log("userId", userId)
    const contract = await smartContract(request, userId)
    let result = await contract.evaluateTransaction("GetIsConfirmed");
    console.log("result", result)
    return JSON.parse(result);
  } catch (error) {
    console.log(error)
  }
}

export async function GetDiseaseNames(request) {
  try {
    const userId = request.userId
    console.log("userId", userId)
    const contract = await smartContract(request, userId)
    let result = await contract.evaluateTransaction("GetDiseaseNames");
    console.log("result", result)
    return JSON.parse(result);
  } catch (error) {
    console.log(error)
  }
}

export async function grantAccess(request) {
  try {
    const giverCountryID = request.data.giverCountryID;
    const receiverCountryID = request.data.receiverCountryID;

    console.log("GrantAccess:", giverCountryID, "→", receiverCountryID);

    const contract = await smartContract(request, giverCountryID);

    const result = await contract.submitTransaction(
      "GrantAccess",
      giverCountryID,
      receiverCountryID
    );

    console.log("GrantAccess transaction result:", result.toString());

    return {
      success: true,
      giverCountryID,
      receiverCountryID,
    };

  } catch (error) {
    console.error("Error in GrantAccess:", error);
    throw error;
  }
}

export async function revokeAccess(request) {
  try {
    const { giverCountryID, receiverCountryID } = request;

    if (!giverCountryID || !receiverCountryID) {
      throw new Error("giverCountryID and receiverCountryID are required");
    }

    if (giverCountryID === receiverCountryID) {
      throw new Error("giver and receiver cannot be the same country");
    }
    const contract = await smartContract(request, giverCountryID);

    await contract.submitTransaction(
      "RevokeAccess",
      giverCountryID,
      receiverCountryID
    );

    console.log(
      `RevokeAccess successful: ${giverCountryID} → ${receiverCountryID}`
    );

    return {
      success: true,
      message: "Access revoked successfully",
      giverCountryID,
      receiverCountryID,
    };

  } catch (error) {
    console.error("Error in revokeAccess:", error);
    throw error;
  }
}

export async function AddDisease(request) {
  try {
    const disease = request.disease;
    const userId = request.userId
    const contract = await smartContract(request, userId)
    let result = await contract.submitTransaction(
      "AddDisease",
      disease
      
    );
    console.log("Transaction Result:", result);

    return result;
  } catch (error) {
    console.error("Error in createAsset:", error);
    throw error;
  }
}

export async function setGovermentBody(request) {
  try {
    const data = request.data;
    const govermentID = data.govermentID;

    const contract = await smartContract(request, govermentID);

    const result = await contract.submitTransaction(
      "SetGovermentBody",
      data.govermentID,          
      data.countryName,          
      data.countryCode,          
      data.representativeName,   
      data.emailAddress,         
      data.representativeEmail   
    );

    console.log("SetGovermentBody Transaction Result:", result.toString());
    return result;

  } catch (error) {
    console.error("Error in SetGovermentBody:", error);
    throw error;
  }
}

export async function allAdminData(request) {
  try {
    const userId = request.userId
    console.log("userId", userId)
    const contract = await smartContract(request, userId)
    let result = await contract.evaluateTransaction("GetAllAdmindata");
    console.log("result", result)
    return JSON.parse(result);
  } catch (error) {
    console.log(error)
  }
}
export async function allAdmin(request) {
  try {
    const userId = request.userId
    console.log("userId", userId)
    const contract = await smartContract(request, userId)
    let result = await contract.evaluateTransaction("GetAllAdmins");
    console.log("result", result)
    return JSON.parse(result);
  } catch (error) {
    console.log(error)
  }
}

export async function setAuthorizedCountries(request) {
  try {
    const adminId = request.adminId
    const contract = await smartContract(request, adminId)
    let result = await contract.submitTransaction(
      "SetAuthorizedCountries",
      adminId,
      request.countries
    );
    console.log("Transaction Result:", result);

    return result;
  } catch (error) {
    console.error("Error in createAsset:", error);
    throw error;
  }
}

export async function giveConfirmation(request) {
  try {
    
    const adminId = request.adminId
    const contract = await smartContract(request, adminId)
    let result = await contract.submitTransaction(
      "GiveConfirmation",
      request.userId,
      adminId
    );
    console.log("Transaction Result:", result);

    return result;
  } catch (error) {
    console.error("Error in createAsset:", error);
    throw error;
  }
}