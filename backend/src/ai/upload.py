from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Pinecone as LangchainPinecone
import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from pathlib import Path

# Load environment variables
load_dotenv()

print(f"OpenAI API Key present: {bool(os.getenv('OPENAI_API_KEY'))}")
print(f"Pinecone API Key present: {bool(os.getenv('PINECONE_API_KEY'))}")

def init_pinecone():
    try:
        # Set up API keys and configurations
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        pinecone_env = os.getenv("PINECONE_ENVIRONMENT")
        pinecone_index = os.getenv("PINECONE_INDEX")
        
        if not all([pinecone_api_key, pinecone_env, pinecone_index]):
            raise ValueError("Missing required Pinecone environment variables")

        # Initialize Pinecone with new method
        pc = Pinecone(api_key=pinecone_api_key)

        # Check if the index exists, else create one
        if pinecone_index not in pc.list_indexes().names():
            pc.create_index(
                name=pinecone_index,
                dimension=1536,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region=pinecone_env
                )
            )
            
        return pinecone_index
    
    except Exception as e:
        print(f"Error initializing Pinecone: {str(e)}")
        raise

def upload_to_pinecone():
    try:
        # Get OpenAI API key
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise ValueError("Missing OpenAI API key")

        # Initialize Pinecone
        pinecone_index = init_pinecone()

        # Load text data - corrected path
        knowledge_base_path = Path(__file__).resolve().parent.parent.parent / "knowledge-base" / "galaxy-facts.txt"
        
        if not knowledge_base_path.exists():
            raise FileNotFoundError(f"Could not find file at {knowledge_base_path}")

        with open(knowledge_base_path, 'r') as file:
            raw_text = file.read()

        # Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
            length_function=len
        )
        documents = text_splitter.split_text(raw_text)

        # Initialize embeddings
        embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)

        # Create and upload to Pinecone vectorstore using LangchainPinecone
        vectorstore = LangchainPinecone.from_texts(
            texts=documents,
            embedding=embeddings,
            index_name=pinecone_index
        )

        print("Data uploaded to Pinecone successfully.")
        return vectorstore

    except Exception as e:
        print(f"Error during upload process: {str(e)}")
        raise

if __name__ == "__main__":
    upload_to_pinecone()
