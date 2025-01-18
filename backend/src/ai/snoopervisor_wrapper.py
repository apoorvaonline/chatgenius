import sys
import json
from snoopervisor_rag import index_message, query_messages

def handle_command():
    """Handle commands from Node.js"""
    if len(sys.argv) < 2:
        print("Error: No command provided")
        sys.exit(1)
        
    command = sys.argv[1]
    
    try:
        if command == "index":
            # Handle message indexing
            if len(sys.argv) < 3:
                print("Error: No message data provided")
                sys.exit(1)
            
            message_data = json.loads(sys.argv[2])
            success = index_message(message_data)
            print(json.dumps({"success": success}))
            
        elif command == "query":
            # Handle message querying
            if len(sys.argv) < 5:
                print("Error: Missing query, channel access data, or user ID")
                sys.exit(1)
                
            query = sys.argv[2]
            user_accessible_channels = json.loads(sys.argv[3])
            user_id = sys.argv[4]
            
            result = query_messages(query, user_accessible_channels, user_id)
            # Ensure consistent response format
            if isinstance(result, str):
                response = {"response": result}
            elif isinstance(result, dict) and "response" in result:
                response = result
            else:
                response = {"response": str(result)}
                
            print(json.dumps(response))
            
        else:
            print(f"Error: Unknown command {command}")
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    handle_command() 