# SSM Parameter for OpenAI API Key
resource "aws_ssm_parameter" "openai_api_key" {
  name  = "/${local.name_prefix}/openai/api-key"
  type  = "SecureString"
  value = "PLACEHOLDER_OPENAI_API_KEY"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

# SSM Parameter for Anthropic API Key
resource "aws_ssm_parameter" "anthropic_api_key" {
  name  = "/${local.name_prefix}/anthropic/api-key"
  type  = "SecureString"
  value = "PLACEHOLDER_ANTHROPIC_API_KEY"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

# IAM Policy for ECS tasks to access SSM parameters
resource "aws_iam_policy" "ecs_ssm_access" {
  name        = "${local.name_prefix}-ecs-ssm-access"
  description = "Allow ECS tasks to access SSM parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          aws_ssm_parameter.openai_api_key.arn,
          aws_ssm_parameter.anthropic_api_key.arn,
          aws_ssm_parameter.db_password.arn
        ]
      }
    ]
  })

  tags = local.common_tags
}

# Attach SSM policy to ECS task execution role
resource "aws_iam_role_policy_attachment" "ecs_task_execution_ssm" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.ecs_ssm_access.arn
}