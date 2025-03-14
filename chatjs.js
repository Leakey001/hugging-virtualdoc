document.addEventListener('DOMContentLoaded', () => {
    const chatInterface = document.getElementById('chat-interface');
    const startChatButton = document.getElementById('start-chat');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    // API configuration
    const API_TOKEN = "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";
    const MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct";
    const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;
    
    // Keep track of conversation history
    const conversationHistory = [];

    // Initially hide the chat interface on mobile
    if (window.innerWidth <= 900) {
        chatInterface.style.display = 'none';
    }

    // Handle start chat button
    startChatButton.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
            chatInterface.style.display = 'flex';
            document.querySelector('.left-section').style.display = 'none';
        }
        // Add initial greeting message
        const greeting = "Hi! I'm your AI medical assistant. How can I help you today?";
        addMessage(greeting, 'bot');
        // Add to conversation history
        conversationHistory.push({ role: "assistant", content: greeting });
        // Focus on input
        userInput.focus();
    });

    // Handle send button click
    sendButton.addEventListener('click', handleSendMessage);

    // Handle enter key press
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        userInput.value = '';
        const typingIndicator = addTypingIndicator();
        
        // Add user message to conversation history
        conversationHistory.push({ role: "user", content: message });

        try {
            // Format the conversation history for the model
            const formattedPrompt = formatConversationForModel();
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: formattedPrompt,
                    parameters: {
                        max_new_tokens: 250,
                        temperature: 0.7,
                        top_p: 0.9,
                        do_sample: true
                    }
                })
            });

            typingIndicator.remove();

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            let botResponse;

            if (Array.isArray(data) && data.length > 0) {
                botResponse = data[0].generated_text;
                // Extract only the new response from the model
                botResponse = extractNewResponse(botResponse, formattedPrompt);
            } else if (data.generated_text) {
                botResponse = data.generated_text;
                botResponse = extractNewResponse(botResponse, formattedPrompt);
            } else {
                botResponse = "I understand your message. How can I assist you further?";
            }

            addMessage(botResponse, 'bot');
            
            // Add bot response to conversation history
            conversationHistory.push({ role: "assistant", content: botResponse });

        } catch (error) {
            console.error('Error:', error);
            typingIndicator.remove();
            const errorMessage = "I apologize for the inconvenience. There was an error processing your request. Please try again.";
            addMessage(errorMessage, 'bot');
            conversationHistory.push({ role: "assistant", content: errorMessage });
        }
    }

    function formatConversationForModel() {
        // Format conversation history for Qwen model
        let formattedPrompt = "";
        
        conversationHistory.forEach(message => {
            if (message.role === "user") {
                formattedPrompt += `<|im_start|>user\n${message.content}<|im_end|>\n`;
            } else if (message.role === "assistant") {
                formattedPrompt += `<|im_start|>assistant\n${message.content}<|im_end|>\n`;
            }
        });
        
        // Add the final assistant prompt
        formattedPrompt += "<|im_start|>assistant\n";
        
        return formattedPrompt;
    }
    
    function extractNewResponse(fullResponse, prompt) {
        // Extract only the new content generated by the model
        // This removes the prompt that was sent to the model from the response
        if (fullResponse.startsWith(prompt)) {
            return fullResponse.slice(prompt.length).trim();
        }
        
        // If the response doesn't start with the prompt, check if it has the end tag
        const endTagIndex = fullResponse.indexOf("<|im_end|>");
        if (endTagIndex !== -1) {
            return fullResponse.substring(0, endTagIndex).trim();
        }
        
        return fullResponse;
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message');
        typingDiv.textContent = 'Typing...';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return typingDiv;
    }
    
    // Function to clear conversation history
    function clearConversation() {
        conversationHistory.length = 0;
        // Optionally clear the chat interface too
        // chatMessages.innerHTML = '';
    }
});