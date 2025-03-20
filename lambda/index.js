// lambda/index.js
const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");

// Lambda実行環境から自動的にリージョンを取得
const bedrockClient = new BedrockRuntimeClient();

// モデルIDはCDKスタックから環境変数として提供される
const MODEL_ID = process.env.MODEL_ID || 'amazon.nova-lite-v1:0'; // デフォルト値を設定

exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event));
    
    // リクエストボディの解析
    const body = JSON.parse(event.body);
    const { message, conversationHistory = [] } = body;    

    console.log("Processing message:", message);
    console.log("Using model:", MODEL_ID);

    // 会話履歴を使用（提供された場合）
    let messages = [...conversationHistory];
    
    // ユーザーメッセージを追加
    messages.push({
      role: "user",
      content: message
    });

    // Bedrockの会話履歴フォーマットに変換
    const bedrockMessages = messages.map(msg => ({
      role: msg.role,
      content: [
        {
          text: msg.content
        }
      ]
    }));

    // 最新のユーザーメッセージのみを送信
    // (履歴は会話IDで管理される場合)
    const latestUserMessage = bedrockMessages.filter(msg => msg.role === "user").pop();
    
    // 会話IDを取得（存在する場合）
    const conversationId = body.conversationId || null;
    const messageId = body.messageId || null;

    // Converse API パラメータ設定
    const converseParams = {
      modelId: MODEL_ID,
      
      // 会話IDとメッセージIDが提供されている場合は含める（会話の継続）
      ...(conversationId && { conversationId }),
      ...(messageId && { parentMessageId: messageId }),
      
      // 会話履歴がない場合は最新のユーザーメッセージのみ、
      // 会話IDがない場合は完全な会話履歴を送信
      messages: conversationId ? [latestUserMessage] : bedrockMessages,
      
      // システムプロンプト
      systemPrompt: {
        text: "You are an AI assistant helping users in chat."
      },
      
      // 設定パラメータ
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.7,
        topP: 0.9
      }
    };
    
    console.log("Calling Bedrock Converse API with parameters:", JSON.stringify(converseParams));
    
    // Converse API 呼び出し - 修正済み
    const command = new ConverseCommand(converseParams);
    const response = await bedrockClient.send(command);
    
    console.log("Bedrock Converse response:", JSON.stringify(response));
    
    // 応答の検証
    if (!response.output || !response.output.message || !response.output.message.content) {
      throw new Error("No response content from the model");
    }
    
    // アシスタントの応答を取得
    const assistantResponse = response.output.message.content[0].text;
    
    // アシスタントの応答を会話履歴に追加
    messages.push({
      role: "assistant",
      content: assistantResponse
    });
    
    // 成功レスポンスの返却
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        response: assistantResponse,
        conversationId: response.conversationId,
        messageId: response.messageId,
        conversationHistory: messages  // 更新された会話履歴を返す
      })
    };
  } catch (error) {
    console.error("Error:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};