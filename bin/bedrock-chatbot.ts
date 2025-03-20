#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BedrockChatbotStack } from '../lib/bedrock-chatbot-stack';

const app = new cdk.App();

// デプロイ時にモデルIDを指定できるようにする
//const modelId = app.node.tryGetContext('modelId') || 'amazon.nova-lite-v1:0';
const modelId = app.node.tryGetContext('modelId') || 'anthropic.claude-3-haiku-20240307-v1:0';

new BedrockChatbotStack(app, 'BedrockChatbotStack', {
  /* 必要に応じてスタックプロパティを設定 */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
});
