#!/bin/bash
set -e

# ======= 設定 =======
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
ECR_REPO_NAME="chatbot-api-repo"
IMAGE_TAG="latest"
LAMBDA_FUNCTION_NAME="chatbot-api"
LAMBDA_TIMEOUT=30
LAMBDA_MEMORY=256

echo "AWS_ACCOUNT_ID: $AWS_ACCOUNT_ID"
echo "リージョン: $AWS_REGION"

# ======= ECRリポジトリの確認 =======
echo "ECRリポジトリ '$ECR_REPO_NAME' の存在確認中..."
if ! aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo "リポジトリが存在しません。作成します..."
    aws ecr create-repository --repository-name "$ECR_REPO_NAME" --region "$AWS_REGION"
fi

# ======= ECRにログイン =======
echo "ECRにログイン中..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# poetry からrequirements.txt を生成
echo "requirements.txt を生成中..."
poetry export -f requirements.txt --output requirements.txt --without-hashes

# ======= Dockerイメージのビルド =======
echo "Dockerイメージをビルド中..."
docker build --platform linux/amd64 -t "$ECR_REPO_NAME:$IMAGE_TAG" .

# ======= タグ付けとプッシュ =======
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG"
echo "イメージURI: $IMAGE_URI"
docker tag "$ECR_REPO_NAME:$IMAGE_TAG" "$IMAGE_URI"

echo "イメージをECRにプッシュ中..."
docker push "$IMAGE_URI"

# ======= Lambda関数の存在チェック＆デプロイ =======
echo "Lambda関数 '$LAMBDA_FUNCTION_NAME' の存在確認中..."
if aws lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo "Lambda関数が存在するため、更新を実施します..."
    aws lambda update-function-code \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --image-uri "$IMAGE_URI" \
        --region "$AWS_REGION"
else
    echo "Lambda関数が存在しません。新規作成を実施します..."
    echo "Lambda実行用のIAMロールARNを入力してください:"
    read -r ROLE_ARN
    aws lambda create-function \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --package-type Image \
        --code ImageUri="$IMAGE_URI" \
        --role "$ROLE_ARN" \
        --timeout "$LAMBDA_TIMEOUT" \
        --memory-size "$LAMBDA_MEMORY" \
        --region "$AWS_REGION"
fi

echo "デプロイ完了！"