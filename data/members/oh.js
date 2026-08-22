/* AOW Index data — Ohio (OH).
   Federal (Senate/House) and state-level officials whose state code is 'OH',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'ag-wilson-oh', name:'Andy Wilson', initials:'AW', level:'state', chamber:'Attorney General', party:'R', state:'OH', seat:'Attorney General · Ohio', termStart:'2026'},
  {id:'moreno-oh', name:'Bernie Moreno', initials:'BM', level:'federal', chamber:'Senate', party:'R', state:'OH', seat:'Senate · Ohio', termStart:'2025', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Sen._Bernie_Moreno_official_photo,_119th_Congress_(HR)_(cropped).jpg'},
  {id:'rep-oh14', name:'David Joyce', initials:'DJ', level:'federal', chamber:'House', party:'R', state:'OH', district:14, seat:'House · Ohio 14th', termStart:'2025'},
  {id:'rep-oh02', name:'David Taylor', initials:'DT', level:'federal', chamber:'House', party:'R', state:'OH', district:2, seat:'House · Ohio 2nd', termStart:'2025'},
  {id:'rep-oh13', name:'Emilia Sykes', initials:'ES', level:'federal', chamber:'House', party:'D', state:'OH', district:13, seat:'House · Ohio 13th', termStart:'2025'},
  {id:'rep-oh01', name:'Greg Landsman', initials:'GL', level:'federal', chamber:'House', party:'D', state:'OH', district:1, seat:'House · Ohio 1st', termStart:'2025'},
  {id:'rep-oh04', name:'Jim Jordan', initials:'JJ', level:'federal', chamber:'House', party:'R', state:'OH', district:4, seat:'House · Ohio 4th', termStart:'2025'},
  {id:'ltg-tressel-oh', name:'Jim Tressel', initials:'JT', level:'state', chamber:'Lieutenant Governor', party:'R', state:'OH', seat:'Lieutenant Governor · Ohio', termStart:'2025'},
  {id:'sen-husted-oh', name:'Jon Husted', initials:'JH', level:'federal', chamber:'Senate', party:'R', state:'OH', seat:'Senate · Ohio', termStart:'2023'},
  {id:'rep-oh03', name:'Joyce Beatty', initials:'JB', level:'federal', chamber:'House', party:'D', state:'OH', district:3, seat:'House · Ohio 3rd', termStart:'2025'},
  {id:'rep-oh09', name:'Marcy Kaptur', initials:'MK', level:'federal', chamber:'House', party:'D', state:'OH', district:9, seat:'House · Ohio 9th', termStart:'2025'},
  {id:'rep-oh07', name:'Max Miller', initials:'MM', level:'federal', chamber:'House', party:'R', state:'OH', district:7, seat:'House · Ohio 7th', termStart:'2025'},
  {id:'rep-oh06', name:'Michael A. Rulli', initials:'MR', level:'federal', chamber:'House', party:'R', state:'OH', district:6, seat:'House · Ohio 6th', termStart:'2025'},
  {id:'rep-oh10', name:'Michael Turner', initials:'MT', level:'federal', chamber:'House', party:'R', state:'OH', district:10, seat:'House · Ohio 10th', termStart:'2025'},
  {id:'rep-oh15', name:'Mike Carey', initials:'MC', level:'federal', chamber:'House', party:'R', state:'OH', district:15, seat:'House · Ohio 15th', termStart:'2025'},
  {id:'gov-oh', name:'Mike DeWine', initials:'MD', level:'state', chamber:'Governor', party:'R', state:'OH', seat:'Governor · Ohio', termStart:'2025'},
  {id:'rep-oh05', name:'Robert Latta', initials:'RL', level:'federal', chamber:'House', party:'R', state:'OH', district:5, seat:'House · Ohio 5th', termStart:'2025'},
  {id:'rep-oh11', name:'Shontel Brown', initials:'SB', level:'federal', chamber:'House', party:'D', state:'OH', district:11, seat:'House · Ohio 11th', termStart:'2025'},
  {id:'rep-oh12', name:'Troy Balderson', initials:'TB', level:'federal', chamber:'House', party:'R', state:'OH', district:12, seat:'House · Ohio 12th', termStart:'2025'},
  {id:'rep-oh08', name:'Warren Davidson', initials:'WD', level:'federal', chamber:'House', party:'R', state:'OH', district:8, seat:'House · Ohio 8th', termStart:'2025'},
);

DEFAULT_PROMISES.push(
  {id:'p04', memberId:'moreno-oh', text:'Serve no more than two Senate terms (12 years).', category:'Government reform', status:'in_progress',
   note:'A self-imposed term limit — can only be confirmed "completed" when he actually leaves after two terms, or marked "broken" if he seeks a third.',
   source:{publisher:'Ideastream Public Media', type:'interview', url:'https://www.ideastream.org/2024-10-31/election-2024-republican-us-senate-candidate-bernie-moreno-makes-his-closing-argument'}},
  {id:'p05', memberId:'moreno-oh', text:'Prioritize funding to finish southern border wall construction.', category:'Immigration & border', status:'in_progress',
   note:'A senator doesn’t build a wall alone — tracked here as his support for related funding and policy pushes, not sole credit.',
   source:{publisher:'Ballotpedia (campaign statement summary)', type:'campaign_statement', url:'https://ballotpedia.org/United_States_Senate_election_in_Ohio,_2024'}},
  {id:'p06', memberId:'moreno-oh', text:'Support legislation to enact congressional term limits.', category:'Government reform', status:'not_started',
   note:'No cosponsored or introduced term-limits bill found yet under his name.',
   source:{publisher:'Ideastream Public Media', type:'interview', url:'https://www.ideastream.org/2024-10-31/election-2024-republican-us-senate-candidate-bernie-moreno-makes-his-closing-argument'}},
);
