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
    onlineUsers: new Set() as Set<string>,
    isAuthenticated: !!(localStorage.getItem('token')),
    loading: false,
    error: null as string | null
  },
  
  mutations: {
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
      state.messages = messages;
    },
    SET_CHANNEL_MESSAGES(state, payload: { channelId: string; messages: any[] }) {
      state.channelMessages[payload.channelId] = payload.messages;
      localStorage.setItem('channelMessages', JSON.stringify(state.channelMessages));
    },
    ADD_MESSAGE(state, message) {
      state.messages.push(message);
    },
    ADD_CHANNEL_MESSAGE(state, payload: { channelId: string; message: any }) {
      if (!state.channelMessages[payload.channelId]) {
        state.channelMessages[payload.channelId] = [];
      }
      state.channelMessages[payload.channelId].push(payload.message);
      localStorage.setItem('channelMessages', JSON.stringify(state.channelMessages));
    },
    SET_USERS(state, users) {
      state.users = users;
      localStorage.setItem('users', JSON.stringify(users));
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
    
    async fetchMessages({ commit }, channelId) {
      try {
        console.log('Fetching messages for channel:', channelId);
        const response = await axios.get(`${API_URL}/channels/${channelId}/messages`);
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
    async fetchPrivateMessages({ commit }, userId: string) {
      try {
        const response = await axios.get(`${API_URL}/users/${userId}/messages`);
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
