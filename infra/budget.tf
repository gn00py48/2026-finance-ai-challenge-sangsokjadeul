# 예산은 계정 2개까지 무료다. 사용을 막지 않고 알리기만 한다. 중지가 필요하면 terraform destroy를 실행한다.
#
# 태그로 범위를 좁히지 않고 계정 전체를 본다. 태그 기준 예산은 결제 콘솔에서 Project를
# 비용 할당 태그로 활성화해야 집계되고 반영에 최대 24시간이 걸리는데, 활성화를 빠뜨리면
# 0원으로 집계되어 알림이 영영 오지 않는다. 조용히 실패하는 쪽보다 계정 전체를 보는 편이 낫다.
resource "aws_budgets_budget" "monthly" {
  count = var.budget_alert_email == "" ? 0 : 1

  name         = "${var.project}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # 실제 사용액이 80%에 닿았을 때
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  # 이번 달 예상 사용액이 예산을 넘길 때. 실제로 넘기기 전에 미리 온다.
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}
