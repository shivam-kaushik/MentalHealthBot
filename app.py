
from chalice import Chalice, Response
import boto3
import json
from datetime import datetime
from openai import OpenAI
import os

app = Chalice(app_name='mental-health-assistant')
app.api.cors = True

# AWS Clients
s3 = boto3.client('s3', region_name="us-east-1")
comprehend = boto3.client('comprehend', region_name="us-east-1")
bucket_name = "mental-health-assistant-logs"

# OpenAI Setup
client = OpenAI(api_key="test_api_key")

def get_chat_history(user_id, limit=100):
    try:
        key = f"users/{user_id}/chat_log.json"
        response = s3.get_object(Bucket=bucket_name, Key=key)
        history = json.loads(response['Body'].read().decode('utf-8'))
        
        # Also load mood logs for additional context
        mood_logs = []
        objects = s3.list_objects_v2(Bucket=bucket_name, Prefix=f"users/{user_id}/log_")
        for obj in objects.get('Contents', []):
            response = s3.get_object(Bucket=bucket_name, Key=obj['Key'])
            log = json.loads(response['Body'].read().decode('utf-8'))
            mood_logs.append(log)
        
        return {
            'chat_history': history[-limit:],
            'mood_context': mood_logs[-limit:]
        }
    except s3.exceptions.NoSuchKey:
        return {'chat_history': [], 'mood_context': []}
    except Exception as e:
        print("Error loading chat history:", e)
        return {'chat_history': [], 'mood_context': []}

def save_chat_history(user_id, user_msg, bot_msg):
    try:
        key = f"users/{user_id}/chat_log.json"
        history = get_chat_history(user_id, limit=1000)['chat_history']
        
        if not history or history[-1]['user'] != user_msg or history[-1]['bot'] != bot_msg:
            history.append({"user": user_msg, "bot": bot_msg})
            s3.put_object(Bucket=bucket_name, Key=key, Body=json.dumps(history))
    except Exception as e:
        print("Error saving chat history:", e)

@app.route('/mood-trends', methods=['GET'])
def get_mood_trends():
    user_id = app.current_request.query_params.get('user_id', 'anonymous')
    if not user_id or user_id == 'anonymous':
        return Response(body={"error": "User ID required"},
                       status_code=400)
        
    try:
        results = s3.list_objects_v2(Bucket=bucket_name, Prefix=f"users/{user_id}/log_")
        logs = []
        for obj in results.get('Contents', []):
            key = obj['Key']
            res = s3.get_object(Bucket=bucket_name, Key=key)
            log = json.loads(res['Body'].read().decode('utf-8'))
            logs.append({
                'timestamp': log['timestamp'],
                'sentiment': log['sentiment'],
                'confidence': log['confidence'],
                'user_name': log.get('user_name', 'Anonymous')
            })

        return logs
    except Exception as e:
        return Response(body={"error": str(e)},
                       status_code=500)

@app.route('/mood-history', methods=['GET'])
def get_mood_history():
    user_id = app.current_request.query_params.get('user_id', 'anonymous')
    if not user_id or user_id == 'anonymous':
        return {'status': 'error', 'message': 'User ID required'}, 400
    
    try:
        objects = s3.list_objects_v2(Bucket=bucket_name, Prefix=f"users/{user_id}/log_")
        
        mood_data = []
        for obj in objects.get('Contents', []):
            response = s3.get_object(Bucket=bucket_name, Key=obj['Key'])
            log = json.loads(response['Body'].read().decode('utf-8'))
            
            mood_data.append({
                'timestamp': log['timestamp'],
                'sentiment': log['sentiment'],
                'confidence': log['confidence'],
                'user_name': log.get('user_name', 'Anonymous')
            })
        
        mood_data.sort(key=lambda x: x['timestamp'])
        
        return {
            'status': 'success',
            'data': mood_data
        }
    
    except Exception as e:
        print("Error fetching mood history:", e)
        return Response(body={
            'status': 'error',
            'message': str(e)
        }, status_code=500)

@app.route('/load-chat', methods=['GET'])
def load_chat():
    user_id = app.current_request.query_params.get('user_id', 'anonymous')
    if not user_id or user_id == 'anonymous':
        return {'status': 'error', 'message': 'User ID required'}, 400
    
    try:
        history = get_chat_history(user_id, limit=1000)
        return {
            'status': 'success',
            'chat_history': history['chat_history'],
            'mood_context': history['mood_context']
        }
    except Exception as e:
        print("Error loading chat:", e)
        return Response(body={
            'status': 'error',
            'message': str(e)
        }, status_code=500)

@app.route('/analyze', methods=['POST'])
def analyze_mood():
    data = app.current_request.json_body
    conversation_history = data.get('history', [])
    user_id = data.get('user_id', 'anonymous')
    user_name = data.get('user_name', 'Anonymous')
    user_input = data.get('user_input')
    bot_response = data.get('bot_response')

    if user_input and bot_response:
        latest_user_message = user_input
    else:
        latest_user_message = next(
            (msg['content'] for msg in reversed(conversation_history) if msg['role'] == 'user'), 
            None
        )

    if not latest_user_message:
        return {
            "gpt_reply": "I didn't catch anything from you yet. Want to start again? 😊",
            "sentiment": "neutral",
            "confidence": 0.0
        }, 400

    result = comprehend.detect_sentiment(Text=latest_user_message, LanguageCode='en')
    sentiment = result['Sentiment']
    confidence = round(result['SentimentScore'][sentiment.capitalize()], 2)

    mood_log = {
        'timestamp': datetime.utcnow().isoformat(),
        'user_id': user_id,
        'user_name': user_name,
        'input': latest_user_message,
        'response': bot_response if bot_response else None,
        'sentiment': sentiment,
        'confidence': confidence,
        'history': conversation_history
    }

    log_key = f"users/{user_id}/log_{datetime.utcnow().isoformat()}.json"
    s3.put_object(Bucket=bucket_name, Key=log_key, Body=json.dumps(mood_log))

    if bot_response:
        return {
            'sentiment': sentiment,
            'confidence': confidence
        }

    messages = [{
        "role": "system",
        "content": f"You are a friendly, empathetic assistant talking to {user_name}. You remember previous conversations. Always add emojis to your responses to make them feel warm, supportive, and engaging. Always add some motivational quotes to inspire."
    }] + conversation_history

    chat_response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=200,
        temperature=0.8
    )
    gpt_reply = chat_response.choices[0].message.content

    save_chat_history(user_id, latest_user_message, gpt_reply)

    return {
        'sentiment': sentiment,
        'confidence': confidence,
        'gpt_reply': gpt_reply
    }