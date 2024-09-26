var socket;
var username;
var privateChats = {};

function connectToChat() {
    username = prompt("Enter your name:");
    if (!username) {
        alert("You must enter a name to join the chat!");
        return;
    }

    console.log('Connecting to WebSocket...');

    socket = io.connect('https://' + document.domain + ':' + location.port, { secure: true });

    socket.on('connect', function() {
        console.log('Connected to WebSocket');
        socket.emit('set_username', username);
    });

    socket.on('message', function(msg) {
        console.log('Message received: ' + msg);
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(msg));
        document.getElementById('messages').appendChild(li);
    });

    socket.on('user_list', function(userList) {
        console.log('User list updated:', userList);
        updateUserList(userList);
    });

    socket.on('private_message', function(data) {
        var sender = data.sender;
        var message = data.message;
        console.log('Private message from ' + sender + ': ' + message);
        openPrivateChat(sender);
        addMessageToPrivateChat(sender, sender + ': ' + message);
    });

    socket.on('open_private_chat', function(sender) {
        openPrivateChat(sender);
    });

    socket.on('disconnect', function() {
        console.log('Disconnected from WebSocket');
    });

    socket.on('connect_error', function(err) {
        console.error('Connection Error: ', err);
    });
}

function sendMessage() {
    var message = document.getElementById('myMessage').value;
    if (message.trim() !== "") {
        console.log('Sending message: ' + message);
        socket.emit('message', message);
        document.getElementById('myMessage').value = '';
    }
}

function sendPrivateMessage(recipient) {
    var input = document.getElementById('privateMessageInput_' + recipient);
    var message = input.value;
    if (message.trim() !== "") {
        socket.emit('private_message', {
            recipient: recipient,
            message: message
        });
        addMessageToPrivateChat(recipient, 'You: ' + message);
        input.value = '';
    }
}

function updateUserList(userList) {
    var userListElement = document.getElementById('userList');
    userListElement.innerHTML = ''; // Clear the existing list
    userList.forEach(function(user) {
        if (user !== username) {
            var li = document.createElement('li');
            li.textContent = user;
            li.onclick = function() {
                openPrivateChat(user);
            };
            userListElement.appendChild(li);
        }
    });
}

function openPrivateChat(recipient) {
    if (!privateChats[recipient]) {
        var chatWindow = document.createElement('div');
        chatWindow.className = 'private-chat-window';

        var header = document.createElement('h3');
        header.textContent = 'Chat with ' + recipient;
        chatWindow.appendChild(header);

        var messageList = document.createElement('ul');
        messageList.id = 'privateMessages_' + recipient;
        chatWindow.appendChild(messageList);

        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'privateMessageInput_' + recipient;
        input.placeholder = 'Type a message...';
        chatWindow.appendChild(input);

        var sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        sendButton.onclick = function() {
            sendPrivateMessage(recipient);
        };
        chatWindow.appendChild(sendButton);

        document.getElementById('private-chats-container').appendChild(chatWindow);
        privateChats[recipient] = chatWindow;
    }
}

function addMessageToPrivateChat(recipient, message) {
    var messageList = document.getElementById('privateMessages_' + recipient);
    if (messageList) {
        var li = document.createElement('li');
        li.textContent = message;
        messageList.appendChild(li);
    }
}

window.onload = connectToChat;
