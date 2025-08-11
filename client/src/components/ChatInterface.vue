<template>
  <div class="chat-container">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>IronCircle</h3>
        <div class="user-info">
          <span>{{ currentUser?.username }}</span>
          <button @click="logout" class="logout-btn">Logout</button>
        </div>
      </div>
      
      <!-- Channel List -->
      <div class="channels-section">
        <div class="section-header">
          <h4>Channels</h4>
          <button @click="showCreateChannel = true" class="add-btn">+</button>
        </div>
        <div class="channel-list">
          <div
            v-for="channel in channels"
            :key="channel._id"
            @click="selectChannel(channel)"
            :class="['channel-item', { active: currentChannel?._id === channel._id }]"
          >
            <span class="channel-name"># {{ channel.name }}</span>
            <span v-if="channel.isPrivate" class="private-indicator">🔒</span>
          </div>
        </div>
      </div>
      
      <!-- User List -->
      <div class="users-section">
        <h4>Online Users</h4>
        <div class="user-list">
          <div
            v-for="user in users"
            :key="user._id"
            @click="startPrivateChat(user)"
            :class="['user-item', { online: isUserOnline(user._id) }]"
          >
            <div class="user-avatar">
              {{ user.username.charAt(0).toUpperCase() }}
            </div>
            <span class="user-name">{{ user.username }}</span>
            <div class="online-indicator" v-if="isUserOnline(user._id)"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Chat Area -->
    <div class="chat-main">
      <div v-if="currentChannel || currentPrivateChat" class="chat-header">
        <h3 v-if="currentChannel"># {{ currentChannel.name }}</h3>
        <h3 v-if="currentPrivateChat">💬 {{ currentPrivateChat.username }}</h3>
        <p v-if="currentChannel?.description" class="channel-description">
          {{ currentChannel.description }}
        </p>
      </div>
      
      <div v-else class="welcome-screen">
        <h2>Welcome to IronCircle!</h2>
        <p>Select a channel or start a private conversation to begin chatting.</p>
      </div>
      
      <!-- Messages Area -->
      <div v-if="currentChannel || currentPrivateChat" class="messages-container">
        <div class="messages" ref="messagesContainer">
          <div
            v-for="message in messages"
            :key="message._id"
            :class="['message', { 'own-message': message.sender._id === currentUser?.id }]"
          >
            <div class="message-header">
              <span class="message-author">{{ message.sender.username }}</span>
              <span class="message-time">{{ formatTime(message.createdAt) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>
        
        <!-- Typing Indicator -->
        <div v-if="typingUsers.length > 0" class="typing-indicator">
          {{ typingUsers.join(', ') }} {{ typingUsers.length === 1 ? 'is' : 'are' }} typing...
        </div>
        
        <!-- Message Input -->
        <div class="message-input-container">
          <input
            v-model="newMessage"
            @keyup.enter="sendMessage"
            @input="handleTyping"
            placeholder="Type a message..."
            class="message-input"
            :disabled="!currentChannel && !currentPrivateChat"
          />
          <button @click="sendMessage" class="send-btn" :disabled="!newMessage.trim()">
            Send
          </button>
        </div>
      </div>
    </div>
    
    <!-- Create Channel Modal -->
    <div v-if="showCreateChannel" class="modal-overlay" @click="showCreateChannel = false">
      <div class="modal" @click.stop>
        <h3>Create New Channel</h3>
        <form @submit.prevent="createChannel">
          <div class="form-group">
            <label>Channel Name</label>
            <input v-model="newChannel.name" type="text" required placeholder="Enter channel name" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="newChannel.description" placeholder="Enter channel description"></textarea>
          </div>
          <div class="form-group">
            <label>
              <input v-model="newChannel.isPrivate" type="checkbox" />
              Private Channel
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showCreateChannel = false">Cancel</button>
            <button type="submit">Create Channel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { io, Socket } from 'socket.io-client';

export default defineComponent({
  name: 'ChatInterface',
  setup() {
    const store = useStore();
    const router = useRouter();
    const socket = ref<Socket | null>(null);
    const messagesContainer = ref<HTMLElement | null>(null);
    
    // Reactive data
    const newMessage = ref('');
    const showCreateChannel = ref(false);
    const currentPrivateChat = ref<any>(null);
    const typingUsers = ref<string[]>([]);
    const typingTimeout = ref<number | null>(null);
    
    const newChannel = ref({
      name: '',
      description: '',
      isPrivate: false
    });
    
    // Computed properties
    const currentUser = computed(() => store.getters.currentUser);
    const channels = computed(() => store.getters.channels);
    const currentChannel = computed(() => store.getters.currentChannel);
    const messages = computed(() => store.getters.messages);
    const users = computed(() => store.getters.users);
    const isUserOnline = computed(() => store.getters.isUserOnline);
    
    // Methods
    const connectSocket = () => {
      const token = store.getters.token;
      if (!token) return;
      
      socket.value = io('http://localhost:3001');
      
      socket.value.on('connect', () => {
        console.log('Connected to server');
        socket.value?.emit('authenticate', token);
      });
      
      socket.value.on('authenticated', (data) => {
        if (data.success) {
          console.log('Authenticated with server');
          loadInitialData();
        }
      });
      
      socket.value.on('new_message', (message) => {
        store.dispatch('addMessage', message);
        scrollToBottom();
      });
      
      socket.value.on('private_message', (message) => {
        store.dispatch('addMessage', message);
        scrollToBottom();
      });
      
      socket.value.on('user_typing', (data) => {
        if (data.isTyping) {
          if (!typingUsers.value.includes(data.username)) {
            typingUsers.value.push(data.username);
          }
        } else {
          typingUsers.value = typingUsers.value.filter(user => user !== data.username);
        }
      });
      
      socket.value.on('user_online', (data) => {
        store.dispatch('userOnline', data.userId);
      });
      
      socket.value.on('user_offline', (data) => {
        store.dispatch('userOffline', data.userId);
      });
    };
    
    const loadInitialData = async () => {
      await Promise.all([
        store.dispatch('fetchChannels'),
        store.dispatch('fetchUsers')
      ]);
    };
    
    const selectChannel = (channel: any) => {
      store.commit('SET_CURRENT_CHANNEL', channel);
      currentPrivateChat.value = null;
      store.dispatch('fetchMessages', channel._id);
      socket.value?.emit('join_channel', channel._id);
      scrollToBottom();
    };
    
    const startPrivateChat = (user: any) => {
      currentPrivateChat.value = user;
      store.commit('SET_CURRENT_CHANNEL', null);
      store.commit('SET_MESSAGES', []);
    };
    
    const sendMessage = () => {
      if (!newMessage.value.trim()) return;
      
      if (currentChannel.value) {
        socket.value?.emit('send_message', {
          channelId: currentChannel.value._id,
          content: newMessage.value
        });
      } else if (currentPrivateChat.value) {
        socket.value?.emit('private_message', {
          recipientId: currentPrivateChat.value._id,
          content: newMessage.value
        });
      }
      
      newMessage.value = '';
    };
    
    const handleTyping = () => {
      if (currentChannel.value) {
        socket.value?.emit('typing', {
          channelId: currentChannel.value._id,
          isTyping: true
        });
        
        if (typingTimeout.value) {
          clearTimeout(typingTimeout.value);
        }
        
        typingTimeout.value = setTimeout(() => {
          socket.value?.emit('typing', {
            channelId: currentChannel.value._id,
            isTyping: false
          });
        }, 1000);
      }
    };
    
    const createChannel = async () => {
      try {
        await store.dispatch('createChannel', newChannel.value);
        showCreateChannel.value = false;
        newChannel.value = { name: '', description: '', isPrivate: false };
      } catch (error) {
        console.error('Error creating channel:', error);
      }
    };
    
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    };
    
    const formatTime = (date: string) => {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    const logout = () => {
      store.dispatch('logout');
      socket.value?.disconnect();
      router.push('/login');
    };
    
    // Lifecycle
    onMounted(() => {
      if (!store.getters.isAuthenticated) {
        router.push('/login');
        return;
      }
      
      connectSocket();
    });
    
    // Watch for channel changes to scroll to bottom
    watch(messages, () => {
      scrollToBottom();
    });
    
    return {
      newMessage,
      showCreateChannel,
      currentPrivateChat,
      typingUsers,
      newChannel,
      messagesContainer,
      currentUser,
      channels,
      currentChannel,
      messages,
      users,
      isUserOnline,
      selectChannel,
      startPrivateChat,
      sendMessage,
      handleTyping,
      createChannel,
      formatTime,
      logout
    };
  }
});
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: #f8f9fa;
}

.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e1e5e9;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.sidebar-header h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #666;
}

