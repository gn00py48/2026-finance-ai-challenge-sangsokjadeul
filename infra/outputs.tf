output "public_ip" {
  description = "DuckDNS A 레코드에 넣을 고정 IP"
  value       = aws_eip.app.public_ip
}

output "bucket" {
  description = "문서 저장 버킷"
  value       = aws_s3_bucket.documents.bucket
}

output "instance_id" {
  description = "aws ssm start-session --target <id> 로 접속"
  value       = aws_instance.app.id
}
