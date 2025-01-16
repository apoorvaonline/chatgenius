import Message from '../models/Message.js';
import User from '../models/User.js';
import Channel from '../models/Channel.js';
import { PythonShell } from 'python-shell';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkPythonEnvironment() {
  return new Promise((resolve, reject) => {
    exec('python3 --version', (error, stdout, stderr) => {
      if (error) {
        console.error('Python check error:', error);
        reject(error);
        return;
      }
      console.log('Python version:', stdout.trim());
      resolve(stdout.trim());
    });
  });
}

class MessageService {
  constructor() {
    checkPythonEnvironment().catch(console.error);
  }

  async saveMessage({ sender, content, channelId, file = null, parentMessageId = null }) {
    const message = new Message({
      sender,
      content,
      channel: channelId,
      file,
      parentMessageId
    });
          
    const savedMessage = await message.save();
    await savedMessage.populate('sender', 'name');
    
    // Check if this message is sent to an AI user
    const channel = await Channel.findById(channelId).populate('participants');
    if (channel && channel.isDM) {
      const aiUser = channel.participants.find(p => p.isAI);
      
      if (aiUser && aiUser._id.toString() !== sender.toString()) {
        // First, emit the user's message with correct format
        const io = global.io;
        io.to(channelId).emit('receiveMessage', {
          _id: savedMessage._id.toString(),
          sender: savedMessage.sender._id.toString(),
          senderName: savedMessage.sender.name,
          content: savedMessage.content,
          channel: savedMessage.channel,
          timestamp: savedMessage.timestamp,
          file: savedMessage.file || null
        });

        // Then emit a "typing" indicator for AI
        io.to(channelId).emit('aiTyping', { channelId, isTyping: true });

        try {
          // Generate AI response asynchronously
          const aiResponse = await this.generateAIResponse(content, aiUser._id, channelId, parentMessageId);
          
          // Stop typing indicator
          io.to(channelId).emit('aiTyping', { channelId, isTyping: false });
          
          // Emit AI response with correct format
          io.to(channelId).emit('receiveMessage', {
            _id: aiResponse._id.toString(),
            sender: aiResponse.sender._id.toString(),
            senderName: aiResponse.sender.name,
            content: aiResponse.content,
            channel: aiResponse.channel,
            timestamp: aiResponse.timestamp,
            file: aiResponse.file || null
          });
          
          return [savedMessage, aiResponse];
        } catch (error) {
          // Stop typing indicator in case of error
          io.to(channelId).emit('aiTyping', { channelId, isTyping: false });
          throw error;
        }
      }
    }
    
    // For non-AI messages, emit with correct format
    const io = global.io;
    io.to(channelId).emit('receiveMessage', {
      _id: savedMessage._id.toString(),
      sender: savedMessage.sender._id.toString(),
      senderName: savedMessage.sender.name,
      content: savedMessage.content,
      channel: savedMessage.channel,
      timestamp: savedMessage.timestamp,
      file: savedMessage.file || null
    });
    
    return [savedMessage];
  }

  async generateAIResponse(content, aiUserId, channelId, parentMessageId) {
    try {      
      // Get absolute paths
      const scriptPath = path.join(__dirname, '..', 'ai');
      const wrapperScript = path.join(scriptPath, 'rag_wrapper.py');
      
      // Verify files exist
      const fs = await import('fs');
      if (!fs.existsSync(wrapperScript)) {
        throw new Error(`Script not found: ${wrapperScript}`);
      }

      const options = {
        mode: 'text',
        pythonPath: 'python3',
        pythonOptions: ['-u'], // unbuffered output
        scriptPath: scriptPath,
        args: [content]
      };

      // Call the Python RAG function with more detailed error handling
      const result = await new Promise((resolve, reject) => {
        const pyshell = new PythonShell('rag_wrapper.py', options);
        
        let output = '';
        
        pyshell.stdout.on('data', (data) => {
          console.log('Python stdout:', data);
          output += data;
        });

        pyshell.stderr.on('data', (data) => {
          console.error('Python stderr:', data);
        });

        pyshell.end((err) => {
          if (err) {
            console.error('Python shell error:', err);
            reject(err);
          } else {
            console.log('Python shell completed. Output:', output);
            resolve(output || "Sorry, I couldn't process that request.");
          }
        });
      });

      // Create and save the AI response message
      const message = new Message({
        sender: aiUserId,
        content: result,
        channel: channelId,
        file: null,
        parentMessageId: parentMessageId
      });

      const savedMessage = await message.save();
      await savedMessage.populate('sender', 'name');
      
      return savedMessage;

    } catch (error) {
      console.error('Detailed error in generateAIResponse:', {
        error: error.message,
        stack: error.stack,
        details: error
      });

      // Create a fallback message in case of error
      const errorMessage = new Message({
        sender: aiUserId,
        content: `I apologize, but I'm having trouble processing your request right now. Error: ${error.message}`,
        channel: channelId,
        file: null,
        parentMessageId: parentMessageId
      });

      const savedErrorMessage = await errorMessage.save();
      await savedErrorMessage.populate('sender', 'name');
      
      return savedErrorMessage;
    }
  }
}

export default new MessageService(); 