.logout-btn {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-size: 12px;
}

.logout-btn:hover {
  text-decoration: underline;
}

.channels-section, .users-section {
  padding: 20px;
  flex: 1;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h4 {
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.add-btn {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.channel-list, .user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.channel-item, .user-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease;
}

.channel-item:hover, .user-item:hover {
  background: #f1f3f4;
}

.channel-item.active {
  background: #667eea;
  color: white;
}

.channel-name {
  font-size: 14px;
}

.private-indicator {
  font-size: 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-name {
  font-size: 14px;
  flex: 1;
}

.online-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.user-item.online .user-name {
  font-weight: 500;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 20px;
  background: white;
  border-bottom: 1px solid #e1e5e9;
}

.chat-header h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.channel-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.welcome-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: #666;
}

.welcome-screen h2 {
  margin-bottom: 10px;
  color: #333;
}

.messages-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  max-width: 70%;
  align-self: flex-start;
}

.message.own-message {
  align-self: flex-end;
}

.message-header {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.message-author {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.message-time {
  font-size: 12px;
  color: #666;
}

.message-content {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  line-height: 1.4;
}

.message.own-message .message-content {
  background: #667eea;
  color: white;
}

.typing-indicator {
  padding: 10px 20px;
  color: #666;
  font-size: 12px;
  font-style: italic;
}

.message-input-container {
  padding: 20px;
  background: white;
  border-top: 1px solid #e1e5e9;
  display: flex;
  gap: 12px;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
}

.message-input:focus {
  outline: none;
  border-color: #667eea;
}

.send-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.send-btn:hover:not(:disabled) {
  background: #5a67d8;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
}

.modal h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-actions button {
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.modal-actions button[type="button"] {
  background: #e1e5e9;
  border: none;
  color: #333;
}

.modal-actions button[type="submit"] {
  background: #667eea;
  border: none;
  color: white;
}
</style>
