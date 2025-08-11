<template>
  <div v-if="currentUser" class="chat-container">
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
        <div class="channel-search" ref="channelSearchWrap">
          <input
            v-model="channelSearch"
            @focus="openChannelDropdown"
            @keyup.enter="performChannelSearch"
            @input="onChannelSearchInput"
            placeholder="Search public channels..."
            class="message-input"
          />
          <div v-show="showChannelDropdown" class="public-channel-dropdown">
            <div
              v-for="pub in publicChannelResults"
              :key="pub._id"
              class="channel-item public-result"
              @click="joinAndOpen(pub)"
            >
              <span class="channel-name"># {{ pub.name }}</span>
              <span class="join-indicator">Join</span>
            </div>
            <div v-if="!publicChannelResults.length" class="public-empty">No more channels to show</div>
          </div>
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
        <h3 v-if="currentChannel" @click="openChannelPanel" style="cursor: pointer"># {{ currentChannel.name }}</h3>
        <h3 v-else-if="currentPrivateChat">💬 {{ currentPrivateChat.username }}</h3>
        <p v-if="currentChannel?.description" class="channel-description">
          {{ currentChannel.description }}
        </p>
      </div>
      
      <div v-else class="welcome-screen">
        <h2>Welcome to IronCircle!</h2>
        <p>Select a channel or start a private conversation to begin chatting.</p>
      </div>
      
      <!-- Channel Panel (replaces chat when open) -->
      <div v-if="showChannelPanel && currentChannel" class="messages-container">
        <div class="messages" style="padding: 16px;">
          <div style="margin-bottom:12px; display:flex; gap:8px; align-items:center;">
            <input v-model="channelMessageQuery" @input="onChannelMessageQuery" placeholder="Search messages in #{{ currentChannel.name }}" class="message-input" />
            <button class="send-btn" @click="closeChannelPanel">Close</button>
          </div>
          <div v-if="isCurrentUserAdmin" style="margin-bottom:16px;">
            <h4>Admin Tools</h4>
            <div class="form-group">
              <label>Name</label>
              <input v-model="channelEdit.name" type="text" />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea v-model="channelEdit.description"></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" @click="resetChannelEdit">Reset</button>
              <button type="submit" @click="saveChannelMeta">Save</button>
            </div>
          </div>
          <div>
            <h4>Members</h4>
            <div v-for="m in channelMembers" :key="m._id" class="user-item" style="justify-content:space-between;">
              <div style="display:flex; gap:8px; align-items:center;">
                <div class="user-avatar">{{ m.username.charAt(0).toUpperCase() }}</div>
                <span class="user-name">{{ m.username }}</span>
              </div>
              <div v-if="isCurrentUserAdmin && m._id !== currentUser?._id" style="display:flex; gap:8px;">
                <button class="logout-btn" @click="toggleAdmin(m)">{{ isAdmin(m) ? 'Remove admin' : 'Make admin' }}</button>
                <button class="logout-btn" @click="removeMember(m)">Remove</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div v-else-if="currentChannel || currentPrivateChat" class="messages-container">
        <div class="messages" ref="messagesContainer">
                     <div
             v-for="message in messages"
             :key="message._id"
             :class="['message', { 'own-message': message.sender._id === currentUser?._id, 'clickable': message.sender._id === currentUser?._id && !message.isDeleted }]"
             @click="handleMessageClick(message)"
           >
            <div class="message-header">
              <span class="message-author">{{ message.sender.username }}</span>
              <span class="message-time">{{ formatTime(message.createdAt) }}</span>
              <span v-if="message.isEdited" class="edited-indicator">(edited)</span>
            </div>
            <div class="message-content">
              <div v-if="message.content" :class="{ 'deleted-message': message.isDeleted }">{{ message.content }}</div>
              <div v-if="message.fileData && !message.isDeleted" class="file-attachment">
                <div class="file-info-container">
                  <span class="file-icon">📄</span>
                  <div class="file-details">
                    <span class="file-name-display">{{ message.fileName }}</span>
                    <span class="file-size-display">{{ formatFileSize(message.fileSize) }}</span>
                  </div>
                </div>
                <button @click.stop="downloadFile(message.fileData, message.fileName, message.fileMimeType)" class="download-btn">Download</button>
              </div>
            </div>
            <div class="message-actions-row" v-if="activeMessageMenu === message._id">
              <button @click.stop="openEditModal(message)">Edit</button>
              <button @click.stop="deleteMessage(message._id)">Delete</button>
            </div>
          </div>
        </div>
        
        <!-- Typing Indicator -->
        <div v-if="typingUsers.length > 0" class="typing-indicator">
          {{ typingUsers.join(', ') }} {{ typingUsers.length === 1 ? 'is' : 'are' }} typing...
        </div>
        
        <!-- Message Input -->
        <div class="message-input-container">
          <div v-if="selectedFile" class="file-staging">
            <span class="file-name">{{ selectedFile.name }}</span>
            <button @click="removeSelectedFile" class="remove-file-btn">&times;</button>
          </div>
          <div class="input-wrapper">
            <input
              v-model="newMessage"
              @keyup.enter="sendMessage"
              @input="handleTyping"
              placeholder="Type a message..."
              class="message-input"
              :disabled="!currentChannel && !currentPrivateChat"
            />
            <input type="file" @change="handleFileUpload" ref="fileInput" style="display: none;" />
            <button @click="triggerFileUpload" class="attach-btn">📎</button>
            <button @click="sendMessage" class="send-btn" :disabled="!newMessage.trim() && !selectedFile">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Edit Message Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal" @click.stop>
        <h3>Edit Message</h3>
        <form @submit.prevent="submitEdit">
          <div class="form-group">
            <textarea v-model="editingMessageContent" class="message-input" rows="4"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeEditModal">Cancel</button>
            <button type="submit">Save Changes</button>
          </div>
        </form>
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
  <div v-else class="loading-container">
    <h2>Loading Chat...</h2>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { io, Socket } from 'socket.io-client';
