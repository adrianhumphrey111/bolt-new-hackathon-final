// Quick UTM URL generator for Product Hunt and Reddit

const baseUrl = 'https://tailorlabsai.com';

function generateUTMLink(url, params) {
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value) urlObj.searchParams.set(key, value);
  });
  return urlObj.toString();
}

console.log('🔗 PRODUCT HUNT TRACKING URLS:');
console.log('');
console.log('Main page:');
console.log(generateUTMLink(baseUrl, {
  utm_source: 'producthunt',
  utm_medium: 'social',
  utm_campaign: 'ph_launch',
  utm_content: 'ph_listing'
}));
console.log('');
console.log('Signup page:');
console.log(generateUTMLink(`${baseUrl}/auth/signup`, {
  utm_source: 'producthunt',
  utm_medium: 'social',
  utm_campaign: 'ph_signup',
  utm_content: 'ph_listing'
}));
console.log('');
console.log('Features page:');
console.log(generateUTMLink(`${baseUrl}/features`, {
  utm_source: 'producthunt',
  utm_medium: 'social',
  utm_campaign: 'ph_features',
  utm_content: 'ph_listing'
}));

console.log('');
console.log('🔗 REDDIT TRACKING URLS:');
console.log('');
console.log('r/entrepreneur:');
console.log(generateUTMLink(baseUrl, {
  utm_source: 'reddit',
  utm_medium: 'social',
  utm_campaign: 'reddit_entrepreneur',
  utm_content: 'entrepreneur'
}));
console.log('');
console.log('r/startups:');
console.log(generateUTMLink(baseUrl, {
  utm_source: 'reddit',
  utm_medium: 'social',
  utm_campaign: 'reddit_startups',
  utm_content: 'startups'
}));
console.log('');
console.log('r/VideoEditing:');
console.log(generateUTMLink(baseUrl, {
  utm_source: 'reddit',
  utm_medium: 'social',
  utm_campaign: 'reddit_videoediting',
  utm_content: 'videoediting'
}));
console.log('');
console.log('r/artificial:');
console.log(generateUTMLink(baseUrl, {
  utm_source: 'reddit',
  utm_medium: 'social',
  utm_campaign: 'reddit_ai',
  utm_content: 'artificialintelligence'
}));
console.log('');
console.log('Reddit signup page:');
console.log(generateUTMLink(`${baseUrl}/auth/signup`, {
  utm_source: 'reddit',
  utm_medium: 'social',
  utm_campaign: 'reddit_signup',
  utm_content: 'general'
}));

console.log('');
console.log('📊 HOW TO USE:');
console.log('1. Replace your existing links in Product Hunt and Reddit posts with these URLs');
console.log('2. Check Google Analytics → Acquisition → All Traffic → Source/Medium');
console.log('3. Look for traffic from "producthunt / social" and "reddit / social"');
console.log('4. Check browser console during signup for additional tracking logs');
console.log('5. Visit /admin page for the UTM generator tool');