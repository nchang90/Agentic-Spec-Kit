variable "subscription_id" {
  type        = string
  description = "Target Azure subscription. Sourced from ARM_SUBSCRIPTION_ID."
}

variable "location" {
  type        = string
  description = "Deployment region. Declared once; never repeated in a module block."
  default     = "westus"
}

variable "environment" {
  type        = string
  description = "Environment name, used in resource naming and tags."
  default     = "demo"
}

variable "owner" {
  type        = string
  description = "Owning team or individual, applied as a tag."
}

variable "expires_on" {
  type        = string
  description = "Review-or-delete date, applied as a tag. Principle V."
}
