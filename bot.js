require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define User Schema
const userSchema = new mongoose.Schema({ userId: String, username: String });
const User = mongoose.model("User", userSchema);

// ✅ Define Group Schema
const groupSchema = new mongoose.Schema({ chatId: String, title: String });
const Group = mongoose.model("Group", groupSchema);

// ✅ Initialize Telegram Bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log("🤖 Bot is Running...");

// ✅ Handle `/start` Command
bot.onText((/^\/start(@AllTagerX_Bot)?$/), async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    const welcomeMessage = `
👋 *Hello, ${firstName}! Welcome to the Ultimate Tagging Bot!* 🚀

🔹 This bot helps you tag all members and admins in groups easily.  
🔹 Only admins can tag everyone.  
🔹 Normal users can tag admins with /admin.

⚡ *Use /help to see all commands!*
    `;

    const keyboard = {
        inline_keyboard: [
            [{ text: "👨‍💻 Developer", url: "https://t.me/WizardBillu" }],
            [{ text: "📢 Channel", url: "https://t.me/OWN_HUNTERX" }],
            [{ 
                text: "➕ Add Me to Group", 
                url: "https://t.me/AllTagerX_Bot?startgroup=true" 
            }]
        ]
    };

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard.inline_keyboard } });
    // Save User to Database
    if (msg.chat.type === "private") {
        await User.updateOne({ userId: msg.from.id }, { userId: msg.from.id, username: msg.from.username }, { upsert: true });
    }
});

// ✅ Handle `/help` Command
bot.onText(/^\/help$/, (msg) => {
    const helpMessage = `
🛠️ *Tagging Commands:*
🔹 \`/all\` or \`@all\` - Tag everyone in the group (Admins only).
🔹 \`/admin\` or \`@admin\` - Tag all admins (Anyone can use).

📊 *Owner Commands:*
🔹 \`/stats\` - View bot statistics (Total users & groups).
🔹 \`/broadcast <message>\` - Send a message to all users & groups.

💡 *Bot Usage:*  
- Add this bot to your group.  
- Give admin rights for proper tagging.  
- Enjoy seamless mentions!
    `;

    const keyboard = {
        inline_keyboard: [
            [{ text: "👨‍💻 Developer", url: "https://t.me/WizardBillu" }],
            [{ text: "📢 Channel", url: "https://t.me/OWN_HUNTERX" }],
            [{ 
                text: "➕ Add Me to Group", 
                url: "https://t.me/AllTagerX_Bot?startgroup=true" 
            }]
        ]
    };

    bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard.inline_keyboard } });
});

// ✅ Tag All Members (Admins Only)
bot.onText(/^\/all$/, async (msg) => {
    if (msg.chat.type === "private") {
        return bot.sendMessage(msg.chat.id, "❌ *You can't use this command in private chat!*", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: "➕ Add Me to Group", 
                            url: `https://t.me/AllTagerX_Bot?startgroup=true` 
                        }
                    ]
                ]
            }        });
    }

    const chatAdmins = await bot.getChatAdministrators(msg.chat.id);
    const isAdmin = chatAdmins.some(admin => admin.user.id === msg.from.id);

    if (!isAdmin) return bot.sendMessage(msg.chat.id, "❌ Only admins can use this command.");

    const members = chatAdmins.map(admin => `@${admin.user.username || admin.user.first_name}`);
bot.sendMessage(
    msg.chat.id, 
    `👥 Tagging everyone!\n\n${members.join(" ")}`,
    {
        reply_to_message_id: msg.message_id // Replies to the /all command
    }
);
});

// ✅ Tag All Admins
bot.onText(/^\/admin$/, async (msg) => {
    if (msg.chat.type === "private") {
        return bot.sendMessage(msg.chat.id, "❌ *You can't use this command in private chat!*", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: "➕ Add Me to Group", 
                            url: `https://t.me/AllTagerX_Bot?startgroup=true` 
                        }
                    ]
                ]
            }        });
    }

    const chatAdmins = await bot.getChatAdministrators(msg.chat.id);
const admins = chatAdmins.map(admin => `@${admin.user.username || admin.user.first_name}`);

bot.sendMessage(
    msg.chat.id, 
    `👑 Admins - ${admins.join(" ")}`,
    {
        reply_to_message_id: msg.message_id // Replies to the user's command
    }
);
});

// ✅ Stats Command (Owner Only)
bot.onText(/^\/stats$/, async (msg) => {
    if (msg.from.id.toString() !== process.env.OWNER_ID) return;

    const totalUsers = await User.countDocuments();
    const totalGroups = await Group.countDocuments();

    bot.sendMessage(msg.chat.id, `
📊 *Bot Stats:*
👤 *Total Users:* ${totalUsers}
🏢 *Total Groups:* ${totalGroups}
    `, { parse_mode: "Markdown" });
});

// ✅ Broadcast Command (Owner Only)
bot.onText(/^\/broadcast (.+)/, async (msg, match) => {
    if (msg.from.id.toString() !== process.env.OWNER_ID) return;

    const message = match[1];

    const users = await User.find();
    const groups = await Group.find();

    let successUsers = 0, failedUsers = 0;
    let successGroups = 0, failedGroups = 0;

    for (const user of users) {
        try { await bot.sendMessage(user.userId, `${message}`, { parse_mode: "Markdown" }); successUsers++; } catch { failedUsers++; }
    }

    for (const group of groups) {
        try { await bot.sendMessage(group.chatId, `${message}`, { parse_mode: "Markdown" }); successGroups++; } catch { failedGroups++; }
    }

    bot.sendMessage(msg.chat.id, `
✅ *Broadcast Sent!*
👤 Users Reached: ${successUsers}
❌ Users Failed: ${failedUsers}
🏢 Groups Reached: ${successGroups}
❌ Groups Failed: ${failedGroups}
    `, { parse_mode: "Markdown" });
});
