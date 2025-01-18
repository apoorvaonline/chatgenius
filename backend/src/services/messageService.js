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
    
    // Get channel for AI checks and indexing
    const channel = await Channel.findById(channelId).populate('participants');
    
    // Index all messages asynchronously without waiting
    this.indexMessageForSnoopervisor(savedMessage, channel).catch(error => 
      console.error('Background indexing error:', error)
    );
    
    // Check if this message is sent to an AI user
    if (channel && channel.isDM) {
      const aiUser = channel.participants.find(p => p.isAI);
      
      if (aiUser && aiUser._id.toString() !== sender.toString()) {
        // First, emit the user's message
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

        // Show typing indicator
        io.to(channelId).emit('aiTyping', { channelId, isTyping: true });

        try {
          // Generate AI response based on the AI user
          let aiResponse;
          if (aiUser.name === "Snoopervisor") {
            const response = await this.generateSnoopervisorResponse(content, sender, channelId);
            aiResponse = new Message({
              sender: aiUser._id,
              content: response,
              channel: channelId,
              parentMessageId,
              file: null
            });
            await aiResponse.save();
          } else {
            // Galaxy Gagster or other AI
            const response = await this.generateAIResponse(content, aiUser._id, channelId, parentMessageId);
            aiResponse = response;
          }
          
          await aiResponse.populate('sender', 'name');
          
          // Stop typing indicator
          io.to(channelId).emit('aiTyping', { channelId, isTyping: false });
          
          // Emit AI response
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

  async indexMessageForSnoopervisor(message, channel) {
    try {
      const scriptPath = path.join(__dirname, '..', 'ai');
      const options = {
        mode: 'json',
        pythonPath: 'python3',
        scriptPath: scriptPath,
        args: [
          'index',
          JSON.stringify({
            _id: message._id.toString(),
            content: message.content,
            channel: channel._id.toString(),
            channelName: channel.name,
            sender: message.sender._id.toString(),
            senderName: message.sender.name,
            timestamp: message.timestamp,
            isDM: channel.isDM,
            dmParticipants: channel.isDM ? channel.participants.map(p => p._id.toString()) : []
          })
        ]
      };

      // Add timeout to prevent hanging
      const timeoutMs = 30000; // 30 seconds timeout
      const indexingPromise = new Promise((resolve, reject) => {
        const pythonProcess = new PythonShell('snoopervisor_wrapper.py', options);
        
        let output = '';
        
        pythonProcess.stdout.on('data', (data) => {
          output += data;
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error('Python stderr:', data);
        });

        pythonProcess.end((err, code, signal) => {
          if (err) {
            console.error('Python process error:', err);
            reject(err);
          } else {
            try {
              const result = JSON.parse(output);
              resolve(result);
            } catch (parseError) {
              console.error('Error parsing Python output:', parseError);
              reject(parseError);
            }
          }
        });
      });

      const result = await Promise.race([
        indexingPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Indexing operation timed out')), timeoutMs)
        )
      ]);

      if (!result || !result.success) {
        throw new Error('Failed to index message: ' + JSON.stringify(result));
      }

      return result;
    } catch (error) {
      console.error('Error indexing message for Snoopervisor:', error);
      throw error; // Re-throw to handle in the caller
    }
  }

  async generateSnoopervisorResponse(content, userId, channelId) {
    try {      
      // Get all channels the user has access to
      const user = await User.findById(userId);
      const accessibleChannels = await Channel.find({
        $or: [
          { isDM: false }, // All public channels
          { isDM: true, participants: userId } // DMs where user is participant
        ]
      });
      
      const channelIds = accessibleChannels.map(c => c._id.toString());

      const scriptPath = path.join(__dirname, '..', 'ai');
      const options = {
        mode: 'json',
        pythonPath: 'python3',
        scriptPath: scriptPath,
        args: [
          'query',
          content,
          JSON.stringify(channelIds),
          userId.toString()
        ]
      };

      // Add timeout to prevent hanging
      const timeoutMs = 30000; // 30 seconds timeout
      const responsePromise = new Promise((resolve, reject) => {
        const pythonProcess = new PythonShell('snoopervisor_wrapper.py', options);
        
        let output = '';
        
        pythonProcess.stdout.on('data', (data) => {
          output += data;
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error('Python stderr:', data);
        });

        pythonProcess.end((err, code, signal) => {
          if (err) {
            console.error('Python process error:', err);
            reject(err);
          } else {
            try {
              const result = JSON.parse(output);
              resolve(result);
            } catch (parseError) {
              console.error('Error parsing Python output:', parseError);
              reject(parseError);
            }
          }
        });
      });

      const result = await Promise.race([
        responsePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Response generation timed out')), timeoutMs)
        )
      ]);

      // Log debug info if available
      if (result?.response?.debug) {
        console.log('Snoopervisor debug info:', JSON.stringify(result.response.debug, null, 2));
      }

      // Extract just the response text, handling nested response
      const responseText = result?.response?.response || result?.response;
      if (!responseText || typeof responseText !== 'string') {
        throw new Error('Invalid response format: ' + JSON.stringify(result));
      }

      return responseText;
    } catch (error) {
      console.error('Error generating Snoopervisor response:', error);
      return "I apologize, but I encountered an error while processing your question. Please try again.";
    }
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