import { useToast } from 'vue-toastification';

export default defineComponent({
  name: 'ChatInterface',
  setup() {
    const store = useStore();
    const router = useRouter();
    const socket = ref<Socket | null>(null);
    const messagesContainer = ref<HTMLElement | null>(null);
    const toast = useToast();
    
    // Reactive data
    const newMessage = ref('');
    const selectedFile = ref<File | null>(null);
    const fileInput = ref<HTMLInputElement | null>(null);
    const showCreateChannel = ref(false);
    const channelSearch = ref('');
    const showChannelDropdown = ref(false);
    const channelSearchWrap = ref<HTMLElement | null>(null);
    const channelSearchDebounce = ref<number | null>(null);
    const currentPrivateChat = ref<any>(null);
    const typingUsers = ref<string[]>([]);
    const typingTimeout = ref<number | null>(null);
    const showChannelPanel = ref(false);
    const channelMessageQuery = ref('');
    const channelMessageQueryDebounce = ref<number | null>(null);
    const channelEdit = ref<{ name: string; description: string }>({ name: '', description: '' });
    const channelMembers = ref<any[]>([]);
    const activeMessageMenu = ref<string | null>(null);
    const showEditModal = ref(false);
    const editingMessage = ref<any>(null);
    const editingMessageContent = ref('');
    
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
    const publicChannelResults = computed(() => store.state.publicChannelResults);
    const isUserOnline = computed(() => store.getters.isUserOnline);
    const isCurrentUserAdmin = computed(() => {
      const ch: any = currentChannel.value;
      const me = currentUser.value;
      if (!ch || !me || !ch.admins) return false;
      return ch.admins.some((id: any) => id === me._id || id?._id === me._id);
    });
    
    // Methods
    const connectSocket = () => {
      // Cleanup any existing socket to avoid duplicate listeners
      if (socket.value) {
        try { socket.value.off(); } catch {}
        try { socket.value.offAny?.(); } catch {}
        try { socket.value.disconnect(); } catch {}
      }
       const token = store.getters.token;
       if (!token) return;
      
             socket.value = io('http://localhost:3001');
       
       socket.value.on('connect_error', (error) => {
         console.error('Socket connection error:', error);
       });
       
       socket.value.on('error', (error) => {
         console.error('Socket error:', error);
       });
      
             socket.value.on('connect', () => {
         console.log('Connected to server via WebSocket');
         socket.value?.emit('authenticate', token);
       });
      
             socket.value.on('authenticated', (data) => {
         if (data.success) {
           console.log('Socket authenticated successfully');
           loadInitialData();
         } else {
           console.error('Authentication failed:', data.message);
         }
       });
      
      // Ensure single handler registration
      socket.value.off('new_message');
      socket.value.on('new_message', (message) => {
        if (
          (currentChannel.value && currentChannel.value._id === message.channel) ||
          (currentPrivateChat.value && currentPrivateChat.value._id === message.sender._id)
        ) {
          store.dispatch('addMessage', message);
          scrollToBottom();
        }
      });
      
      socket.value.off('message_deleted');
      socket.value.on('message_deleted', (data) => {
        store.dispatch('deleteMessage', data._id);
      });
      
      socket.value.off('message_edited');
      socket.value.on('message_edited', (message) => {
        store.dispatch('editMessage', message);
      });

      socket.value.off('private_message');
      socket.value.on('private_message', (message) => {
        if (
          (currentPrivateChat.value &&
            (message.recipient === currentPrivateChat.value._id || message.sender._id === currentPrivateChat.value._id)
          )
        ) {
          store.dispatch('addMessage', message);
          scrollToBottom();
        }
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
      showChannelPanel.value = false;
      // Show cached messages immediately (persisted in localStorage), then refresh from server
      const cached = (store.getters.getChannelMessages && store.getters.getChannelMessages(channel._id)) || [];
      store.commit('SET_MESSAGES', cached);
      store.dispatch('fetchMessages', channel._id);
      socket.value?.emit('join_channel', channel._id);
      scrollToBottom();
    };

    const openChannelPanel = async () => {
      if (!currentChannel.value) return;
      showChannelPanel.value = true;
      channelEdit.value = { name: (currentChannel.value as any).name, description: (currentChannel.value as any).description || '' };
      // fetch members
      try {
        const res = await fetch(`${process.env.VUE_APP_API_URL || 'http://localhost:3001/api'}/channels/${(currentChannel.value as any)._id}/members`, {
          headers: { Authorization: `Bearer ${store.getters.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          channelMembers.value = data.members || [];
        }
      } catch {}
    };

    const closeChannelPanel = () => {
      showChannelPanel.value = false;
      channelMessageQuery.value = '';
    };

    const onChannelMessageQuery = () => {
      if (channelMessageQueryDebounce.value) clearTimeout(channelMessageQueryDebounce.value);
      channelMessageQueryDebounce.value = setTimeout(() => {
        if (!currentChannel.value) return;
        store.dispatch('fetchMessages', { channelId: (currentChannel.value as any)._id, q: channelMessageQuery.value.trim() });
      }, 600) as unknown as number;
    };

    const resetChannelEdit = () => {
      if (!currentChannel.value) return;
      channelEdit.value = { name: (currentChannel.value as any).name, description: (currentChannel.value as any).description || '' };
    };

    const saveChannelMeta = async () => {
      if (!currentChannel.value) return;
      try {
        await fetch(`${process.env.VUE_APP_API_URL || 'http://localhost:3001/api'}/channels/${(currentChannel.value as any)._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${store.getters.token}`
          },
          body: JSON.stringify(channelEdit.value)
        });
        await store.dispatch('fetchChannels');
      } catch {}
    };

    const isAdmin = (member: any) => {
      const ch: any = currentChannel.value;
      if (!ch || !ch.admins) return false;
      return ch.admins.some((id: any) => id === member._id || id?._id === member._id);
    };

    const toggleAdmin = async (member: any) => {
      if (!currentChannel.value) return;
      const action = isAdmin(member) ? 'remove' : 'add';
      try {
        const res = await fetch(`${process.env.VUE_APP_API_URL || 'http://localhost:3001/api'}/channels/${(currentChannel.value as any)._id}/admins`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${store.getters.token}`
          },
          body: JSON.stringify({ userId: member._id, action })
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.message || 'Action failed');
          return;
        }
        await store.dispatch('fetchChannels');
        await openChannelPanel();
      } catch {
        toast.error('An unexpected error occurred');
      }
    };

    const removeMember = async (member: any) => {
      if (!currentChannel.value) return;
      try {
        const res = await fetch(`${process.env.VUE_APP_API_URL || 'http://localhost:3001/api'}/channels/${(currentChannel.value as any)._id}/members/${member._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${store.getters.token}` }
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.message || 'Action failed');
          return;
        }
        await store.dispatch('fetchChannels');
        await openChannelPanel();
      } catch {
        toast.error('An unexpected error occurred');
      }
    };

    const handleMessageClick = (message: any) => {
      // currentUser is guaranteed to exist here because of the v-if in the template
      if (message.sender._id !== currentUser.value._id || message.isDeleted) {
        return;
      }
      toggleMessageMenu(message._id);
    };

    const toggleMessageMenu = (messageId: string) => {
      if (activeMessageMenu.value === messageId) {
        activeMessageMenu.value = null;
      } else {
        activeMessageMenu.value = messageId;
      }
    };

    const openEditModal = (message: any) => {
      editingMessage.value = message;
      editingMessageContent.value = message.content;
      showEditModal.value = true;
      activeMessageMenu.value = null;
    };

    const closeEditModal = () => {
      showEditModal.value = false;
      editingMessage.value = null;
      editingMessageContent.value = '';
    };

    const submitEdit = () => {
      if (editingMessage.value && editingMessageContent.value.trim()) {
        socket.value?.emit('edit_message', {
          messageId: editingMessage.value._id,
          newContent: editingMessageContent.value
        });
        closeEditModal();
      }
    };

    const deleteMessage = (messageId: string) => {
      socket.value?.emit('delete_message', messageId);
      activeMessageMenu.value = null;
    };

    const isImage = (mimeType?: string) => {
      return mimeType?.startsWith('image/');
    };

    const formatFileSize = (bytes?: number) => {
      if (!bytes) return '';
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const downloadFile = (fileData: string, fileName: string, mimeType?: string) => {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const triggerFileUpload = () => {
      fileInput.value?.click();
    };

    const handleFileUpload = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast.error('File size exceeds 5MB limit.');
          return;
        }
        selectedFile.value = file;
        toast.info(`Selected file: ${file.name}`);
      }
    };

    const removeSelectedFile = () => {
      selectedFile.value = null;
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    };

    const performChannelSearch = async () => {
      const q = channelSearch.value.trim();
      if (!q) return;
      await store.dispatch('searchPublicChannels', q);
      showChannelDropdown.value = true;
    };

    const joinAndOpen = async (pub: any) => {
      try {
        await store.dispatch('joinPublicChannel', pub._id);
        channelSearch.value = '';
        await store.dispatch('searchPublicChannels', '');
        closeChannelDropdown();
        const joined = (channels.value as any[]).find(c => c._id === pub._id);
        if (joined) selectChannel(joined);
      } catch (e) {}
    };

    const openChannelDropdown = async () => {
      showChannelDropdown.value = true;
      // Load a few suggestions with empty query
      await store.dispatch('searchPublicChannels', '');
    };

    const closeChannelDropdown = () => {
      showChannelDropdown.value = false;
    };

    const onChannelSearchInput = async () => {
      // Debounce API search until user stops typing
      if (channelSearchDebounce.value) {
        clearTimeout(channelSearchDebounce.value);
      }
      channelSearchDebounce.value = setTimeout(async () => {
        await store.dispatch('searchPublicChannels', channelSearch.value.trim());
        showChannelDropdown.value = true;
      }, 800) as unknown as number;
    };

    const onClickOutside = (e: MouseEvent) => {
      if (!channelSearchWrap.value) return;
      if (!channelSearchWrap.value.contains(e.target as Node)) {
        closeChannelDropdown();
      }
    };
    
    const startPrivateChat = (user: any) => {
      currentPrivateChat.value = user;
      store.commit('SET_CURRENT_CHANNEL', null);
      // Load private messages from server (could be cached similarly later)
      store.dispatch('fetchPrivateMessages', user._id);
    };
    
    const sendMessage = () => {
      if (!newMessage.value.trim() && !selectedFile.value) return;
      
      const reader = new FileReader();
      const file = selectedFile.value;

      const send = (fileData?: string) => {
        const messagePayload: any = {
          content: newMessage.value,
        };

        if (file && fileData) {
          messagePayload.fileData = fileData;
          messagePayload.fileName = file.name;
          messagePayload.fileMimeType = file.type;
          messagePayload.fileSize = file.size;
        }

        if (currentChannel.value) {
          messagePayload.channelId = currentChannel.value._id,
          socket.value?.emit('send_message', messagePayload);
        } else if (currentPrivateChat.value) {
          messagePayload.recipientId = currentPrivateChat.value._id,
          socket.value?.emit('private_message', messagePayload);
        }
        
        newMessage.value = '';
        selectedFile.value = null;
        if (fileInput.value) fileInput.value.value = '';
      };

      if (file) {
        reader.onload = (e) => {
          send(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        send();
      }
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
     onMounted(async () => {
       if (!store.getters.isAuthenticated) {
         router.push('/login');
         return;
       }
       // Fetch fresh user data to prevent race conditions
       await store.dispatch('getCurrentUser');
       connectSocket();
     });
    
    // Watch for channel changes to scroll to bottom
    watch(messages, () => {
      scrollToBottom();
    });

    onMounted(() => {
      document.addEventListener('click', onClickOutside);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', onClickOutside);
      if (socket.value) {
        try { socket.value.off(); } catch {}
        try { socket.value.offAny?.(); } catch {}
        try { socket.value.disconnect(); } catch {}
      }
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
      publicChannelResults,
      channelSearch,
      showChannelDropdown,
      channelSearchWrap,
      isUserOnline,
      selectChannel,
      openChannelPanel,
      closeChannelPanel,
      performChannelSearch,
      joinAndOpen,
      openChannelDropdown,
      closeChannelDropdown,
      onChannelSearchInput,
      channelMessageQuery,
      onChannelMessageQuery,
      showChannelPanel,
      channelEdit,
      channelMembers,
      isCurrentUserAdmin,
      resetChannelEdit,
      saveChannelMeta,
      isAdmin,
      toggleAdmin,
      removeMember,
      handleMessageClick,
      activeMessageMenu,
      openEditModal,
      closeEditModal,
      submitEdit,
      showEditModal,
      editingMessageContent,
      deleteMessage,
      isImage,
      downloadFile,
      formatFileSize,
      triggerFileUpload,
      handleFileUpload,
      fileInput,
      selectedFile,
      removeSelectedFile,
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

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: sans-serif;
  color: #333;
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

.public-channel-dropdown {
  position: relative;
  background: #fff;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  margin-top: 6px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
}

.channel-item.public-result {
  background: #f7fbff;
  border: 1px dashed #bcdcff;
}

.channel-item.public-result:hover {
  background: #eef7ff;
}

.join-indicator {
  font-size: 12px;
  color: #1e88e5;
  margin-left: auto;
}

.public-empty {
  padding: 8px 12px;
  color: #777;
  font-size: 13px;
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

/* Offline visual state */
.user-item:not(.online) .user-name {
  color: #999;
  opacity: 0.6;
}

.user-item:not(.online) .user-avatar {
  background: #ccc;
  opacity: 0.6;
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
  position: relative;
  align-self: flex-start;
  width: -moz-fit-content;
  width: fit-content;
  display: flex;
  flex-direction: column;
}

.message.own-message {
  align-self: flex-end;
}

.message.clickable {
  cursor: pointer;
}

.message-actions-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  border-top: 1px solid rgba(0,0,0,0.1);
  padding-top: 8px;
}

.message-actions-row button {
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: white;
}

.message-actions-row button:first-child {
  background-color: #3b82f6;
}

.message-actions-row button:first-child:hover {
  background-color: #2563eb;
}

.message-actions-row button:last-child {
  background-color: #ef4444;
}

.message-actions-row button:last-child:hover {
  background-color: #dc2626;
}

.message.own-message .message-actions-row {
  border-top: 1px solid rgba(255,255,255,0.2);
  justify-content: flex-end;
}

.edited-indicator {
  font-size: 12px;
  color: #999;
  margin-left: 5px;
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
  word-break: break-word;
}

.deleted-message {
  font-style: italic;
  color: #999;
}

.file-attachment {
  margin-top: 10px;
  padding: 10px;
  background-color: #f1f3f5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-info-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-icon {
  font-size: 24px;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name-display {
  font-weight: 500;
}

.file-size-display {
  font-size: 12px;
  color: #666;
}

.chat-image {
  max-width: 100%;
  border-radius: 8px;
}

.download-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  align-self: flex-start;
}

.message.own-message .message-content {
  background: #667eea;
  color: white;
}

.message.own-message .file-attachment {
  background-color: #5a67d8;
}

.message.own-message .file-size-display {
  color: #e2e8f0;
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
  flex-direction: column;
  gap: 12px;
}

.input-wrapper {
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

.attach-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0 10px;
}

.file-staging {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background-color: #f0f2f5;
  border-radius: 8px;
  font-size: 14px;
}

.file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-file-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 0 5px;
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
