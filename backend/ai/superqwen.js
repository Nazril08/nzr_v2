// Constants
const API_URL = 'https://fastrestapis.fasturl.cloud/aillm/superqwen';

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const modelSelect = document.getElementById('modelSelect');
const styleSelect = document.getElementById('styleSelect');
const typingIndicator = document.getElementById('typingIndicator');

// State Variables
let currentSessionId = '';
let isWaitingForResponse = false;

// Character limit for input
userInput.addEventListener('input', () => {
    const maxLength = 500;
    if (userInput.value.length > maxLength) {
        userInput.value = userInput.value.slice(0, maxLength);
    }
});

// Show typing indicator
function showTypingIndicator() {
    typingIndicator.classList.remove('hidden');
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    typingIndicator.classList.add('hidden');
}

// Update model select options
function updateModelOptions() {
    const availableModels = [
        'qwen-max-latest', 
        'qwen-plus-latest', 
        'qwen-2.5-v1-72b-instruct', 
        'qwen-2.5-14b-instruct-1m', 
        'qvq-72b-preview', 
        'qwq-32b-preview', 
        'qwen-2.5-coder-32b-instruct', 
        'qwen-turbo-latest', 
        'qwen-2.5-72b-instruct'
    ];

    modelSelect.innerHTML = availableModels.map(model => 
        `<option value="${model}">${model}</option>`
    ).join('');

    // Set a default model
    modelSelect.value = 'qwen-max-latest';
}

// Update mode select options
function updateModeOptions() {
    const availableModes = ['chat', 'search'];

    // If mode select exists, update its options
    if (document.getElementById('modeSelect')) {
        const modeSelect = document.getElementById('modeSelect');
        modeSelect.innerHTML = availableModes.map(mode => 
            `<option value="${mode}">${mode.charAt(0).toUpperCase() + mode.slice(1)}</option>`
        ).join('');
    }
}

// Initialize
function init() {
    // Generate a new session ID on page load
    currentSessionId = generateSessionId();
    
    // Update model and mode options
    updateModelOptions();
    updateModeOptions();
    
    // Add welcome message
    addMessage('assistant', 'Hello! I\'m SuperQwen, your AI assistant. How can I help you today?');
    
    // Setup event listeners
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Send message on button click
    sendButton.addEventListener('click', handleSendMessage);
    
    // Send message on Enter key
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
}

// Handle sending a message
async function handleSendMessage() {
    const message = userInput.value.trim();
    
    // Validate input
    if (message === '' || isWaitingForResponse) return;
    
    // Add user message
    addMessage('user', message);
    userInput.value = '';
    
    // Set waiting state
    isWaitingForResponse = true;
    
    // Add typing indicator
    const typingIndicator = addTypingIndicator();
    
    try {
        // Determine mode and model
        const mode = document.getElementById('modeSelect') 
            ? document.getElementById('modeSelect').value 
            : 'search';
        
        const model = modelSelect.value || 'qwen-max-latest';
        const style = styleSelect.value || 'Provide a detailed explanation';
        
        // Prepare API parameters
        const params = new URLSearchParams({
            ask: message,
            style: style,
            sessionId: currentSessionId,
            model: model,
            mode: mode
        });

        // Send to API
        const response = await querySuperQwen(params);
        
        // Remove typing indicator
        if (typingIndicator.parentNode === chatMessages) {
            chatMessages.removeChild(typingIndicator);
        }
        
        // Add AI response
        if (response && response.result) {
            addMessage('assistant', response.result);
        } else if (response && response.content) {
            addMessage('assistant', response.content);
        } else {
            throw new Error('No valid response received from AI');
        }
    } catch (error) {
        // Remove typing indicator
        if (typingIndicator.parentNode === chatMessages) {
            chatMessages.removeChild(typingIndicator);
        }
        
        // Add error message
        addMessage('assistant', `Error: ${error.message}`);
        
        // Log error for debugging
        console.error('Message Send Error:', error);
    } finally {
        // Reset waiting state
        isWaitingForResponse = false;
    }
    
    // Scroll to bottom
    scrollToBottom();
}

