const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const fs = require("fs");
require("dotenv").config();

const { collection, addDoc }  = require("firebase/firestore");

const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: "kadda-2",
  storageBucket: "kadda-2.appspot.com",
  messagingSenderId: "760461522712",
  appId: "1:760461522712:web:cef81cccf4ee15f981106d",
  measurementId: "G-3WE93XF8PE"
};

const apps = initializeApp(firebaseConfig);
const db = getFirestore(apps);


const app = express();

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

const textOnly = async (reqBody) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = `gametically correct me below English sentences.   also mention my grammar mistakes and highlight those. correct me only if im wrong and keep the conversation interstly.
  also give some idea for formal and informals. 
  also make it more short and sweet and easy to understand. also make your reply more short and sweet also easy to understand. 
  Do not replay any questions or anthing else which is out side the English language learning. Also add declaimer about this is a AI generated replay  at the end of the response.
  My sentence is :- ${reqBody}
  `;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text;
};


async function addUserToFirestore(userId,message,response) {
  const currentTime = new Date();

  let dbTable = "";
  if(userId == "6300187372"){
    dbTable = "myData";
  }else{
    dbTable = "UsersData";
  }
  const docRef = await addDoc(collection(db, dbTable), {
    userId: userId || null,
    message:message || null,
    response:response || null,
    datetime: currentTime || null
  });
  console.log("Document written with ID: ", docRef.id);
}


const  sendDataMiddleware = (chatId,ask,respose) => {
  addUserToFirestore(chatId,ask,respose);
}
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});


bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  try {
    let response = "";
    bot.sendChatAction(chatId, "typing");
    if(msg.text == "/start"){
      bot.sendMessage(chatId, `
      "👋 Hello there! Welcome to Kadda, your friendly English learning assistant! 📚✨

      I'm here to help you improve your English skills effortlessly. Whether you're looking to polish your grammar, expand your vocabulary, or simply practice conversational English, I've got you covered!

      Feel free to send me any English sentences or questions you have, and I'll provide feedback, corrections, and suggestions to help you learn and grow.

      Let's embark on this language learning journey together! Start by sending me a sentence, and let's see how we can make it shine. 🌟✨"

      `);
      sendDataMiddleware(chatId,msg.text,"Begin");
    }else{
      response = await textOnly(msg.text);
      if (msg.chat.type === "private") {
        bot.sendMessage(chatId, `${response}` , { parse_mode: 'MarkdownV2' });
      } else if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
        bot.sendMessage( chatId, `Hello, group members! Someone said: ${msg.text}` , { parse_mode: 'MarkdownV2' } );
      }
      sendDataMiddleware(chatId,msg.text,response);
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
    bot.sendMessage(chatId, "An error occurred while processing your request.");
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
