import sys
from rag_function import rag_pipeline
import logging
import traceback

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    try:
        # Get the prompt from command line arguments
        if len(sys.argv) < 2:
            error_msg = "No prompt provided"
            logger.error(error_msg)
            print(error_msg, flush=True)
            sys.exit(1)
            
        # The prompt is the first argument
        prompt = sys.argv[1]
        logger.info(f"Received prompt: {prompt}")
        
        # Call the RAG pipeline and get the response
        logger.info("Calling RAG pipeline...")
        response = rag_pipeline(prompt)
        logger.info(f"RAG pipeline response: {response}")
        
        # Print the response and ensure it's flushed
        print(response, flush=True)
        sys.stdout.flush()
        
    except Exception as e:
        error_msg = f"Error processing prompt: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        print(error_msg, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main() 