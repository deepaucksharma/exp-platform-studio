/**
 * DStudio Claude Desktop Memory Manager
 * Manages memory persistence and retrieval for Claude Desktop
 */

const fs = require('fs');
const path = require('path');
const utils = require('../utils');

/**
 * Memory Manager for Claude Desktop
 * Maintains conversational context and provides relevant information recall
 */
class MemoryManager {
  /**
   * Create a new Memory Manager instance
   */
  constructor() {
    this.memoryPath = path.join(__dirname, 'memory');
    this.shortTermMemory = new Map();
    this.longTermMemory = new Map();
    this.conversationHistory = [];
    
    // Ensure memory directory exists
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }
  }
  
  /**
   * Initialize session memory
   * @param {string} sessionId - Unique session identifier
   * @returns {Promise<boolean>} Success status
   */
  async initializeSessionMemory(sessionId) {
    console.log(`Initializing memory for session: ${sessionId}`);
    
    try {
      // Load existing session memory or create new one
      const sessionPath = path.join(this.memoryPath, `session-${sessionId}.json`);
      
      if (fs.existsSync(sessionPath)) {
        // Load existing session
        const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        
        // Restore short-term memory
        this.shortTermMemory = new Map(sessionData.shortTerm || []);
        
        // Restore conversation history
        this.conversationHistory = sessionData.history || [];
        
        console.log(`Loaded existing memory for session: ${sessionId}`);
        console.log(`Restored ${this.shortTermMemory.size} memory items and ${this.conversationHistory.length} conversation events`);
        
        return true;
      }
      
      // Initialize new session memory
      return this.createNewSessionMemory(sessionId);
    } catch (err) {
      console.error(`Failed to initialize session memory: ${err}`);
      return false;
    }
  }
  
  /**
   * Create new session memory
   * @param {string} sessionId - Unique session identifier
   * @returns {Promise<boolean>} Success status
   */
  async createNewSessionMemory(sessionId) {
    console.log(`Creating new memory for session: ${sessionId}`);
    
    try {
      // Initialize new memory structures
      this.shortTermMemory = new Map();
      this.conversationHistory = [];
      
      // Create initial memory record
      this.shortTermMemory.set('session:info', {
        id: sessionId,
        created: Date.now(),
        lastAccessed: Date.now()
      });
      
      // Record initialization event
      this.conversationHistory.push({
        type: 'initialization',
        timestamp: Date.now(),
        data: {
          sessionId,
          created: new Date().toISOString()
        }
      });
      
      // Save the new session memory
      await this.saveSessionMemory(sessionId);
      
      console.log(`Created new memory for session: ${sessionId}`);
      return true;
    } catch (err) {
      console.error(`Failed to create new session memory: ${err}`);
      return false;
    }
  }
  
  /**
   * Save session memory
   * @param {string} sessionId - Unique session identifier
   * @returns {Promise<boolean>} Success status
   */
  async saveSessionMemory(sessionId) {
    console.log(`Saving memory for session: ${sessionId}`);
    
    try {
      const sessionPath = path.join(this.memoryPath, `session-${sessionId}.json`);
      
      // Prepare session data
      const sessionData = {
        id: sessionId,
        created: this.shortTermMemory.get('session:info')?.created || Date.now(),
        lastUpdated: Date.now(),
        shortTerm: Array.from(this.shortTermMemory.entries()),
        history: this.conversationHistory
      };
      
      // Write session data to file
      fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
      
      console.log(`Memory saved for session: ${sessionId}`);
      return true;
    } catch (err) {
      console.error(`Failed to save session memory: ${err}`);
      return false;
    }
  }
  
  /**
   * Record a conversation event
   * @param {Object} event - Event data
   * @returns {Promise<boolean>} Success status
   */
  async recordConversationEvent(event) {
    try {
      // Add timestamp if not provided
      if (!event.timestamp) {
        event.timestamp = Date.now();
      }
      
      // Add event to conversation history
      this.conversationHistory.push(event);
      
      // Update short-term memory based on event type
      switch (event.type) {
        case 'fileReference':
          this.updateFileReference(event.path);
          break;
        case 'command':
          this.updateCommandReference(event.command, event.arguments);
          break;
        case 'conceptDiscussion':
          this.updateConceptReference(event.concept);
          break;
        case 'question':
          this.updateQuestionReference(event.question);
          break;
        case 'answer':
          // Nothing special to do for answers
          break;
        default:
          // Generic event, no special handling
          break;
      }
      
      console.log(`Recorded conversation event: ${event.type}`);
      return true;
    } catch (err) {
      console.error(`Failed to record conversation event: ${err}`);
      return false;
    }
  }
  
  /**
   * Update file reference in short-term memory
   * @param {string} filePath - Path to the referenced file
   */
  updateFileReference(filePath) {
    const key = `file:${filePath}`;
    const existing = this.shortTermMemory.get(key) || { accessCount: 0 };
    
    this.shortTermMemory.set(key, {
      path: filePath,
      lastAccessed: Date.now(),
      accessCount: existing.accessCount + 1
    });
  }
  
  /**
   * Update command reference in short-term memory
   * @param {string} command - Command name
   * @param {Array} args - Command arguments
   */
  updateCommandReference(command, args) {
    const key = `command:${command}`;
    const existing = this.shortTermMemory.get(key) || { usageCount: 0, examples: [] };
    
    // Keep only the last 5 examples
    const examples = existing.examples || [];
    examples.push(args);
    if (examples.length > 5) {
      examples.shift();
    }
    
    this.shortTermMemory.set(key, {
      command,
      lastUsed: Date.now(),
      usageCount: existing.usageCount + 1,
      examples
    });
  }
  
  /**
   * Update concept reference in short-term memory
   * @param {string} concept - Concept name
   */
  updateConceptReference(concept) {
    const key = `concept:${concept.toLowerCase()}`;
    const existing = this.shortTermMemory.get(key) || { mentionCount: 0 };
    
    this.shortTermMemory.set(key, {
      concept,
      lastMentioned: Date.now(),
      mentionCount: existing.mentionCount + 1
    });
  }
  
  /**
   * Update question reference in short-term memory
   * @param {string} question - Question text
   */
  updateQuestionReference(question) {
    const questionKey = `question:${Date.now()}`;
    
    this.shortTermMemory.set(questionKey, {
      question,
      asked: Date.now()
    });
    
    // Keep only the last 10 questions
    const questionKeys = Array.from(this.shortTermMemory.keys())
      .filter(key => key.startsWith('question:'))
      .sort();
    
    if (questionKeys.length > 10) {
      // Remove oldest questions
      const keysToRemove = questionKeys.slice(0, questionKeys.length - 10);
      for (const key of keysToRemove) {
        this.shortTermMemory.delete(key);
      }
    }
  }
  
  /**
   * Get relevant context for a query
   * @param {string} query - User query
   * @returns {Object} Relevant context
   */
  getRelevantContext(query) {
    console.log(`Getting relevant context for query: ${query}`);
    
    // Initialize context
    const context = {
      recentFiles: [],
      relevantConcepts: [],
      recentCommands: [],
      recentQuestions: []
    };
    
    try {
      // Get recent files (sorted by last access time, most recent first)
      const fileEntries = Array.from(this.shortTermMemory.entries())
        .filter(([key]) => key.startsWith('file:'))
        .sort((a, b) => b[1].lastAccessed - a[1].lastAccessed)
        .slice(0, 5);
      
      context.recentFiles = fileEntries.map(([key, value]) => ({
        path: value.path,
        accessCount: value.accessCount,
        lastAccessed: new Date(value.lastAccessed).toISOString()
      }));
      
      // Get relevant concepts (based on query relevance and recency)
      const conceptEntries = Array.from(this.shortTermMemory.entries())
        .filter(([key]) => key.startsWith('concept:'));
      
      // Find concepts relevant to the query
      const queryTerms = query.toLowerCase().split(/\s+/);
      const relevantConcepts = conceptEntries
        .filter(([key, value]) => {
          const concept = value.concept.toLowerCase();
          return queryTerms.some(term => concept.includes(term));
        })
        .sort((a, b) => b[1].lastMentioned - a[1].lastMentioned)
        .slice(0, 3);
      
      // Add recent concepts if we don't have enough relevant ones
      if (relevantConcepts.length < 3) {
        const recentConcepts = conceptEntries
          .sort((a, b) => b[1].lastMentioned - a[1].lastMentioned)
          .slice(0, 3 - relevantConcepts.length);
        
        relevantConcepts.push(...recentConcepts);
      }
      
      context.relevantConcepts = relevantConcepts.map(([key, value]) => ({
        concept: value.concept,
        mentionCount: value.mentionCount,
        lastMentioned: new Date(value.lastMentioned).toISOString()
      }));
      
      // Get recent commands
      const commandEntries = Array.from(this.shortTermMemory.entries())
        .filter(([key]) => key.startsWith('command:'))
        .sort((a, b) => b[1].lastUsed - a[1].lastUsed)
        .slice(0, 3);
      
      context.recentCommands = commandEntries.map(([key, value]) => ({
        command: value.command,
        usageCount: value.usageCount,
        lastUsed: new Date(value.lastUsed).toISOString(),
        examples: value.examples || []
      }));
      
      // Get recent questions
      const questionEntries = Array.from(this.shortTermMemory.entries())
        .filter(([key]) => key.startsWith('question:'))
        .sort((a, b) => b[1].asked - a[1].asked)
        .slice(0, 3);
      
      context.recentQuestions = questionEntries.map(([key, value]) => ({
        question: value.question,
        asked: new Date(value.asked).toISOString()
      }));
      
      console.log(`Found ${context.recentFiles.length} recent files, ${context.relevantConcepts.length} relevant concepts, ${context.recentCommands.length} recent commands, and ${context.recentQuestions.length} recent questions`);
      
      return context;
    } catch (err) {
      console.error(`Failed to get relevant context: ${err}`);
      return context;
    }
  }
  
  /**
   * Get recent conversation history
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Recent conversation events
   */
  getRecentHistory(limit = 5) {
    try {
      // Get the most recent conversation events
      return this.conversationHistory
        .slice(-limit)
        .map(event => ({
          ...event,
          timestamp: new Date(event.timestamp).toISOString()
        }));
    } catch (err) {
      console.error(`Failed to get recent history: ${err}`);
      return [];
    }
  }
  
  /**
   * Get all files referenced in the conversation
   * @returns {Array} Referenced files
   */
  getReferencedFiles() {
    try {
      // Get all file references from short-term memory
      return Array.from(this.shortTermMemory.entries())
        .filter(([key]) => key.startsWith('file:'))
        .map(([key, value]) => ({
          path: value.path,
          accessCount: value.accessCount,
          lastAccessed: new Date(value.lastAccessed).toISOString()
        }))
        .sort((a, b) => b.accessCount - a.accessCount);
    } catch (err) {
      console.error(`Failed to get referenced files: ${err}`);
      return [];
    }
  }
  
  /**
   * Clear session memory
   * @returns {Promise<boolean>} Success status
   */
  async clearMemory() {
    console.log('Clearing memory...');
    
    try {
      // Keep session info but clear everything else
      const sessionInfo = this.shortTermMemory.get('session:info');
      
      this.shortTermMemory = new Map();
      if (sessionInfo) {
        this.shortTermMemory.set('session:info', sessionInfo);
      }
      
      this.conversationHistory = [];
      
      // Record memory cleared event
      this.conversationHistory.push({
        type: 'memoryCleared',
        timestamp: Date.now(),
        data: {
          reason: 'explicit'
        }
      });
      
      console.log('Memory cleared successfully');
      return true;
    } catch (err) {
      console.error(`Failed to clear memory: ${err}`);
      return false;
    }
  }
}

module.exports = MemoryManager;
