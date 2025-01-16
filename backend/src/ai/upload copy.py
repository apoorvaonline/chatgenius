from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Pinecone
import os
from dotenv import load_dotenv

# Specify the path to the .env file
from pathlib import Path
dotenv_path = Path(__file__).resolve().parent.parent / ".env"

# Load environment variables from the specified .env file
load_dotenv(dotenv_path)

print("Loaded PINECONE_API_KEY:", os.getenv("PINECONE_API_KEY"))

# Set up API keys and configurations
os.environ["PINECONE_API_KEY"] = os.getenv("PINECONE_API_KEY")
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY")
os.environ["LANGCHAIN_TRACING_V2"] = os.getenv("LANGCHAIN_TRACING_V2")
os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGCHAIN_PROJECT")
PINECONE_INDEX = os.getenv("PINECONE_INDEX")

# Path to the data source
file_path = '../knowledge-base/galaxy-facts.txt'

# Read data from the file
with open(file_path, 'r') as file:
    raw_text = file.read()

# Split data into chunks
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
documents = text_splitter.split_text(raw_text)

# Convert chunks into embeddings and upload to Pinecone
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
Pinecone.from_documents(documents=documents, embedding=embeddings, index_name=PINECONE_INDEX)

print("Data uploaded to Pinecone successfully.")
