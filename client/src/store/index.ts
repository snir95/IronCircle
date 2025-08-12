import { createStore } from 'vuex';
import axios from 'axios';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3001/api';

// Set up axios interceptor for authentication
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default createStore({
  state: {
    user: null as any,
    token: localStorage.getItem('token') || null,
    channels: JSON.parse(localStorage.getItem('channels') || '[]') as any[],
    currentChannel: JSON.parse(localStorage.getItem('currentChannel') || 'null') as any,
    messages: [] as any[],
    channelMessages: JSON.parse(localStorage.getItem('channelMessages') || '{}') as Record<string, any[]>,
    users: JSON.parse(localStorage.getItem('users') || '[]') as any[],
    publicChannelResults: [] as any[],
    onlineUsers: new Set() as Set<string>,
    isAuthenticated: !!(localStorage.getItem('token')),
    loading: false,
    error: null as string | null,
    isDarkMode: localStorage.getItem('isDarkMode') === 'true'
  },
  
  mutations: {
    TOGGLE_THEME(state) {
      state.isDarkMode = !state.isDarkMode;
      localStorage.setItem('isDarkMode', state.isDarkMode.toString());
    },
    SET_USER(state, user) {
      state.user = user;
      state.isAuthenticated = !!user;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    },
    SET_USER_FROM_STORAGE(state, user) {
      state.user = user;
      state.isAuthenticated = !!user;
    },
    SET_TOKEN(state, token) {
      state.token = token;
      if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    },
    SET_CHANNELS(state, channels) {
      state.channels = channels;
      localStorage.setItem('channels', JSON.stringify(channels));
    },
    ADD_CHANNEL(state, channel) {
      state.channels.push(channel);
      localStorage.setItem('channels', JSON.stringify(state.channels));
    },
    SET_CURRENT_CHANNEL(state, channel) {
      state.currentChannel = channel;
      localStorage.setItem('currentChannel', JSON.stringify(channel));
    },
    SET_MESSAGES(state, messages) {
      // De-duplicate by _id in case of repeated events
      const seen = new Set<string>();
      state.messages = (messages || []).filter((m: any) => {
        if (!m || !m._id) return true;
        if (seen.has(m._id)) return false;
        seen.add(m._id);
        return true;
      });
    },
    SET_CHANNEL_MESSAGES(state, payload: { channelId: string; messages: any[] }) {
      state.channelMessages[payload.channelId] = payload.messages;
      localStorage.setItem('channelMessages', JSON.stringify(state.channelMessages));
    },
    ADD_MESSAGE(state, message) {
      if (!message) return;
      const id = message._id;
      if (id && state.messages.some((m: any) => m && m._id === id)) return;
      state.messages.push(message);
    },
    ADD_CHANNEL_MESSAGE(state, payload: { channelId: string; message: any }) {
      if (!state.channelMessages[payload.channelId]) {
        state.channelMessages[payload.channelId] = [];
      }
      const list = state.channelMessages[payload.channelId];
      const id = payload.message?._id;
      if (!(id && list.some((m: any) => m && m._id === id))) {
        list.push(payload.message);
      }
      localStorage.setItem('channelMessages', JSON.stringify(state.channelMessages));
    },
    UPDATE_MESSAGE(state, updatedMessage) {
      const index = state.messages.findIndex(m => m._id === updatedMessage._id);
      if (index !== -1) {
        state.messages.splice(index, 1, updatedMessage);
      }
    },
    SET_USERS(state, users) {
      state.users = users;
      localStorage.setItem('users', JSON.stringify(users));
    },
    SET_PUBLIC_CHANNEL_RESULTS(state, channels) {
      state.publicChannelResults = channels || [];
    },
    ADD_ONLINE_USER(state, userId) {
      state.onlineUsers.add(userId);
    },
    REMOVE_ONLINE_USER(state, userId) {
      state.onlineUsers.delete(userId);
    },
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_ERROR(state, error) {
      state.error = error;
    },
    CLEAR_ERROR(state) {
      state.error = null;
    }
  },
  
  actions: {
    initializeStore({ commit }) {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        commit('SET_TOKEN', token);
        commit('SET_USER_FROM_STORAGE', JSON.parse(user));
      }
    },
    
    async register({ commit }, userData) {
      commit('SET_LOADING', true);
      commit('CLEAR_ERROR');
      
      try {
        const response = await axios.post(`${API_URL}/auth/register`, userData);
        commit('SET_USER', response.data.user);
        commit('SET_TOKEN', response.data.token);
        return response.data;
      } catch (error: any) {
        const message = error.response?.data?.message || 'Registration failed';
        commit('SET_ERROR', message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    async login({ commit }, credentials) {
      commit('SET_LOADING', true);
      commit('CLEAR_ERROR');
      
      try {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        commit('SET_USER', response.data.user);
        commit('SET_TOKEN', response.data.token);
        return response.data;
      } catch (error: any) {
        const message = error.response?.data?.message || 'Login failed';
        commit('SET_ERROR', message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    async getCurrentUser({ commit }) {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await axios.get(`${API_URL}/auth/me`);
        commit('SET_USER', response.data.user);
        commit('SET_TOKEN', token);
      } catch (error: any) {
        // Only clear token if it's a 401 (unauthorized) error
        if (error.response?.status === 401) {
          commit('SET_TOKEN', null);
          commit('SET_USER', null);
        }
        // For other errors (network, server down), keep the token and try again later
        console.warn('Failed to get current user, but keeping token:', error.message);
      }
    },
    
    logout({ commit }) {
      commit('SET_USER', null);
      commit('SET_TOKEN', null);
      commit('SET_CHANNELS', []);
      commit('SET_MESSAGES', []);
      commit('SET_CURRENT_CHANNEL', null);
      commit('SET_USERS', []);
      // Clear localStorage
      localStorage.removeItem('channels');
      localStorage.removeItem('currentChannel');
      localStorage.removeItem('users');
    },
    
    async fetchChannels({ commit }) {
      try {
        const response = await axios.get(`${API_URL}/channels`);
        commit('SET_CHANNELS', response.data);
      } catch (error: any) {
        console.error('Error fetching channels:', error);
        // Don't clear existing channels on error, keep what we have in localStorage
      }
    },
    
    async createChannel({ commit }, channelData) {
      try {
        const response = await axios.post(`${API_URL}/channels`, channelData);
        commit('ADD_CHANNEL', response.data);
        return response.data;
      } catch (error) {
        console.error('Error creating channel:', error);
        throw error;
      }
    },
    
    async fetchMessages({ commit }, channelIdOrPayload: any) {
      try {
        const channelId = typeof channelIdOrPayload === 'string' ? channelIdOrPayload : channelIdOrPayload.channelId;
        const q = typeof channelIdOrPayload === 'object' ? channelIdOrPayload.q : undefined;
        console.log('Fetching messages for channel:', channelId, q ? `(q="${q}")` : '');
        const response = await axios.get(`${API_URL}/channels/${channelId}/messages`, {
          params: q ? { q } : undefined
        });
        console.log('Messages response:', response.data);
        commit('SET_MESSAGES', response.data);
        commit('SET_CHANNEL_MESSAGES', { channelId, messages: response.data });
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    },
    
    async fetchUsers({ commit }) {
      try {
        const response = await axios.get(`${API_URL}/users`);
        commit('SET_USERS', response.data);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        // Don't clear existing users on error, keep what we have in localStorage
      }
    },
    async searchPublicChannels({ commit }, q: string) {
      try {
        const response = await axios.get(`${API_URL}/channels/search/public`, { params: { q } });
        commit('SET_PUBLIC_CHANNEL_RESULTS', response.data);
      } catch (error) {
        console.error('Error searching public channels:', error);
      }
    },
    async joinPublicChannel({ dispatch }, channelId: string) {
      try {
        await axios.post(`${API_URL}/channels/${channelId}/join`);
        await dispatch('fetchChannels');
      } catch (error) {
        console.error('Error joining channel:', error);
        throw error;
      }
    },
    async fetchPrivateMessages({ commit }, payload: { userId: string; q?: string }) {
      try {
        console.log('Fetching private messages:', payload);
        const response = await axios.get(`${API_URL}/users/${payload.userId}/messages`, {
          params: payload.q ? { q: payload.q } : undefined
        });
        commit('SET_MESSAGES', response.data);
      } catch (error) {
        console.error('Error fetching private messages:', error);
      }
    },
    
    addMessage({ commit, state }, message) {
      console.log('Adding message to store:', message);
      // If message belongs to a channel, also cache it by channel
      const channelId = typeof message.channel === 'object' && message.channel?._id
        ? message.channel._id
        : message.channel;
      if (channelId) {
        commit('ADD_CHANNEL_MESSAGE', { channelId, message });
        if (state.currentChannel && state.currentChannel._id === channelId) {
          commit('ADD_MESSAGE', message);
        }
      } else {
        commit('ADD_MESSAGE', message);
      }
    },
    
    userOnline({ commit }, userId) {
      commit('ADD_ONLINE_USER', userId);
    },
    
    userOffline({ commit }, userId) {
      commit('REMOVE_ONLINE_USER', userId);
    },
    
    deleteMessage({ commit, state }, messageId) {
      const message = state.messages.find(m => m._id === messageId);
      if (message) {
        const updatedMessage = {
          ...message,
          content: 'This message has been deleted.',
          isDeleted: true,
          fileData: undefined,
          fileName: undefined,
          fileMimeType: undefined,
          fileSize: undefined,
        };
        commit('UPDATE_MESSAGE', updatedMessage);
      }
    },
    
    editMessage({ commit, state }, updatedMessage) {
      const message = state.messages.find(m => m._id === updatedMessage._id);
      if (message) {
        const newMessage = { ...message, ...updatedMessage };
        commit('UPDATE_MESSAGE', newMessage);
      }
    }
  },
  
  getters: {
    isAuthenticated: state => state.isAuthenticated,
    currentUser: state => state.user,
    token: state => state.token,
    currentChannel: state => state.currentChannel,
    channels: state => state.channels,
    messages: state => state.messages,
    getChannelMessages: state => (channelId: string) => state.channelMessages[channelId] || [],
    users: state => state.users,
    onlineUsers: state => state.onlineUsers,
    loading: state => state.loading,
    error: state => state.error,
    isUserOnline: state => (userId: string) => state.onlineUsers.has(userId)
  }
});
