#!/bin/bash

set -e
run_in_container() {
  local POD=$1
  local CMD=$2
  kubectl exec "$POD" -- sh -c "$CMD"
}

if [[ -f ../config.env ]]; then
  source ../config.env
else
  echo "❌ config.env file not found!"
  exit 1
fi
PACKAGE_FILE="package_identifiers.txt"
# Ensure package file exists
if [ ! -f "$PACKAGE_FILE" ]; then
  echo "❌ $PACKAGE_FILE not found!"
  exit 1
fi

# echo " Approving chaincode from each org's CLI pod..."
# ORG_NAMES=( "${ORG_NAMES[@]:1}" )
# for i in "${!ORG_NAMES[@]}"; do
#   ORG="${ORG_NAMES[$i]}"
#   PORT="${PEER_PORTS[$i]}"

#    CLI_POD=$(kubectl get pods -o name | grep "cli-peer0-${ORG}" | head -n1)
#   if [ -z "$CLI_POD" ]; then
#     echo "❌ CLI pod not found for $ORG"
#     exit 1
#   fi
# echo "Fetching $ORG ..$PORT from env"
#   echo "🔍 Fetching Package ID from $CLI_POD..."
#   PACKAGE_ID=$(kubectl exec "$CLI_POD" -- sh -c "grep '^${ORG}:' /opt/gopath/src/github.com/chaincode/basic/packaging/package_identifiers.txt | cut -d':' -f2-" | xargs)

#   if [ -z "$PACKAGE_ID" ]; then
#     echo "❌ Package ID not found in pod for $ORG"
#     exit 1
#   fi

#   echo "➡️ Approving chaincode for $ORG using pod $CLI_POD on port $PORT...$PACKAGE_ID"

#   run_in_container "$CLI_POD" "
#     peer lifecycle chaincode approveformyorg \
#       --channelID $CHANNEL_NAME \
#       --name $CHAINCODE_NAME \
#       --version $CHAINCODE_VERSION \
#       --init-required \
#       --package-id $PACKAGE_ID \
#       --sequence $SEQUENCE \
#       -o $ORDERER_ADDRESS \
#       --tls \
#       --cafile $ORDERER_CA_PATH
#   "

#   echo "✅ Approved for $ORG"
#   sleep 5
# done

# echo "✅ All orgs have approved the chaincode."

# Check commit readiness
echo "🧪 Checking commit readiness from patient CLI pod..."
PATIENT_POD=$(kubectl get pods -o name | grep "cli-peer0-patient" | head -n1)
if [ -z "$PATIENT_POD" ]; then
  echo "❌ patient CLI pod not found"
  exit 1
fi

run_in_container "$PATIENT_POD" "
  peer lifecycle chaincode checkcommitreadiness \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --init-required \
    --sequence $SEQUENCE \
    -o $ORDERER_ADDRESS \
    --tls \
    --cafile $ORDERER_CA_PATH
"
# Commit chaincode
echo "📦 Committing chaincode from patient CLI pod..."
COMMIT_CMD="peer lifecycle chaincode commit \
  -o $ORDERER_ADDRESS \
  --channelID $CHANNEL_NAME \
  --name $CHAINCODE_NAME \
  --version $CHAINCODE_VERSION \
  --sequence $SEQUENCE \
  --init-required \
  --tls \
  --cafile $ORDERER_CA_PATH"

for i in "${!ORG_LIST[@]}"; do
  ORG="${ORG_LIST[$i]}"
  PORT="${PEER_PORTS[$i]}"
  COMMIT_CMD+=" --peerAddresses peer0-${ORG}:${PORT}"
  COMMIT_CMD+=" --tlsRootCertFiles /organizations/peerOrganizations/${ORG}.$MAIN_DOMAIN/peers/peer0.${ORG}.$MAIN_DOMAIN/tls/ca.crt"
done

run_in_container "$PATIENT_POD" "$COMMIT_CMD"


# Query committed chaincode
echo "🔍 Querying committed chaincode from patient CLI pod..."
run_in_container "$PATIENT_POD" "
  peer lifecycle chaincode querycommitted -C $CHANNEL_NAME
"

# Invoke InitLedger
echo "🚀 Invoking InitLedger from patient CLI pod..."

INVOKE_CMD="peer chaincode invoke \
  -o $ORDERER_ADDRESS \
  --isInit \
  --tls \
  --cafile $ORDERER_CA_PATH \
  -C $CHANNEL_NAME \
  -n $CHAINCODE_NAME \
  -c '{\"Args\":[\"InitLedger\"]}' \
  --waitForEvent"

for i in "${!ORG_NAMES[@]}"; do
  ORG="${ORG_NAMES[$i]}"
  PORT="${PEER_PORTS[$i]}"
  INVOKE_CMD+=" --peerAddresses peer0-${ORG}:${PORT}"
  INVOKE_CMD+=" --tlsRootCertFiles /organizations/peerOrganizations/${ORG}.$MAIN_DOMAIN/peers/peer0.${ORG}.$MAIN_DOMAIN/tls/ca.crt"
done

run_in_container "$PATIENT_POD" "$INVOKE_CMD"

echo "🎉 Chaincode deployed and InitLedger invoked successfully!"
