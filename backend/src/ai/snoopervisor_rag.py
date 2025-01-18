from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain.prompts import PromptTemplate
from pinecone import Pinecone as PineconeClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import json
import re
import sys

# Load environment variables
load_dotenv()

SNOOPERVISOR_INDEX_NAME = "fv-messages"

def init_vectorstore():
    """Initialize and return the vector store for Snoopervisor"""
    try:
        pc = PineconeClient(api_key=os.getenv("PINECONE_API_KEY"))
        
        embeddings = OpenAIEmbeddings(
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        vectorstore = PineconeVectorStore(
            index=pc.Index(SNOOPERVISOR_INDEX_NAME),
            embedding=embeddings,
            text_key="text"
        )
        
        return vectorstore
    except Exception as e:
        print(f"Error initializing Snoopervisor vector store: {str(e)}")
        raise

def index_message(message_data):
    """Index a single message in Pinecone"""
    try:
        vectorstore = init_vectorstore()
        
        # Prepare metadata
        metadata = {
            "message_id": str(message_data["_id"]),
            "channel_id": str(message_data["channel"]),
            "channel_name": message_data["channelName"].lower(),
            "sender_id": str(message_data["sender"]),
            "sender_name": message_data["senderName"].lower(),
            "timestamp": message_data["timestamp"],
            "is_dm": message_data.get("isDM", False),
            "dm_participants": message_data.get("dmParticipants", []) if message_data.get("isDM", False) else []
        }
        
        # Add message to vector store
        vectorstore.add_texts(
            texts=[message_data["content"]],
            metadatas=[metadata]
        )
        
        return True
    except Exception as e:
        print(f"Error indexing message: {str(e)}")
        return False

def parse_query_scope(query):
    """Extract scope parameters from natural language query"""
    # Initialize ChatGPT to help parse the query
    llm = ChatOpenAI(
        temperature=0,
        model="gpt-4",
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )
    
    scope_prompt = """Extract search scope parameters from the following query. Return a JSON object with these fields:
    - channel_filter: Channel name or ID mentioned (null if none)
    - time_filter: Time range mentioned (null if none)
    - user_filter: User mentioned (null if none)
    - core_question: The actual question without scope specifications

    Query: {query}
    
    Return only the JSON object, nothing else."""
    
    response = llm.invoke(scope_prompt.format(query=query))
    return json.loads(response.content)

def parse_time_filter(time_filter):
    """Parse time filter string into datetime objects"""
    if not time_filter:
        return None, None
        
    # Common time expressions
    now = datetime.utcnow()
    
    # Last X hours/days/weeks
    if match := re.match(r'last (\d+) (hour|day|week)s?', time_filter.lower()):
        amount = int(match.group(1))
        unit = match.group(2)
        if unit == 'hour':
            start_time = now - timedelta(hours=amount)
        elif unit == 'day':
            start_time = now - timedelta(days=amount)
        elif unit == 'week':
            start_time = now - timedelta(weeks=amount)
        return start_time.isoformat(), now.isoformat()
    
    # Today
    if time_filter.lower() == 'today':
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start_time.isoformat(), now.isoformat()
    
    # Yesterday
    if time_filter.lower() == 'yesterday':
        start_time = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(days=1)
        return start_time.isoformat(), end_time.isoformat()
    
    # This week
    if time_filter.lower() == 'this week':
        start_time = now - timedelta(days=now.weekday())
        start_time = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
        return start_time.isoformat(), now.isoformat()
    
    return None, None

def query_messages(query, user_accessible_channels, user_id):
    """Query messages and generate a response"""
    try:
        vectorstore = init_vectorstore()
        
        # Parse query scope
        scope = parse_query_scope(query)
        debug_info = {
            "scope": scope,
            "filters": {},
            "retrieved_docs": 0,
            "context": ""
        }
        
        # Set up search filters based on accessible channels and DM access
        search_filter = {
            "$and": [
                # Either public channel or user's DM
                {
                    "$or": [
                        {
                            "is_dm": False,
                            "channel_id": {"$in": user_accessible_channels}
                        },
                        {
                            "is_dm": True,
                            "dm_participants": user_id
                        }
                    ]
                },
                # Exclude Snoopervisor DMs by requiring channel name to not contain "Snoopervisor"
                {
                    "$or": [
                        {"is_dm": False},  # All public channels
                        {"channel_name": ""}  # Empty string will never match Snoopervisor DMs
                    ]
                }
            ]
        }
        
        # Add scope-based filters
        if scope["channel_filter"]:
            # Case-insensitive channel name matching
            search_filter["$and"].append({
                "channel_name": scope["channel_filter"].lower()
            })
            debug_info["filters"]["channel"] = scope["channel_filter"]
            
        if scope["time_filter"]:
            start_time, end_time = parse_time_filter(scope["time_filter"])
            if start_time and end_time:
                search_filter["$and"].append({
                    "timestamp": {
                        "$gte": start_time,
                        "$lte": end_time
                    }
                })
                debug_info["filters"]["time"] = {
                    "start": start_time,
                    "end": end_time
                }
                
        if scope["user_filter"]:
            # Case-insensitive user name matching
            search_filter["$and"].append({
                "sender_name": scope["user_filter"].lower()
            })
            debug_info["filters"]["user"] = scope["user_filter"]
        
        debug_info["search_filter"] = search_filter
        
        # Retrieve relevant messages
        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={
                "k": 20,  # Increase number of retrieved messages
                "filter": search_filter
            }
        )
        docs = retriever.invoke(scope["core_question"])
        debug_info["retrieved_docs"] = len(docs)
        
        # Format context from retrieved documents
        context = "\n".join([
            f"In {doc.metadata.get('channel_name', 'a channel')}, {doc.metadata.get('sender_name', 'someone')} said: {doc.page_content}"
            for doc in docs
        ])
        debug_info["context"] = context
        
        # Generate response using ChatGPT
        template = """You are Snoopervisor, a helpful AI assistant that answers questions about chat messages. 
        Your responses should be:
        1. Professional and accurate
        2. Based on the message context provided
        3. Include a subtle touch of humor when appropriate
        4. If summarizing messages, group them by topic or sender when possible
        
        Context (chat messages): {context}
        
        Question: {query}
        
        Answer:"""
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["context", "query"]
        )
        
        llm = ChatOpenAI(
            temperature=0.7,
            model="gpt-4",
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        response = llm.invoke(prompt.format(
            query=scope["core_question"],
            context=context
        ))
        
        # Return both the response and debug info
        result = {
            "response": response.content,
            "debug": debug_info
        }
        
        # Log debug info to stderr (won't interfere with JSON output)
        print("Debug info:", json.dumps(debug_info, indent=2), file=sys.stderr)
        
        return result
        
    except Exception as e:
        error_msg = f"Error in query_messages: {str(e)}"
        print(error_msg, file=sys.stderr)
        return {
            "response": f"I apologize, but I encountered an error while processing your question: {str(e)}",
            "debug": {"error": error_msg}
        } 