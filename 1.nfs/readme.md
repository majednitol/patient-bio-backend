## NFS Server
sudo apt update
sudo apt install nfs-kernel-server
sudo mkdir -p /mnt/nfs_share
sudo chown -R nobody:nogroup /mnt/nfs_share/
sudo chmod 777 /mnt/nfs_share/
echo "/mnt/nfs_share *(rw,sync,no_subtree_check,insecure)" | sudo tee -a /etc/exports
sudo exportfs -a
sudo systemctl restart nfs-kernel-server
## NFS Client (Ubuntu)
sudo apt update
sudo apt install nfs-common
sudo mkdir -p /mnt/nfs_clientshare
sudo mount -t nfs 139.59.74.85:/mnt/nfs_share ./nfs_clientshare
ls -l /mnt/nfs_clientshare/
## NFS Client (MacOS)
mkdir nfs_clientshare
sudo mount -o nolocks -t nfs 10.51.112.3:/mnt/nfs_share ./nfs_clientshare
cd usr/share/nginx/html

sudo cp -R prerequsite/* config.env ~/coding/nfs_clientshare 
sudo mv config.env scripts/

sudo chmod 777 -R chaincode connection-profile configtx organizations
 sudo chmod +x scripts -R 
 sudo rm -rf chaincode connection-profile scripts fabric-ca configtx organizations system-genesis-block scripts channel-artifacts state

cp -R nfs_share/* backup_data/
cp -R backup_data/* nfs_share/ 
sudo chmod 777 chaincode connection-profile configtx organizations channel-artifacts system-genesis-block state -R

## minikube NFS (local deployment)
minikube start --disk-size=20g --memory=7835 --cpus=8 sudo chmod -R 777 ../nfs_share
minikube start --mount --mount-string="/Users/majedurrahman/nfs_share:/mnt/data" minikube delete minikube stop minikube mount ../nfs_share:/mnt/data







vm kOIf6GHgrK ./scripts/ccp.sh

kubectl delete deployments,services,jobs,configmaps,pv,pvc --all

ssh root@144.202.26.76
sudo ufw allow 2049/tcp
sudo ufw allow 20048/tcp
sudo ufw allow 32765/tcp
sudo ufw allow 32766/tcp
sudo ufw reload

sudo mount -t nfs -o vers=4 144.202.26.76:/mnt/nfs_share /Users/majedurrahman/coding/nfs_clientshare
