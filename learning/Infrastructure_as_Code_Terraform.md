# 🏗️ INFRASTRUCTURE AS CODE (IaC): TERRAFORM & CLOUD-NATIVE

> [!TIP] > **Infrastructure as Code (IaC)** allows you to manage and provision data centers through machine-readable definition files, rather than physical hardware configuration or interactive configuration tools.

---

## 🏛️ 1. WHY IaC?

- **Reproducibility**: Create identical environments (Dev, Staging, Prod).
- **Versioning**: Track infrastructure changes in Git.
- **Automation**: Deploy entire clusters with a single command.
- **Speed**: Provision 1,000 servers as fast as 1.

---

## 🛠️ 2. TERRAFORM FUNDAMENTALS (HCL)

Terraform uses **HashiCorp Configuration Language (HCL)**.

### 2.1 The Core Workflow

1.  **Write**: Define infrastructure in `.tf` files.
2.  **Init**: `terraform init` (Downloads providers like AWS, Azure, Google Cloud).
3.  **Plan**: `terraform plan` (Preview changes).
4.  **Apply**: `terraform apply` (Actually create the resources).

### 2.2 Basic Example

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "LearningHub-Server"
  }
}
```

---

## 🧩 3. STATE MANAGEMENT

Terraform keeps track of your infrastructure in a **State File** (`terraform.tfstate`).

- **Remote State**: Store state in S3 or Terraform Cloud to enable team collaboration.
- **State Locking**: Prevents two people from modifying infrastructure at the same time.

---

## 🏗️ 4. CLOUD-NATIVE ARCHITECTURE (Kubernetes)

While Terraform provisions the _Infrastructure_, **Kubernetes (K8s)** manages the _Containers_.

- **Pod**: The smallest deployable unit.
- **Service**: Exposes a set of Pods as a network service.
- **Ingress**: Manages external access to services (HTTP/HTTPS).
- **Helm**: The package manager for Kubernetes.

---

## 🎓 CONCEPT: IMMUTABLE INFRASTRUCTURE

Instead of patching existing servers (Mutable), you replace them entirely with new ones from a common image (Immutable). This eliminates "Configuration Drift."

---

## 🚀 ADVANCED: GitOps

Using Git as the single source of truth for infrastructure and applications. (Tools: ArgoCD, Flux).
