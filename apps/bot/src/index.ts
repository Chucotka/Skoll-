import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';
import { RESPONSIBLE_DISCLAIMER } from '@toastup/shared';

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
const WEB_APP_URL = process.env.WEB_APP_URL ?? 'http://localhost:5173';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set. Add it to your .env to run the bot.');
  console.error('   Create a bot with @BotFather, then set BOT_TOKEN and TELEGRAM_BOT_USERNAME.');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

const INTRO = [
  '🥂 *Welcome to ToastUp!*',
  '',
  'ToastUp is your online table for friends — virtual toasts, cozy evening rooms,',
  'safe mini-games and a friendly AI host. Wine, tea, coffee or alcohol-free — all welcome.',
  '',
  `_${RESPONSIBLE_DISCLAIMER}_`,
].join('\n');

/** Build the main menu. Mini App buttons require an https URL in Telegram. */
function mainMenu(): InlineKeyboard {
  const kb = new InlineKeyboard();
  const isHttps = WEB_APP_URL.startsWith('https://');
  if (isHttps) {
    kb.webApp('🍷 Open ToastUp', WEB_APP_URL).row();
    kb.webApp('➕ Create Room', `${WEB_APP_URL}?screen=create`).row();
  } else {
    // Telegram only allows web_app buttons over https; fall back to a URL button in dev.
    kb.url('🍷 Open ToastUp (dev link)', WEB_APP_URL).row();
  }
  kb.text('📜 Rules', 'rules');
  return kb;
}

bot.command('start', async (ctx) => {
  const payload = ctx.match?.toString().trim();
  let extra = '';
  if (payload && payload.length > 0) {
    // Deep link support: /start <inviteCode> (or join_<code>)
    const code = payload.replace(/^join_/, '');
    extra = `\n\n🔗 Invite code detected: *${code}*\nOpen ToastUp and tap *Join by Code* to enter.`;
  }
  await ctx.reply(INTRO + extra, { parse_mode: 'Markdown', reply_markup: mainMenu() });
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    [
      '*ToastUp — Help*',
      '',
      '/start — open the main menu',
      '/create_room — create a new evening room',
      '/rules — house rules & safety',
      '/help — this message',
      '',
      'Tap *Open ToastUp* to launch the Mini App.',
    ].join('\n'),
    { parse_mode: 'Markdown', reply_markup: mainMenu() },
  );
});

bot.command('create_room', async (ctx) => {
  const kb = new InlineKeyboard();
  if (WEB_APP_URL.startsWith('https://')) {
    kb.webApp('➕ Create Room', `${WEB_APP_URL}?screen=create`);
  } else {
    kb.url('➕ Create Room (dev link)', `${WEB_APP_URL}?screen=create`);
  }
  await ctx.reply(
    'Let’s set up your evening table! Tap below to create a room and invite friends.',
    { reply_markup: kb },
  );
});

const RULES = [
  '*ToastUp — House Rules* 🏠',
  '',
  '• Be kind. This is a space for communication and light entertainment.',
  '• 18+ only. You confirm your age before entering the app.',
  `• ${RESPONSIBLE_DISCLAIMER}`,
  '• No pressure to drink — toasts work with tea, coffee or water too.',
  '• Use the report button if someone makes the table uncomfortable.',
  '',
  'Enjoy your evening together! 🥂',
].join('\n');

bot.command('rules', async (ctx) => {
  await ctx.reply(RULES, { parse_mode: 'Markdown' });
});

bot.callbackQuery('rules', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(RULES, { parse_mode: 'Markdown' });
});

bot.catch((err) => {
  console.error('Bot error:', err);
});

async function main() {
  const me = await bot.api.getMe();
  console.log(`🤖 ToastUp bot @${me.username} is running. WEB_APP_URL=${WEB_APP_URL}`);
  await bot.start();
}

main().catch((e) => {
  console.error('Failed to start bot:', e);
  process.exit(1);
});
