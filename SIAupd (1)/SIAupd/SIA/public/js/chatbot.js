// Chatbot functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');
    const chatbotMessages = document.getElementById('chatbot-messages');

    if (!chatbotToggle || !chatbotContainer) return;

    // Toggle chatbot
    chatbotToggle.addEventListener('click', function() {
        chatbotContainer.classList.toggle('d-none');
        if (!chatbotContainer.classList.contains('d-none')) {
            chatbotInput.focus();
        }
    });

    // Close chatbot
    if (chatbotClose) {
        chatbotClose.addEventListener('click', function() {
            chatbotContainer.classList.add('d-none');
        });
    }

    // Send message function
    function sendMessage() {
        const message = chatbotInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessage(message, 'user');
        chatbotInput.value = '';

        // Send to API
        fetch('/api/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            addMessage(data.response, 'bot');
        })
        .catch(error => {
            console.error('Chatbot error:', error);
            addMessage('Sorry, I encountered an error. Please try again later.', 'bot');
        });
    }

    // Show/hide FAQ based on message count
    function toggleFAQ() {
        const faqSection = document.getElementById('chatbot-faq');
        const messages = chatbotMessages.children;
        // Show FAQ only if there are 0 or 1 messages (just the welcome message)
        if (faqSection && messages.length <= 1) {
            faqSection.style.display = 'block';
        } else if (faqSection) {
            faqSection.style.display = 'none';
        }
    }

    // Add message to chat
    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${type}`;
        messageDiv.textContent = text;
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        // Hide FAQ when messages are added (after welcome message)
        toggleFAQ();
    }

    // FAQ click handlers
    const faqItems = document.querySelectorAll('.chatbot-faq-item');
    faqItems.forEach(item => {
        item.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            chatbotInput.value = question;
            sendMessage();
        });
    });

    // Send button click
    if (chatbotSend) {
        chatbotSend.addEventListener('click', sendMessage);
    }

    // Enter key to send
    if (chatbotInput) {
        chatbotInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Add welcome message
    addMessage('Hello! I can help you with questions about MOA, registration, verification, repository, profile, and announcements. How can I assist you?', 'bot');
    
    // Initial FAQ display
    toggleFAQ();
});

