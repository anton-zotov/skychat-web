import data from '@emoji-mart/data';

// --- Emoji Search Logic ---

const RU_EMOJI_KEYWORDS: Record<string, string[]> = {
  'улыбка': ['smile', 'smiley', 'grinning'],
  'смех': ['laughing', 'joy', 'lol', 'rofl'],
  'сердце': ['heart', 'love', 'heart_eyes'],
  'лайк': ['+1', 'thumbsup'],
  'дизлайк': ['-1', 'thumbsdown'],
  'ок': ['ok_hand'],
  'огонь': ['fire', 'lit'],
  'плач': ['cry', 'sob', 'sweat_smile'],
  'грусть': ['pensive', 'sad', 'disappointed'],
  'шок': ['astonished', 'hushed', 'scream'],
  'круто': ['sunglasses', 'cool'],
  'привет': ['wave', 'hi'],
  'пока': ['wave', 'bye'],
  'спасибо': ['pray', 'thanks'],
  'пожалуйста': ['pray'],
  'деньги': ['moneybag', 'money_with_wings', 'dollar'],
  'пиво': ['beer', 'beers'],
  'вино': ['wine_glass'],
  'кофе': ['coffee'],
  'торт': ['birthday', 'cake'],
  'подарок': ['gift', 'present'],
  'солнце': ['sunny', 'sun_with_face'],
  'луна': ['moon', 'crescent_moon'],
  'звезда': ['star', 'star2'],
  'молния': ['zap', 'lightning'],
  'дождь': ['rain', 'umbrella'],
  'снег': ['snowflake', 'snowboarder'],
  'кот': ['cat', 'cat2', 'heart_eyes_cat'],
  'собака': ['dog', 'dog2'],
  'машина': ['car', 'red_car', 'taxi'],
  'самолет': ['airplane'],
  'дом': ['house', 'home'],
  'телефон': ['iphone', 'phone'],
  'компьютер': ['computer', 'laptop'],
  'книга': ['book', 'open_book'],
  'ручка': ['pen', 'pencil2'],
  'флаг': ['flag-ru', 'ru'],
  'праздник': ['tada', 'confetti_ball'],
  'цветы': ['tulip', 'rose', 'sunflower'],
  'еда': ['pizza', 'hamburger', 'fries'],
  'сон': ['zzz', 'sleeping'],
  'злость': ['angry', 'rage'],
  'поцелуй': ['kissing_heart', 'kiss'],
  'рука': ['raised_hand', 'hand'],
  'глаза': ['eyes'],
  'время': ['clock1', 'hourglass'],
  'музыка': ['notes', 'musical_note'],
  'спорт': ['soccer', 'basketball', 'tennis'],
  'хихикает': ['face_with_hand_over_mouth', 'sweat_smile', '🤭'],
};

export const searchEmojis = (query: string) => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  const matchedIds = new Set<string>();
  
  Object.entries(RU_EMOJI_KEYWORDS).forEach(([keyword, ids]) => {
    if (keyword.includes(lowerQuery)) {
      ids.forEach(id => matchedIds.add(id));
    }
  });
  
  const results: any[] = [];
  const emojis = (data as any).emojis;
  
  matchedIds.forEach(id => {
    if (emojis[id]) {
      results.push({ id, ...emojis[id], native: emojis[id].skins[0].native });
    }
  });
  
  if (results.length < 10) {
    Object.entries(emojis).forEach(([id, emoji]: [string, any]) => {
      if (results.length >= 10) return;
      if (matchedIds.has(id)) return;
      
      if (id.includes(lowerQuery) || emoji.name.toLowerCase().includes(lowerQuery)) {
        results.push({ id, ...emoji, native: emoji.skins[0].native });
      }
    });
  }
  
  return results.slice(0, 10);
};
