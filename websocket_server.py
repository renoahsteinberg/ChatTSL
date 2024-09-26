import os
import ssl
import socketio
import eventlet
from socketio import WSGIApp

sio = socketio.Server()

connected_users = {}
user_sids = {}

# WebSocket event handlers
@sio.event
def connect(sid, environ):
    print(f'Client connected: {sid}')
    # Add client to 'broadcast' room
    sio.enter_room(sid, 'broadcast')

@sio.event
def set_username(sid, username):
    connected_users[sid] = username
    user_sids[username] = sid
    print(f'Username set for {sid}: {username}')
    # Broadcast the updated user list
    sio.emit('user_list', list(user_sids.keys()), room='broadcast')
    # Notify all clients that a user has joined
    sio.emit('message', f'{username} has joined the chat.', room='broadcast')

@sio.event
def message(sid, data):
    username = connected_users.get(sid, 'Unknown')
    print(f'Message from {username}: {data}')
    # Broadcast the message to all clients
    sio.emit('message', f'{username}: {data}', room='broadcast')

@sio.event
def private_message(sid, data):
    recipient_username = data['recipient']
    message = data['message']
    sender_username = connected_users.get(sid, 'Unknown')
    recipient_sid = user_sids.get(recipient_username)

    if recipient_sid:
        sio.emit('private_message', {
            'sender': sender_username,
            'message': message
        }, to=recipient_sid)
        sio.emit('open_private_chat', sender_username, to=recipient_sid)
        sio.emit('private_message_sent', {
            'recipient': recipient_username,
            'message': message
        }, to=sid)
    else:
        sio.emit('error', {
            'message': f'User {recipient_username} not found'
        }, to=sid)

@sio.event
def disconnect(sid):
    username = connected_users.pop(sid, 'Unknown')
    user_sids.pop(username, None)
    print(f'Client disconnected: {sid} ({username})')
    # Remove client from 'broadcast' room
    sio.leave_room(sid, 'broadcast')
    # Broadcast the updated user list
    sio.emit('user_list', list(user_sids.keys()), room='broadcast')
    # Notify all clients that a user has left
    sio.emit('message', f'{username} has left the chat.', room='broadcast')

app = WSGIApp(sio, static_files={
    '/': 'chat.html',
    '/chat.js': 'chat.js',
    '/style.css': 'style.css',
})

def run_server():
    server_address = ('127.0.0.1', 8443)
    cert_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cert.pem')
    key_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'key.pem')

    print(f'Starting HTTPS WebSocket Server on https://{server_address[0]}:{server_address[1]}')

    # Wrap SSL
    listener = eventlet.wrap_ssl(eventlet.listen(server_address),
                                 certfile=cert_file,
                                 keyfile=key_file,
                                 server_side=True)

    eventlet.wsgi.server(listener, app)

if __name__ == '__main__':
    run_server()
