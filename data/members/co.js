/* AOW Index data — Colorado (CO).
   Federal (Senate/House) and state-level officials whose state code is 'CO',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'rep-co07', name:'Brittany Pettersen', initials:'BP', level:'federal', chamber:'House', party:'D', state:'CO', district:7, seat:'House · Colorado 7th', termStart:'2025'},
  {id:'rep-co01', name:'Diana DeGette', initials:'DD', level:'federal', chamber:'House', party:'D', state:'CO', district:1, seat:'House · Colorado 1st', termStart:'2025'},
  {id:'ltg-primavera-co', name:'Dianne Primavera', initials:'DP', level:'state', chamber:'Lieutenant Governor', party:'D', state:'CO', seat:'Lieutenant Governor · Colorado', termStart:'2023'},
  {id:'rep-co08', name:'Gabe Evans', initials:'GE', level:'federal', chamber:'House', party:'R', state:'CO', district:8, seat:'House · Colorado 8th', termStart:'2025'},
  {id:'gov-co', name:'Jared Polis', initials:'JP', level:'state', chamber:'Governor', party:'D', state:'CO', seat:'Governor · Colorado', termStart:'2025'},
  {id:'rep-co06', name:'Jason Crow', initials:'JC', level:'federal', chamber:'House', party:'D', state:'CO', district:6, seat:'House · Colorado 6th', termStart:'2025'},
  {id:'rep-co05', name:'Jeff Crank', initials:'JC', level:'federal', chamber:'House', party:'R', state:'CO', district:5, seat:'House · Colorado 5th', termStart:'2025'},
  {id:'rep-co03', name:'Jeff Hurd', initials:'JH', level:'federal', chamber:'House', party:'R', state:'CO', district:3, seat:'House · Colorado 3rd', termStart:'2025'},
  {id:'rep-co02', name:'Joe Neguse', initials:'JN', level:'federal', chamber:'House', party:'D', state:'CO', district:2, seat:'House · Colorado 2nd', termStart:'2025'},
  {id:'sen-hickenlooper-co', name:'John W. Hickenlooper', initials:'JH', level:'federal', chamber:'Senate', party:'D', state:'CO', seat:'Senate · Colorado', termStart:'2021'},
  {id:'boebert-co', name:'Lauren Boebert', initials:'LB', level:'federal', chamber:'House', party:'R', state:'CO', seat:'House · Colorado 4th', termStart:'2025', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Lauren_Boebert_117th_U.S_Congress_(3x4_cropped).jpg'},
  {id:'sen-bennet-co', name:'Michael F. Bennet', initials:'MB', level:'federal', chamber:'Senate', party:'D', state:'CO', seat:'Senate · Colorado', termStart:'2023'},
  {id:'ag-weiser-co', name:'Phil Weiser', initials:'PW', level:'state', chamber:'Attorney General', party:'D', state:'CO', seat:'Attorney General · Colorado', termStart:'2023'},
);

DEFAULT_PROMISES.push(
  {id:'p08', memberId:'boebert-co', text:'Vote to defund the 87,000 new IRS agents as a first-bill priority.', category:'Taxes & IRS', status:'completed',
   note:'Dated to the 118th Congress (2023), while representing Colorado’s 3rd District — logged with that context since she now represents a different district.',
   source:{publisher:'Rep. Boebert\'s official House newsletter', type:'self_published_report', url:'https://boebert.house.gov/media/newsletters/promises-made-promises-kept-0'}},
  {id:'p09', memberId:'boebert-co', text:'Work to close the southern border.', category:'Immigration & border', status:'in_progress',
   note:'Listed as an ongoing priority in her own office communications — self-reported, not independently verified here.',
   source:{publisher:'Rep. Boebert\'s official House newsletter', type:'self_published_report', url:'https://boebert.house.gov/media/newsletters/promises-made-promises-kept-0'}},
);
