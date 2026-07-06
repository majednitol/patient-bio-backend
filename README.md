<<<<<<< HEAD
# 🏥 Patient Identity: Decentralized Healthcare Ecosystem
=======

i am nitol updated
>>>>>>> b24bb959aa8d531f53dd197bb2ebca17128dc465

[![Hyperledger Fabric](https://img.shields.io/badge/Blockchain-Hyperledger%20Fabric-blue.svg)](https://www.hyperledger.org/use/fabric)
[![Kubernetes](https://img.shields.io/badge/Orchestration-Kubernetes-blue.svg)](https://kubernetes.io/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A production-grade, blockchain-powered platform for secure patient identity management and medical record sharing. Built on **Hyperledger Fabric** and orchestrated with **Kubernetes**, this system enables seamless, audited data exchange between patients, doctors, laboratories, and government bodies across borders.

---

## 🏗️ High-Level Architecture

The system is designed as a multi-organization consortium network running on a Kubernetes cluster.

- **Consensus Layer**: Raft-based ordering service with 5 nodes for high availability and fault tolerance.
- **Organization Structure**:
  - **Admin**: Oversees system governance, analytics, and network health.
  - **Patient**: The primary owner of data; controls privacy settings and access grants.
  - **Doctor**: Authorized to view records, provide consultations, and issue digital prescriptions.
  - **Pathologist**: Manages laboratory results and clinical tests.
  - **Pharmacy**: Handles medication fulfillment and secure data access for research.
  - **GovernmentBody**: Sets national-level access policies and manages cross-border identity exchange.
- **Infrastructure**: Automated deployment on DigitalOcean or local K3s environments, utilizing Ingress-NGINX for secure TLS termination.

---

## 🛠️ Tech Stack

### Blockchain & Infrastructure
- **Hyperledger Fabric v2.4.9**: Core DLT with Go-based smart contracts (chaincode).
- **Kubernetes**: Container orchestration for all network components (Peers, Orderers, CAs).
- **Docker**: Containerization of microservices and chaincode environments.

### Backend (API Gateway)
- **Node.js & Express**: High-performance API gateway.
- **Fabric Gateway SDK**: Secure interaction with the blockchain network.
- **Auth**: JWT-based internal auth and Google OAuth2 integration.

### Frontend & Mobile
- **React 18 (Vite)**: Modern, responsive user interface.
- **TypeScript**: Type-safe development across the stack.
- **Tailwind CSS & Shadcn UI**: Premium, accessible design system.
- **Capacitor**: Cross-platform support for iOS, Android, and Web.
- **Supabase**: Efficient off-chain metadata storage and real-time features.

### Observability
- **Prometheus & Grafana**: Real-time metrics and system health monitoring.
- **Hyperledger Explorer**: Visual block explorer for transaction auditing.

---

## 🚀 Key Features

- **🌍 Cross-Border Governance**: Unique government-level access control allowing for international medical data portability.
- **🔒 RBAC (Role-Based Access Control)**: Granular permissions ensuring only authorized entities can access specific patient data.
- **📋 Holistic Patient Profiles**: Tracking height, blood type, chronic diseases, allergies, and genetic markers.
- **💊 Digital Prescriptions**: Immutable audit trails for all issued and fulfilled medications.
- **🔍 Global Role-Aware Search**: Powerful search capabilities tailored to the user's specific organization and permissions.
- **📱 QR-Driven Identity**: Fast and secure patient verification through integrated QR code scanning.

---

## 📂 Project Structure

| Directory | Description |
| :--- | :--- |
| `1-5` | Infrastructure setup: NFS, Certificate Authorities, TLS Certificates, Artifacts, and Orderer nodes. |
| `6-7` | Kubernetes ConfigMaps and Peer node deployments. |
| `8-9` | **Chaincode**: Go source code and deployment/packaging scripts. |
| `10.api` | **Backend**: Node.js Express server and Fabric SDK integration. |
| `11.ui` | UI deployment configurations. |
| `PatientBio...` | **Frontend**: Primary React/Vite application source code. |
| `12-14` | Observability & Networking: Hyperledger Explorer, Monitoring (Prometheus/Grafana), and Ingress. |
| `easy-setup` | Orchestration scripts for one-click network deployment. |

---

## ⚙️ Setup & Installation

### Prerequisites
- `kubectl` configured with your cluster.
- `doctl` (if deploying to DigitalOcean).
- `go v1.19+`, `node v18+`, `docker`.

### 1. Network Deployment
The entire network can be deployed using the automated scripts in the `easy-setup` directory:
```bash
cd easy-setup
./run.sh
```

### 2. Backend API Setup
Navigate to the API directory and start the server:
```bash
cd 10.api
npm install
node src/server.js
```

### 3. Frontend UI Setup
Start the development server for the UI:
```bash
cd "PatientBio new version"
bun install
bun dev
```

---

## 🛡️ Security & Governance

The platform leverages Hyperledger Fabric's robust security model:
- **Identity Management**: Each organization manages its own identities via dedicated Certificate Authorities (CAs).
- **Mutual TLS**: All communication between nodes and the API is encrypted via mTLS.
- **Data Privacy**: Patient data is protected via MSP (Membership Service Provider) configurations and chaincode-level access logic.

---

## 📈 Monitoring

Access system metrics and logs through the following services:
- **Grafana Dashboard**: `http://grafana.rono.com`
- **Hyperledger Explorer**: `http://explorer.rono.com`

---

## 📄 License
This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