// Add a message to the chat
function addMessage(type, content) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'flex flex-col w-full';

    const innerContainer = document.createElement('div');
    innerContainer.className = `flex items-start ${type === 'user' ? 'self-end' : 'self-start'} mb-4`;

    // Create icon container
    const iconContainer = document.createElement('div');
    iconContainer.className = `w-10 h-10 rounded-full flex items-center justify-center ${type === 'user' ? 'order-last ml-3' : 'mr-3'}`;
    
    // Set icon based on message type
    if (type === 'user') {
        iconContainer.innerHTML = '<i class="fas fa-user text-blue-600"></i>';
        iconContainer.classList.add('bg-blue-100');
    } else {
        iconContainer.innerHTML = '<i class="fas fa-robot text-indigo-600"></i>';
        iconContainer.classList.add('bg-indigo-100');
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type === 'user' ? 'user-message' : 'assistant-message'}`;

    // Add sender label
    const senderLabel = document.createElement('div');
    senderLabel.className = `font-semibold text-xs mb-1 ${type === 'user' ? 'text-indigo-800' : 'text-gray-700'}`;
    senderLabel.textContent = type === 'user' ? 'You' : 'SuperQwen';
    messageElement.appendChild(senderLabel);

    // Add message content
    const messageText = document.createElement('p');
    messageText.textContent = content;
    messageElement.appendChild(messageText);

    // Add timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'text-xs text-gray-500 mt-1 text-right';
    timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageElement.appendChild(timestamp);

    // Assemble the message
    innerContainer.appendChild(iconContainer);
    innerContainer.appendChild(messageElement);
    messageContainer.appendChild(innerContainer);

    // Add to chat container
    chatMessages.appendChild(messageContainer);
    
    // Scroll to the new message
    scrollToBottom();
}

// Add typing indicator while waiting for response
function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'flex flex-col w-full';
    
    const innerContainer = document.createElement('div');
    innerContainer.className = 'flex items-start self-start mb-4';
    
    const iconContainer = document.createElement('div');
    iconContainer.className = 'w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-indigo-100';
    iconContainer.innerHTML = '<i class="fas fa-robot text-indigo-600"></i>';
    
    const typingElement = document.createElement('div');
    typingElement.className = 'message assistant-message typing-indicator';
    typingElement.innerHTML = `
        <div class="flex space-x-1 justify-center items-center">
            <div class="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
            <div class="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
        </div>
    `;
    
    innerContainer.appendChild(iconContainer);
    innerContainer.appendChild(typingElement);
    indicator.appendChild(innerContainer);
    
    chatMessages.appendChild(indicator);
    scrollToBottom();
    return indicator;
}

// Scroll chat to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Query the SuperQwen API
async function querySuperQwen(params) {
    // Construct full URL with parameters
    const fullUrl = `${API_URL}?${params.toString()}`;
    
    console.group('SuperQwen API Request');
    console.log('Request URL:', fullUrl);
    console.log('Request Parameters:', Object.fromEntries(params));
    
    try {
        // Configure request headers
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        
        // Perform the fetch request with more detailed error handling
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: headers,
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 seconds timeout
        });
        
        // Log response status and headers
        console.log('Response Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
        
        // Check if response is successful
        if (!response.ok) {
            // Try to get error details
            const errorText = await response.text();
            console.error('Error Response:', errorText);
            
            // Log additional debugging information
            console.error('Request Details:', {
                url: fullUrl,
                method: 'GET',
                headers: headers,
                params: Object.fromEntries(params)
            });
            
            throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
        }
        
        // Parse response
        const responseData = await response.json();
        console.log('Full Response Data:', responseData);
        console.groupEnd();
        
        // Validate response structure
        if (!responseData) {
            throw new Error('Invalid response format: Empty response');
        }
        
        return responseData;
    } catch (error) {
        console.groupEnd();
        console.error('SuperQwen API Error:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        // Detailed error handling
        let userFriendlyMessage = 'Failed to get response from AI.';
        
        if (error.name === 'AbortError') {
            userFriendlyMessage = 'Request timed out. Please check your internet connection.';
        } else if (error.message.includes('400')) {
            userFriendlyMessage = 'Bad Request: Please check your parameters and model selection.';
        } else if (error.message.includes('500')) {
            userFriendlyMessage = 'Server error occurred. Please try again later.';
        } else if (error.message.includes('404')) {
            userFriendlyMessage = 'API endpoint not found. Please contact support.';
        } else if (error.message.includes('403')) {
            userFriendlyMessage = 'Access denied. Please check your credentials.';
        }
        
        // Throw a new error with user-friendly message
        throw new Error(userFriendlyMessage);
    }
}

// Generate a random session ID
function generateSessionId() {
    return 'session_' + Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
}

// Initialize the app
init(); 