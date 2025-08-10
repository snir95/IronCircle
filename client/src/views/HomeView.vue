<template>
  <div class="chat-container">
    <ul id="messages">
      <li v-for="(msg, index) in messages" :key="index">{{ msg }}</li>
    </ul>
    <form id="form" @submit.prevent="sendMessage">
      <input id="input" v-model="newMessage" autocomplete="off" />
      <button>Send</button>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { io, Socket } from "socket.io-client";

export default defineComponent({
  name: "HomeView",
  setup() {
    const messages = ref<string[]>([]);
    const newMessage = ref<string>("");
    let socket: Socket; // Define socket with its type

    onMounted(() => {
      // Connect to the server. The URL is where your Node server is running.
      socket = io("http://localhost:3001");

      // Listen for incoming messages
      socket.on("chat message", (msg: string) => {
        messages.value.push(msg);
      });
    });

    const sendMessage = () => {
      if (newMessage.value.trim() !== "") {
        // Emit the message to the server
        socket.emit("chat message", newMessage.value);
        newMessage.value = "";
      }
    };

    return {
      messages,
      newMessage,
      sendMessage,
    };
  },
});
</script>

<style>
/* Add some basic styling */
.chat-container {
  border: 2px solid #eee;
  padding: 10px;
}
#messages {
  list-style-type: none;
  margin: 0;
  padding: 0;
}
#messages li {
  padding: 5px 10px;
}
#form {
  background: #eee;
  padding: 3px;
  position: fixed;
  bottom: 0;
  width: 90%;
}
#input {
  border: 1px solid #ddd;
  padding: 10px;
  width: 85%;
  margin-right: 0.5%;
}
button {
  width: 14%;
  background: #007bff;
  border: none;
  padding: 10px;
  color: white;
}
</style>
