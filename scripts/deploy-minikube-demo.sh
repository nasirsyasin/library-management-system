#!/bin/sh
set -eu

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
secret_file="$root_dir/k8s/minikube-demo-secrets.yaml"

if ! command -v minikube >/dev/null 2>&1 || ! minikube status -p minikube >/dev/null 2>&1; then
  echo "Start Minikube first with: minikube start" >&2
  exit 1
fi

context=$(kubectl config current-context)
if [ "$context" != "minikube" ]; then
  echo "Current Kubernetes context is '$context'. Switch explicitly with: kubectl config use-context minikube" >&2
  exit 1
fi

if [ ! -f "$secret_file" ]; then
  echo "Create the private Secret file from k8s/minikube-demo-secrets.example.yaml and replace every placeholder." >&2
  exit 1
fi

if grep -q 'REPLACE_' "$secret_file"; then
  echo "The private Minikube Secret still contains placeholders; replace them before deployment." >&2
  exit 1
fi

kubectl apply -f "$root_dir/k8s/minikube-demo-namespace.yaml"
kubectl apply -f "$secret_file"
kubectl apply -f "$root_dir/k8s/minikube-demo.yaml"

for deployment in catalog-db borrow-db reservation-db identity-db catalog-service reservation-service borrow-service api-gateway frontend; do
  kubectl rollout status "deployment/$deployment" -n library-demo --timeout=10m
done

kubectl get pods,services,persistentvolumeclaims -n library-demo
