/* AOW Index data — Michigan (MI).
   Federal (Senate/House) and state-level officials whose state code is 'MI',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'rep-mi04', name:'Bill Huizenga', initials:'BH', level:'federal', chamber:'House', party:'R', state:'MI', district:4, seat:'House · Michigan 4th', termStart:'2025'},
  {id:'ag-nessel-mi', name:'Dana Nessel', initials:'DN', level:'state', chamber:'Attorney General', party:'D', state:'MI', seat:'Attorney General · Michigan', termStart:'2023'},
  {id:'rep-mi06', name:'Debbie Dingell', initials:'DD', level:'federal', chamber:'House', party:'D', state:'MI', district:6, seat:'House · Michigan 6th', termStart:'2025'},
  {id:'slotkin-mi', name:'Elissa Slotkin', initials:'ES', level:'federal', chamber:'Senate', party:'D', state:'MI', seat:'Senate · Michigan', termStart:'2025', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Elissa_Slotkin_119th_Congress_(cropped).jpg'},
  {id:'ltg-gilchrist-mi', name:'Garlin Gilchrist', initials:'GG', level:'state', chamber:'Lieutenant Governor', party:'D', state:'MI', seat:'Lieutenant Governor · Michigan', termStart:'2023'},
  {id:'sen-peters-mi', name:'Gary C. Peters', initials:'GP', level:'federal', chamber:'Senate', party:'D', state:'MI', seat:'Senate · Michigan', termStart:'2021'},
  {id:'gov-mi', name:'Gretchen Whitmer', initials:'GW', level:'state', chamber:'Governor', party:'D', state:'MI', seat:'Governor · Michigan', termStart:'2025'},
  {id:'rep-mi11', name:'Haley Stevens', initials:'HS', level:'federal', chamber:'House', party:'D', state:'MI', district:11, seat:'House · Michigan 11th', termStart:'2025'},
  {id:'rep-mi03', name:'Hillary Scholten', initials:'HS', level:'federal', chamber:'House', party:'D', state:'MI', district:3, seat:'House · Michigan 3rd', termStart:'2025'},
  {id:'rep-mi01', name:'Jack Bergman', initials:'JB', level:'federal', chamber:'House', party:'R', state:'MI', district:1, seat:'House · Michigan 1st', termStart:'2025'},
  {id:'rep-mi10', name:'John James', initials:'JJ', level:'federal', chamber:'House', party:'R', state:'MI', district:10, seat:'House · Michigan 10th', termStart:'2025'},
  {id:'rep-mi02', name:'John Moolenaar', initials:'JM', level:'federal', chamber:'House', party:'R', state:'MI', district:2, seat:'House · Michigan 2nd', termStart:'2025'},
  {id:'rep-mi08', name:'Kristen McDonald Rivet', initials:'KR', level:'federal', chamber:'House', party:'D', state:'MI', district:8, seat:'House · Michigan 8th', termStart:'2025'},
  {id:'rep-mi09', name:'Lisa McClain', initials:'LM', level:'federal', chamber:'House', party:'R', state:'MI', district:9, seat:'House · Michigan 9th', termStart:'2025'},
  {id:'rep-mi12', name:'Rashida Tlaib', initials:'RT', level:'federal', chamber:'House', party:'D', state:'MI', district:12, seat:'House · Michigan 12th', termStart:'2025'},
  {id:'rep-mi13', name:'Shri Thanedar', initials:'ST', level:'federal', chamber:'House', party:'D', state:'MI', district:13, seat:'House · Michigan 13th', termStart:'2025'},
  {id:'rep-mi05', name:'Tim Walberg', initials:'TW', level:'federal', chamber:'House', party:'R', state:'MI', district:5, seat:'House · Michigan 5th', termStart:'2025'},
  {id:'rep-mi07', name:'Tom Barrett', initials:'TB', level:'federal', chamber:'House', party:'R', state:'MI', district:7, seat:'House · Michigan 7th', termStart:'2025'},
);

DEFAULT_PROMISES.push(
  {id:'p01', memberId:'slotkin-mi', text:'Refuse all corporate PAC contributions.', category:'Campaign finance', status:'in_progress',
   note:'Standing pledge since launching her 2024 campaign — an ongoing practice rather than a one-time action, so it stays "in progress" for as long as she holds the seat.',
   source:{publisher:'Elissa Slotkin for Michigan (campaign site)', type:'campaign_statement', url:'https://elissaslotkin.org/'}},
  {id:'p02', memberId:'slotkin-mi', text:'Work to lower prescription drug and health care costs.', category:'Health care', status:'in_progress',
   note:'Named as a top priority heading into her Senate term; no specific bill outcome to point to yet.',
   source:{publisher:'WKAR Public Media', type:'interview', url:'https://www.wkar.org/wkar-news/2023-01-11/rep-elissa-slotkin-weighs-u-s-senate-bid-talks-priorities-for-118th-congress'}},
  {id:'p03', memberId:'slotkin-mi', text:'Push to reform the Senate filibuster.', category:'Government reform', status:'not_started',
   note:'Raised as part of her "opportunity agenda" rollout; no legislative action found yet.',
   source:{publisher:'Michigan Advance', type:'interview', url:'https://michiganadvance.com/2024/03/11/slotkin-to-unveil-opportunity-agenda-in-detroit-including-filibuster-reform/'}},
);
