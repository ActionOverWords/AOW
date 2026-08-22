/* AOW Index data — New Jersey (NJ).
   Federal (Senate/House) and state-level officials whose state code is 'NJ',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'rep-nj11', name:'Analilia Mejia', initials:'AM', level:'federal', chamber:'House', party:'D', state:'NJ', district:11, seat:'House · New Jersey 11th', termStart:'2026'},
  {id:'kim-nj', name:'Andy Kim', initials:'AK', level:'federal', chamber:'Senate', party:'D', state:'NJ', seat:'Senate · New Jersey', termStart:'2025', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Andy_Kim_119th_Congress.jpg'},
  {id:'rep-nj12', name:'Bonnie Watson Coleman', initials:'BC', level:'federal', chamber:'House', party:'D', state:'NJ', district:12, seat:'House · New Jersey 12th', termStart:'2025'},
  {id:'rep-nj04', name:'Christopher Smith', initials:'CS', level:'federal', chamber:'House', party:'R', state:'NJ', district:4, seat:'House · New Jersey 4th', termStart:'2025'},
  {id:'sen-booker-nj', name:'Cory A. Booker', initials:'CB', level:'federal', chamber:'Senate', party:'D', state:'NJ', seat:'Senate · New Jersey', termStart:'2021'},
  {id:'ltg-caldwell-nj', name:'Dale Caldwell', initials:'DC', level:'state', chamber:'Lieutenant Governor', party:'D', state:'NJ', seat:'Lieutenant Governor · New Jersey', termStart:'2026'},
  {id:'rep-nj01', name:'Donald Norcross', initials:'DN', level:'federal', chamber:'House', party:'D', state:'NJ', district:1, seat:'House · New Jersey 1st', termStart:'2025'},
  {id:'rep-nj06', name:'Frank Pallone', initials:'FP', level:'federal', chamber:'House', party:'D', state:'NJ', district:6, seat:'House · New Jersey 6th', termStart:'2025'},
  {id:'rep-nj03', name:'Herbert Conaway', initials:'HC', level:'federal', chamber:'House', party:'D', state:'NJ', district:3, seat:'House · New Jersey 3rd', termStart:'2025'},
  {id:'rep-nj02', name:'Jefferson Van Drew', initials:'JD', level:'federal', chamber:'House', party:'R', state:'NJ', district:2, seat:'House · New Jersey 2nd', termStart:'2025'},
  {id:'ag-davenport-nj', name:'Jennifer Davenport', initials:'JD', level:'state', chamber:'Attorney General', party:'D', state:'NJ', seat:'Attorney General · New Jersey', termStart:'2026'},
  {id:'rep-nj05', name:'Josh Gottheimer', initials:'JG', level:'federal', chamber:'House', party:'D', state:'NJ', district:5, seat:'House · New Jersey 5th', termStart:'2025'},
  {id:'rep-nj10', name:'LaMonica McIver', initials:'LM', level:'federal', chamber:'House', party:'D', state:'NJ', district:10, seat:'House · New Jersey 10th', termStart:'2025'},
  {id:'gov-nj', name:'Mikie Sherrill', initials:'MS', level:'state', chamber:'Governor', party:'D', state:'NJ', seat:'Governor · New Jersey', termStart:'2025'},
  {id:'rep-nj09', name:'Nellie Pou', initials:'NP', level:'federal', chamber:'House', party:'D', state:'NJ', district:9, seat:'House · New Jersey 9th', termStart:'2025'},
  {id:'rep-nj08', name:'Robert Menendez', initials:'RM', level:'federal', chamber:'House', party:'D', state:'NJ', district:8, seat:'House · New Jersey 8th', termStart:'2025'},
  {id:'rep-nj07', name:'Thomas Kean', initials:'TK', level:'federal', chamber:'House', party:'R', state:'NJ', district:7, seat:'House · New Jersey 7th', termStart:'2025'},
);

DEFAULT_PROMISES.push(
  {id:'p10', memberId:'kim-nj', text:'Hold regular, accessible town halls with constituents.', category:'Government reform', status:'in_progress',
   note:'Held 81 town halls before he was even sworn in and has continued them since — strong follow-through on a standing commitment rather than a one-time action.',
   source:{publisher:'Sen. Kim\'s official Senate office', type:'self_published_report', url:'https://www.kim.senate.gov/?p=1808'}},
  {id:'p11', memberId:'kim-nj', text:'Restore trust and integrity in government.', category:'Government reform', status:'in_progress',
   note:'A values-level pledge that framed his campaign (reinforced by the viral photo of him cleaning up the Capitol after Jan. 6) — inherently hard to ever mark "completed."',
   source:{publisher:'New Jersey Monitor', type:'news_report', url:'https://newjerseymonitor.com/2024/11/05/new-jersey-rep-andy-kim-makes-history-as-first-korean-american-elected-to-senate/'}},
);
