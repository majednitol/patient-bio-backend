## NFS Server

1. sudo apt update
2. sudo apt install nfs-kernel-server
3. sudo mkdir -p /mnt/nfs_share
4. sudo chown -R nobody:nogroup /mnt/nfs_share/
5. sudo chmod 777 /mnt/nfs_share/
6. echo "/mnt/nfs_share *(rw,sync,no_subtree_check,insecure)" | sudo tee -a /etc/exports
7. sudo exportfs -a
8. sudo systemctl restart nfs-kernel-server

## NFS Client (Ubuntu)

1. sudo apt update
2. sudo apt install nfs-common
3. sudo mkdir -p /mnt/nfs_clientshare
4. sudo mount -t nfs 64.227.130.179:/mnt/nfs_share ./nfs_clientshare
5. ls -l /mnt/nfs_clientshare/

## NFS Client (MacOS)

1. mkdir nfs_clientshare
2. sudo mount -o nolocks -t nfs 64.227.130.179:/mnt/nfs_share ./nfs_clientshare

cd usr/share/nginx/html

sudo cp -R prerequsite/* ../nfs_clientshare


ssh root@64.227.130.179


mAjed2377@a


doctl kubernetes cluster kubeconfig save 51b02083-d832-4b06-a40e-3ced770409e7

dop_v1_3f4f745fda492a632c61d195056efef17717d27b90c17ae3dd0a432714729377