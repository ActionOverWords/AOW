/* AOW Index data — Arizona (AZ).
   Federal (Senate/House) and state-level officials whose state code is 'AZ',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'rep-az08', name:'Abraham Hamadeh', initials:'AH', level:'federal', chamber:'House', party:'R', state:'AZ', district:8, seat:'House · Arizona 8th', termStart:'2025'},
  {id:'rep-az07', name:'Adelita Grijalva', initials:'AG', level:'federal', chamber:'House', party:'D', state:'AZ', district:7, seat:'House · Arizona 7th', termStart:'2025'},
  {id:'ltg-fontes-az', name:'Adrian Fontes', initials:'AF', level:'state', chamber:'Secretary of State', party:'D', state:'AZ', seat:'Secretary of State · Arizona', termStart:'2023'},
  {id:'rep-az05', name:'Andy Biggs', initials:'AB', level:'federal', chamber:'House', party:'R', state:'AZ', district:5, seat:'House · Arizona 5th', termStart:'2025'},
  {id:'rep-az01', name:'David Schweikert', initials:'DS', level:'federal', chamber:'House', party:'R', state:'AZ', district:1, seat:'House · Arizona 1st', termStart:'2025'},
  {id:'rep-az02', name:'Elijah Crane', initials:'EC', level:'federal', chamber:'House', party:'R', state:'AZ', district:2, seat:'House · Arizona 2nd', termStart:'2025'},
  {id:'rep-az04', name:'Greg Stanton', initials:'GS', level:'federal', chamber:'House', party:'D', state:'AZ', district:4, seat:'House · Arizona 4th', termStart:'2025'},
  {id:'rep-az06', name:'Juan Ciscomani', initials:'JC', level:'federal', chamber:'House', party:'R', state:'AZ', district:6, seat:'House · Arizona 6th', termStart:'2025'},
  {id:'gov-az', name:'Katie Hobbs', initials:'KH', level:'state', chamber:'Governor', party:'D', state:'AZ', seat:'Governor · Arizona', termStart:'2025'},
  {id:'mayes-az', name:'Kris Mayes', initials:'KM', level:'state', chamber:'Attorney General', party:'D', state:'AZ', seat:'Attorney General · Arizona', termStart:'2023', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Kris_Mayes_official_portrait.jpg'},
  {id:'sen-kelly-az', name:'Mark Kelly', initials:'MK', level:'federal', chamber:'Senate', party:'D', state:'AZ', seat:'Senate · Arizona', termStart:'2023'},
  {id:'rep-az09', name:'Paul Gosar', initials:'PG', level:'federal', chamber:'House', party:'R', state:'AZ', district:9, seat:'House · Arizona 9th', termStart:'2025'},
  {id:'sen-gallego-az', name:'Ruben Gallego', initials:'RG', level:'federal', chamber:'Senate', party:'D', state:'AZ', seat:'Senate · Arizona', termStart:'2025'},
  {id:'rep-az03', name:'Yassamin Ansari', initials:'YA', level:'federal', chamber:'House', party:'D', state:'AZ', district:3, seat:'House · Arizona 3rd', termStart:'2025'},
);

DEFAULT_PROMISES.push(
  {id:'p21', memberId:'mayes-az', text:'Create a Reproductive Rights Unit within the Attorney General\'s office.', category:'Government reform', status:'completed',
   note:'Announced within days of taking office in 2023 as part of a pledge to defend abortion access in Arizona; the unit has continued operating through her office’s later defense of the state’s voter-approved reproductive rights measure.',
   source:{publisher:'12News (KPNX)', type:'news_report', url:'https://www.12news.com/article/news/local/arizona/new-arizona-attorney-general-kris-mayes-outlines-priorities/75-13daf8ff-0d8c-44a1-b816-8c461a86de47'}},
  {id:'p22', memberId:'mayes-az', text:'Prioritize prosecuting fentanyl trafficking and cartel activity.', category:'Public safety', status:'in_progress',
   note:'A consistent top-three priority across her first term and 2026 reelection messaging — an ongoing enforcement focus rather than a one-time deliverable.',
   source:{publisher:'The Center Square', type:'news_report', url:'https://www.thecentersquare.com/arizona/article_e67aa5a1-1738-4777-a7e4-37210c3bf1fc.html'}},
);
