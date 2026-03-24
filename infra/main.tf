terraform {
  required_version = ">= 1.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.0"
    }
    turso = {
      source  = "jpedroh/turso"
      version = "~> 0.3"
    }
  }
}

# ── Providers ──────────────────────────────────────────────────────────────────

provider "vercel" {
  # Uses VERCEL_API_TOKEN env var
}

provider "turso" {
  api_token = var.turso_api_token
}

# ── Variables ──────────────────────────────────────────────────────────────────

variable "turso_api_token" {
  description = "Turso platform API token"
  type        = string
  sensitive   = true
}

variable "turso_org" {
  description = "Turso organization name"
  type        = string
}

variable "github_repo" {
  description = "GitHub repo in owner/name format"
  type        = string
  default     = "CharlieQNguyen/pokemon-labeling"
}

variable "project_name" {
  description = "Vercel project name"
  type        = string
  default     = "pokemon-labeling"
}

# ── Turso Database ─────────────────────────────────────────────────────────────

# Turso DB is managed manually (created via CLI, seeded via script).
# We use a data-like pattern: reference the hostname directly.
locals {
  turso_hostname = "pokemon-labeling-${var.turso_org}.aws-us-east-1.turso.io"
}

# ── Vercel Project ─────────────────────────────────────────────────────────────

resource "vercel_project" "app" {
  name      = var.project_name
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = var.github_repo
  }

  root_directory = "webapp"

  build_command   = "npm run build"
  output_directory = ".next"
}

# ── Environment Variables ──────────────────────────────────────────────────────

resource "vercel_project_environment_variable" "turso_url" {
  project_id = vercel_project.app.id
  key        = "TURSO_DATABASE_URL"
  value      = "libsql://${local.turso_hostname}"
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "turso_token" {
  project_id = vercel_project.app.id
  key        = "TURSO_AUTH_TOKEN"
  value      = var.turso_db_token
  target     = ["production", "preview"]
  sensitive  = true
}

variable "turso_db_token" {
  description = "Turso database auth token (create with: turso db tokens create pokemon-labeling)"
  type        = string
  sensitive   = true
}

# ── Outputs ────────────────────────────────────────────────────────────────────

output "vercel_project_id" {
  value = vercel_project.app.id
}

output "turso_database_hostname" {
  value = local.turso_hostname
}

output "vercel_url" {
  value = "https://${var.project_name}.vercel.app"
}
