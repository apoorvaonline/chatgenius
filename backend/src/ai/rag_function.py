from langchain_openai import ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain.prompts import PromptTemplate
from langchain_openai import OpenAIEmbeddings
import os
from dotenv import load_dotenv
from pinecone import Pinecone as PineconeClient

# Load environment variables
load_dotenv()

def get_vectorstore():
    """Initialize and return the vector store"""
    try:
        # Initialize Pinecone client
        pc = PineconeClient(api_key=os.getenv("PINECONE_API_KEY"))
        
        # Initialize embeddings - using text-embedding-ada-002 which produces 1536d vectors
        embeddings = OpenAIEmbeddings(
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Initialize vector store using PineconeVectorStore
        vectorstore = PineconeVectorStore(
            index=pc.Index(os.getenv("PINECONE_INDEX")),
            embedding=embeddings,
            text_key="text"
        )
        
        return vectorstore
    except Exception as e:
        print(f"Error initializing vector store: {str(e)}")
        raise

def rag_pipeline(prompt: str) -> str:
    try:
        # Get vector store
        vectorstore = get_vectorstore()
        
        # Set up retriever
        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 3}  # Return top 3 most relevant chunks
        )

        # Retrieve relevant documents
        docs = retriever.invoke(prompt)
        
        # Extract and format context from documents
        context = "\n".join([doc.page_content for doc in docs])

        # Create template for the prompt
        template = """You are a knowledgeable AI assistant. The context provided contains some humorous, fictional facts. 
        Your task is to:
        1. Provide a brief, factual answer about {query} based on your general knowledge
        2. End with one of the humorous facts from the context, but don't mention the context in your response

        Context: {context}
        
        Question: {query}
        
        Answer:"""
        
        prompt_template = PromptTemplate(
            template=template,
            input_variables=["context", "query"]
        )
        
        # Format the prompt
        formatted_prompt = prompt_template.format(
            query=prompt,
            context=context
        )

        # Initialize the LLM
        llm = ChatOpenAI(
            temperature=0.7, 
            model="gpt-4",
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )

        # Generate the response
        response = llm.invoke(formatted_prompt)
        
        return response.content

    except Exception as e:
        print(f"Error in RAG pipeline: {str(e)}")
        return f"An error occurred: {str(e)}"

# Test function
if __name__ == "__main__":
    # Test prompt
    test_prompt = "What is special about Saturn's rings?"
    print("\nTest Prompt:", test_prompt)
    print("\nResponse:", rag_pipeline(test_prompt))
