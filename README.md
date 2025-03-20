# Bedrock チャットボット

AWS Bedrock のLLM モデルを使用した、Basic 認証付きのチャットボットアプリケーションです。CDK を使用してインフラストラクチャをコードとして管理しています。

## 機能

- Amazon Nova モデルを使用したテキスト生成
- 会話履歴の保持（ブラウザのローカルストレージを使用）
- API Gateway の Basic 認証によるセキュリティ保護
- レスポンシブデザインのユーザーインターフェース
- CloudFront + S3 によるフロントエンドのホスティング

## アーキテクチャ

- フロントエンド: React アプリケーション (S3 + CloudFront でホスティング)
- バックエンド: API Gateway + Lambda
- AI モデル: Amazon Bedrock の Nova Lite 
- トップ画面: Basic 認証

## 前提条件

- AWS アカウント
- AWS CLI がインストールされ、設定済み
- Node.js v14 以上
- AWS CDK v2 がインストール済み
- Amazon Bedrock へのアクセス権限と Nova lite モデルの有効化

## セットアップと展開

### 1. リポジトリのクローン

$ git clone https://github.com/keisskaws/simplechat.git <br>
$ cd simplechat

### 2. 依存関係のインストール

# CDKプロジェクトの依存関係をインストール

$ npm install

# Lambda関数の依存関係をインストール

$ cd lambda <br>
$ npm install <br>
$ cd ..

# フロントエンドの依存関係をインストール

$ npx create-react-app frontend <br>
$ cp -pr frontend-tmp/src frontend/src <br>
$ cp -pr frontend-tmp/public frontend/public <br>
$ cp -pr frontend-tmp/.env frontend

### 4. フロントエンドのビルド

$ cd frontend <br>
$ npm install <br>
$ npm install axios <br>
$ npm run build <br>
$ cd ..

### 5. AWS CDK のブートストラップ（初回のみ）

$ cdk bootstrap

### 6. CDK スタックのデプロイ

# 環境変数を設定してデプロイ（Linux/macOS）

$ cdk deploy

### 7. フロントエンドの設定更新とデプロイ

デプロイ後に表示された OutputsのBedrockChatbotStack.ApiGatewayURLを確認し .env ファイルを更新:
*************************************************************************************************
Outputs:
BedrockChatbotStack.ApiGatewayURL = https://yyyyyyyyy.execute-api.us-east-1.amazonaws.com/prod/
BedrockChatbotStack.ChatbotApiEndpointAA2295B0 = https://yyyyyyyy.execute-api.us-east-1.amazonaws.com/prod/
BedrockChatbotStack.CloudFrontURL = https://xxxxxxxxx.cloudfront.net
BedrockChatbotStack.ModelId = amazon.nova-lite-v1:0
*************************************************************************************************

$ cd frontend

# .env ファイルを編集して API エンドポイントを更新(BedrockChatbotStack.ApiGatewayURL)

$ vi .env <br>
REACT_APP_API_ENDPOINT=https://yyyyyyyyy.execute-api.us-east-1.amazonaws.com/prod/

$ npm run build <br>
$ cd .. <br>
$ cdk deploy <br>

## 使用方法

1. デプロイ後に表示された BedrockChatbotStack.CloudFrontURL  にアクセス
2. チャットボックスにメッセージを入力
3. Amazon Nova lite からの応答を受け取る
4. 会話履歴はブラウザのローカルストレージに保存され、ページを再読み込みしても維持
5. 「会話をクリア」ボタンをクリックして会話履歴をリセット

## カスタマイズ

### モデルの変更

lambda/index.js ファイルの MODEL_ID 変数を変更することで、別の Bedrock モデルを使用できます：

const MODEL_ID = process.env.MODEL_ID || 'amazon.nova-lite-v1:0';

### 認証情報の変更

認証情報は変数として設定されています。デプロイ時に変更できます：

### フロントエンドのカスタマイズ

フロントエンドは React アプリケーションとして実装されています。frontend/src ディレクトリ内のファイルを編集してカスタマイズできます。

## セキュリティ上の考慮事項

- 本番環境では、認証情報を環境変数ではなく AWS Secrets Manager などのサービスを使用して管理することを検討してください
- API Gateway と CloudFront のキャッシュ設定を適切に行い、パフォーマンスとコストのバランスを取ることが重要です
- フロントエンドの変数はビルド時に埋め込まれるため、変更するには再ビルドが必要です

## クリーンアップ

不要になったリソースを削除するには：

$ cdk destroy

### コスト

このアプリケーションは以下の AWS サービスを使用し、それぞれに料金が発生する可能性があります：

- Amazon Bedrock (Nova lite モデルの使用料)
- AWS Lambda (関数の実行時間)
- Amazon API Gateway (API コール)
- Amazon S3 (ストレージとデータ転送)
- Amazon CloudFront (データ転送)

使用量に応じて料金が発生するため、不要な場合はリソースを削除することをお勧めします。

## トラブルシューティング

### API エラー
- API Gateway のログを確認
- Lambda 関数のログを CloudWatch Logs で確認
- CORS 設定が正しいことを確認

### 認証エラー
- Basic 認証のユーザー名とパスワードが正しいことを確認

### モデルエラー
- Bedrock モデルが有効化されていることを確認
- Lambda 関数に適切な IAM 権限があることを確認

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 謝辞

- AWS CDK
- Amazon Bedrock
- React

---

このプロジェクトは AWS のサービスを使用していますが、AWS によって公式にサポートまたは推奨されているものではありません。

