# lambda/index.py
import json
import os
import requests # boto3, re, ClientErrorは不要になったため削除し、requestsを追加

# 環境変数からFastAPIのエンドポイントURLを取得
FASTAPI_ENDPOINT_URL = os.environ.get('https://a447-34-125-216-184.ngrok-free.app/')

# FastAPIへのリクエストタイムアウト（秒）
REQUEST_TIMEOUT = 30 # 必要に応じて調整

# Bedrock関連の変数と関数は不要になったため削除
# bedrock_client = None
# MODEL_ID = ...
# extract_region_from_arn(...)

def lambda_handler(event, context):
    # --- [変更なし] リクエストとユーザー情報の処理 ---
    try:
        print("Received event:", json.dumps(event))

        # Cognitoで認証されたユーザー情報を取得 (存在する場合)
        user_info = None
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            # Cognitoユーザープールオーソライザーの場合
            if 'claims' in event['requestContext']['authorizer']:
                user_info = event['requestContext']['authorizer']['claims']
                print(f"Authenticated user: {user_info.get('email') or user_info.get('cognito:username')}")
            # IAMオーソライザーの場合など、他の形式も考慮可能
            # elif 'principalId' in event['requestContext']['authorizer']:
            #     user_info = {'principalId': event['requestContext']['authorizer']['principalId']}
            #     print(f"Authenticated principalId: {user_info['principalId']}")

        # リクエストボディの解析
        try:
            if isinstance(event.get('body'), str):
                body = json.loads(event['body'])
            else:
                body = event.get('body', {}) # HTTP API v2 や直接呼び出しの場合
        except json.JSONDecodeError:
             print("Error decoding JSON body.")
             raise ValueError("Invalid JSON format in request body") # エラーを発生させて下のcatchで処理

        if not body or 'message' not in body:
            raise ValueError("Request body must contain a 'message' field.")

        message = body['message']
        # クライアントから送られてきた会話履歴を取得 (なければ空リスト)
        conversation_history = body.get('conversationHistory', [])

        print(f"Processing message: '{message}'")
        print(f"Received conversation history length: {len(conversation_history)}")

        # --- [変更箇所] Bedrock呼び出しの代わりにFastAPIを呼び出す ---

        if not FASTAPI_ENDPOINT_URL:
            print("Error: FASTAPI_ENDPOINT_URL environment variable is not set.")
            raise EnvironmentError("FastAPI endpoint URL is not configured.")

        # FastAPIに送信するペイロードを作成
        # FastAPI側が 'message' と 'conversationHistory' を受け取ることを想定
        payload_to_fastapi = {
            'message': message,
            'conversationHistory': conversation_history
            # 必要に応じて、FastAPIが期待する他の情報（ユーザー情報など）を追加できます
            # 'userInfo': user_info # 例：ユーザー情報を渡す場合
        }

        # ヘッダー (認証なし)
        headers = {
            'Content-Type': 'application/json'
        }

        print(f"Calling FastAPI endpoint: {FASTAPI_ENDPOINT_URL}")
        # print(f"Sending payload to FastAPI: {json.dumps(payload_to_fastapi)}") # デバッグ用

        # FastAPIにPOSTリクエストを送信
        try:
            response = requests.post(
                FASTAPI_ENDPOINT_URL,
                json=payload_to_fastapi,
                headers=headers,
                timeout=REQUEST_TIMEOUT
            )

            # FastAPIからのエラー応答 (4xx, 5xx) をチェック
            response.raise_for_status()

            # FastAPIからの応答 (JSON) を取得
            fastapi_response_data = response.json()
            print(f"Received response from FastAPI: {fastapi_response_data}")

            # FastAPIからの応答からアシスタントの返信を取得
            # FastAPI側が 'result' というキーで応答を返すことを期待
            assistant_response = fastapi_response_data.get('result')
            if assistant_response is None:
                # FastAPIが期待通りの応答を返さなかった場合
                print("Error: 'result' key not found in FastAPI response.")
                raise ValueError("Invalid response format received from FastAPI.")

        except requests.exceptions.Timeout:
            print(f"Error: Request to FastAPI timed out after {REQUEST_TIMEOUT} seconds.")
            # タイムアウトエラーとして処理 (504 Gateway Timeout)
            return {
                "statusCode": 504,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*", # CORSヘッダー
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST"
                },
                "body": json.dumps({
                    "success": False,
                    "error": "The request to the backend service timed out."
                })
            }
        except requests.exceptions.RequestException as req_err:
            # ネットワークエラー、FastAPIからのエラー応答 
            error_message = f"Failed to communicate with the backend service: {req_err}"
            status_code = 502 # Bad Gateway (デフォルト)
            detail = str(req_err)
            if req_err.response is not None:
                status_code = req_err.response.status_code
                try:
                    detail = req_err.response.json() # FastAPIのエラー詳細を試みる
                except json.JSONDecodeError:
                    detail = req_err.response.text # JSONでなければテキスト

            print(f"Error calling FastAPI endpoint: Status={status_code}, Detail={detail}")
            # FastAPIエラーとして処理 (502 Bad Gateway or FastAPIのステータスコード)
            return {
                "statusCode": status_code,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*", # CORSヘッダー
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST"
                },
                "body": json.dumps({
                    "success": False,
                    "error": "Backend service error",
                    "detail": detail
                })
            }

        # --- [変更箇所] 会話履歴の更新 ---
        # 元の会話履歴をコピーして新しいやり取りを追加
        messages = conversation_history.copy()
        messages.append({
            "role": "user",
            "content": message
        })
        messages.append({
            "role": "assistant",
            "content": assistant_response # FastAPIからの応答を使用
        })

        # --- [変更なし] 成功レスポンスの返却 ---
        print("Successfully processed request.")
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", # CORSヘッダーは維持
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            "body": json.dumps({
                "success": True,
                "response": assistant_response, # FastAPIからの応答
                "conversationHistory": messages # 更新された会話履歴
            })
        }

    # --- [変更なし] 全体的なエラーハンドリング ---
    except (ValueError, EnvironmentError, Exception) as error:
        error_type = type(error).__name__
        error_message = str(error)
        print(f"Error ({error_type}): {error_message}")

        status_code = 400 if isinstance(error, (ValueError, json.JSONDecodeError)) else 500

        return {
            "statusCode": status_code,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", # CORSヘッダー
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            "body": json.dumps({
                "success": False,
                "error": error_message,
                "errorType": error_type
            })
        }
     
        
     
 
