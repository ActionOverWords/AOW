/* AOW Index data — Indiana (IN).
   Federal (Senate/House) and state-level officials whose state code is 'IN',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'rep-in07', name:'Andre Carson', initials:'AC', level:'federal', chamber:'House', party:'D', state:'IN', district:7, seat:'House · Indiana 7th', termStart:'2025'},
  {id:'rep-in09', name:'Erin Houchin', initials:'EH', level:'federal', chamber:'House', party:'R', state:'IN', district:9, seat:'House · Indiana 9th', termStart:'2025'},
  {id:'rep-in01', name:'Frank Mrvan', initials:'FM', level:'federal', chamber:'House', party:'D', state:'IN', district:1, seat:'House · Indiana 1st', termStart:'2025'},
  {id:'rep-in04', name:'James Baird', initials:'JB', level:'federal', chamber:'House', party:'R', state:'IN', district:4, seat:'House · Indiana 4th', termStart:'2025'},
  {id:'rep-in06', name:'Jefferson Shreve', initials:'JS', level:'federal', chamber:'House', party:'R', state:'IN', district:6, seat:'House · Indiana 6th', termStart:'2025'},
  {id:'sen-banks-in', name:'Jim Banks', initials:'JB', level:'federal', chamber:'Senate', party:'R', state:'IN', seat:'Senate · Indiana', termStart:'2025'},
  {id:'rep-in08', name:'Mark Messmer', initials:'MM', level:'federal', chamber:'House', party:'R', state:'IN', district:8, seat:'House · Indiana 8th', termStart:'2025'},
  {id:'rep-in03', name:'Marlin Stutzman', initials:'MS', level:'federal', chamber:'House', party:'R', state:'IN', district:3, seat:'House · Indiana 3rd', termStart:'2025'},
  {id:'ltg-beckwith-in', name:'Micah Beckwith', initials:'MB', level:'state', chamber:'Lieutenant Governor', party:'R', state:'IN', seat:'Lieutenant Governor · Indiana', termStart:'2023'},
  {id:'gov-in', name:'Mike Braun', initials:'MB', level:'state', chamber:'Governor', party:'R', state:'IN', seat:'Governor · Indiana', termStart:'2025'},
  {id:'rep-in02', name:'Rudy Yakym', initials:'RY', level:'federal', chamber:'House', party:'R', state:'IN', district:2, seat:'House · Indiana 2nd', termStart:'2025'},
  {id:'rokita-in', name:'Todd Rokita', initials:'TR', level:'state', chamber:'Attorney General', party:'R', state:'IN', seat:'Attorney General · Indiana', termStart:'2021', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Todd_Rokita_official_portrait.jpg'},
  {id:'sen-young-in', name:'Todd Young', initials:'TY', level:'federal', chamber:'Senate', party:'R', state:'IN', seat:'Senate · Indiana', termStart:'2023'},
  {id:'rep-in05', name:'Victoria Spartz', initials:'VS', level:'federal', chamber:'House', party:'R', state:'IN', district:5, seat:'House · Indiana 5th', termStart:'2025'},
);

DEFAULT_PROMISES.push(
  {id:'p23', memberId:'rokita-in', text:'Return roughly $1 billion to Indiana taxpayers through consumer-protection enforcement.', category:'Consumer protection', status:'completed',
   note:'Figure comes from his own reelection announcement, not an independently audited total — tracked as self-reported rather than verified.',
   source:{publisher:'Rokita\'s reelection announcement (via FOX59)', type:'self_published_report', url:'https://fox59.com/indiana-news/indiana-attorney-general-todd-rokita-seeks-reelection-in-2024/'}},
  {id:'p24', memberId:'rokita-in', text:'Continue anti-abortion enforcement ("securing the right-to-life").', category:'Government reform', status:'in_progress',
   note:'Listed as a core priority on his campaign site heading into 2024 reelection; an ongoing enforcement posture rather than a single completed action.',
   source:{publisher:'Indiana Daily Student', type:'news_report', url:'https://www.idsnews.com/article/2024/11/todd-rokita-reelected-indiana-attorney-general-2024'}},
);
