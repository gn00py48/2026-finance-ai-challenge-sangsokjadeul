variable "aws_region" {
  description = "배포 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "project" {
  description = "리소스 이름 접두사"
  type        = string
  default     = "sangsok"
}

variable "instance_type" {
  description = "EC2 인스턴스 타입. JVM + Postgres + tesseract를 함께 돌리므로 2GB 미만은 권장하지 않는다."
  type        = string
  default     = "t4g.small"
}

variable "root_volume_gb" {
  description = "루트 EBS 크기(GB). 문서는 S3에 있으므로 DB와 이미지 용량만 고려한다."
  type        = number
  default     = 20
}

variable "ssh_key_name" {
  description = "SSH 키페어 이름. 비우면 22번 포트를 열지 않고 SSM Session Manager로만 접속한다."
  type        = string
  default     = ""
}

variable "ssh_cidr" {
  description = "22번 포트를 허용할 CIDR. ssh_key_name이 있을 때만 사용한다."
  type        = string
  default     = "0.0.0.0/0"
}

variable "bucket_name" {
  description = "문서 저장 S3 버킷 이름. 전역에서 고유해야 한다."
  type        = string
}

variable "monthly_budget_usd" {
  description = "월 예산(USD). 실제 사용액이 이 값의 80%와 100%에 닿으면 메일이 온다."
  type        = number
  default     = 25
}

variable "budget_alert_email" {
  description = "예산 알림을 받을 주소. 비우면 예산을 만들지 않는다."
  type        = string
  default     = ""
}
