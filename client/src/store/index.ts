import { createStore } from 'vuex';
import axios from 'axios';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3001/api';

export default createStore({
  state: {
    user: null as any,
    token: localStorage.getItem('token') || null,
    channels: [] as any[],
    currentChannel: null as any,
    messages: [] as any[],
    users: [] as any[],
    onlineUsers: new Set() as Set<string>,
    isAuthenticated: false,
    loading: false,
    error: null as string | null
  },
  
  mutations: {
    SET_USER(state, user) {
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
    },
    ADD_CHANNEL(state, channel) {
      state.channels.push(channel);
    },
    SET_CURRENT_CHANNEL(state, channel) {
      state.currentChannel = channel;
    },
    SET_MESSAGES(state, messages) {
      state.messages = messages;
    },
    ADD_MESSAGE(state, message) {
      state.messages.push(message);
    },
    SET_USERS(state, users) {
      state.users = users;
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
      if (!localStorage.getItem('token')) return;
      
      try {
        const response = await axios.get(`${API_URL}/auth/me`);
        commit('SET_USER', response.data.user);
        commit('SET_TOKEN', localStorage.getItem('token'));
      } catch (error) {
        commit('SET_TOKEN', null);
        commit('SET_USER', null);
      }
    },
    
    logout({ commit }) {
      commit('SET_USER', null);
      commit('SET_TOKEN', null);
      commit('SET_CHANNELS', []);
      commit('SET_MESSAGES', []);
      commit('SET_CURRENT_CHANNEL', null);
      commit('SET_USERS', []);
    },
    
    async fetchChannels({ commit }) {
      try {
        const response = await axios.get(`${API_URL}/channels`);
        commit('SET_CHANNELS', response.data);
      } catch (error) {
        console.error('Error fetching channels:', error);
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
        const response = await axios.get(`${API_URL}/channels/${channelId}/messages`);
        commit('SET_MESSAGES', response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    },
    
    async fetchUsers({ commit }) {
      try {
        const response = await axios.get(`${API_URL}/users`);
        commit('SET_USERS', response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    },
    
    addMessage({ commit }, message) {
      commit('ADD_MESSAGE', message);
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
    currentChannel: state => state.currentChannel,
    channels: state => state.channels,
    messages: state => state.messages,
    users: state => state.users,
    onlineUsers: state => state.onlineUsers,
    loading: state => state.loading,
    error: state => state.error,
    isUserOnline: state => (userId: string) => state.onlineUsers.has(userId)
  }
});
