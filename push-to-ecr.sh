#!/bin/bash

# 项目配置
AWS_REGION="ap-southeast-2"
AWS_ACCOUNT_ID="010438490706"
ECR_REPO="liedin-repo"
IMAGE_NAME="liedin-app"
TAG="latest"

echo "Using AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID, REGION=$AWS_REGION, REPO=$ECR_REPO, IMAGE=$IMAGE_NAME:$TAG"

# 校验变量
if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$AWS_REGION" ] || [ -z "$ECR_REPO" ] || [ -z "$IMAGE_NAME" ]; then
  echo "❌ 环境变量未正确设置，退出。"
  exit 1
fi

# 登录 ECR
aws ecr get-login-password --region $AWS_REGION | \
docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 构建镜像
docker build -t $IMAGE_NAME .

# 创建 ECR repo（如果不存在）
aws ecr describe-repositories --repository-names "$ECR_REPO" --region $AWS_REGION > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "📦 创建 ECR 仓库 $ECR_REPO"
  aws ecr create-repository --repository-name "$ECR_REPO" --region $AWS_REGION
else
  echo "📦 仓库已存在，跳过创建"
fi

# 镜像标记与推送
docker tag $IMAGE_NAME:$TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$TAG
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$TAG

echo "✅ 镜像已成功推送至 ECR！"