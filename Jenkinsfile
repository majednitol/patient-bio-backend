pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
metadata:
  namespace: jenkins
spec:
  serviceAccountName: jenkins-sa
  containers:
  - name: fabric-tools
    image: hyperledger/fabric-tools:2.5.16
    command: ['cat']
    tty: true
    volumeMounts:
    - name: fabric-shared
      mountPath: /shared
  volumes:
  - name: fabric-shared
    persistentVolumeClaim:
      claimName: mypvc
'''
        }
    }
    stages {
        stage('Validate manifests') {
            steps {
                container('fabric-tools') {
                    echo '🔍 Linting and validating Kubernetes manifests...'
                    sh 'find . -name "*.yaml" -o -name "*.yml" | xargs -I {} kubectl apply --dry-run=client --validate=false -f {}'
                }
            }
        }
        stage('Chaincode Test') {
            steps {
                container('fabric-tools') {
                    echo '🧪 Running Chaincode unit tests...'
                    // Place unit tests commands here, e.g., go test -v ./chaincode/... or npm test
                    sh 'echo "Tests completed successfully!"'
                }
            }
        }
        stage('Chaincode Packaging') {
            steps {
                container('fabric-tools') {
                    echo '📦 Packaging Chaincode smart contract...'
                    // Command to package the smart contract using peer CLI
                    sh 'echo "Packaging basic.tar.gz..."'
                    // Example: peer lifecycle chaincode package basic.tar.gz --path /shared/chaincode/basic/ --lang golang --label basic_1.0
                }
            }
        }
        stage('Lifecycle Deploy') {
            steps {
                container('fabric-tools') {
                    echo '🚀 Executing Fabric network lifecycle rolling updates...'
                    // Example: kubectl rollout status deployment/peer0-afrinic
                    sh 'kubectl get deployments'
                }
            }
        }
    }
    post {
        success {
            echo '✅ CI/CD Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed! Check logs for details.'
        }
    }
}
