/* AOW Index data — Oregon (OR).
   Federal (Senate/House) and state-level officials whose state code is 'OR',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'rep-or06', name:'Andrea Salinas', initials:'AS', level:'federal', chamber:'House', party:'D', state:'OR', district:6, seat:'House · Oregon 6th', termStart:'2025'},
  {id:'stephenson-or', name:'Christina Stephenson', initials:'CS', level:'state', chamber:'Commissioner of Labor and Industries', party:'NP', state:'OR', seat:'Commissioner of Labor and Industries · Oregon', termStart:'2023', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Christina_Stephenson_official_portrait.jpg'},
  {id:'rep-or02', name:'Cliff Bentz', initials:'CB', level:'federal', chamber:'House', party:'R', state:'OR', district:2, seat:'House · Oregon 2nd', termStart:'2025'},
  {id:'rayfield-or', name:'Dan Rayfield', initials:'DR', level:'state', chamber:'Attorney General', party:'D', state:'OR', seat:'Attorney General · Oregon', termStart:'2025', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Dan_Rayfield_official_portrait.jpg'},
  {id:'steiner-or', name:'Elizabeth Steiner', initials:'ES', level:'state', chamber:'Treasurer', party:'D', state:'OR', seat:'Treasurer · Oregon', termStart:'2025', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Elizabeth_Steiner_official_portrait.jpg'},
  {id:'rep-or05', name:'Janelle Bynum', initials:'JB', level:'federal', chamber:'House', party:'D', state:'OR', district:5, seat:'House · Oregon 5th', termStart:'2025'},
  {id:'sen-merkley-or', name:'Jeff Merkley', initials:'JM', level:'federal', chamber:'Senate', party:'D', state:'OR', seat:'Senate · Oregon', termStart:'2021'},
  {id:'rep-or03', name:'Maxine Dexter', initials:'MD', level:'federal', chamber:'House', party:'D', state:'OR', district:3, seat:'House · Oregon 3rd', termStart:'2025'},
  {id:'sen-wyden-or', name:'Ron Wyden', initials:'RW', level:'federal', chamber:'Senate', party:'D', state:'OR', seat:'Senate · Oregon', termStart:'2023'},
  {id:'rep-or01', name:'Suzanne Bonamici', initials:'SB', level:'federal', chamber:'House', party:'D', state:'OR', district:1, seat:'House · Oregon 1st', termStart:'2012'},
  {id:'kotek-or', name:'Tina Kotek', initials:'TK', level:'state', chamber:'Governor', party:'D', state:'OR', seat:'Governor · Oregon', termStart:'2023', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Tina_Kotek_official_portrait.jpg'},
  {id:'read-or', name:'Tobias Read', initials:'TR', level:'state', chamber:'Secretary of State', party:'D', state:'OR', seat:'Secretary of State · Oregon', termStart:'2025', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Tobias_Read_official_portrait.jpg'},
  {id:'hoyle-or', name:'Val Hoyle', initials:'VH', level:'federal', chamber:'House', party:'D', state:'OR', seat:'House · Oregon 4th', termStart:'2023', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Rep._Val_Hoyle_-_118th_Congress.jpg'},
);

DEFAULT_PROMISES.push(
  {id:'p17', memberId:'kotek-or', text:'Build 36,000 new homes per year in Oregon.', category:'Housing', status:'stalled',
   note:'Set on her first day in office in 2023. Independent reporting on state and Census data shows Oregon has since built fewer homes per year than before she took office — well under half the goal. Her office cites a more favorable cumulative figure (54,000 homes "helped build or unlocked" since 2023), but that blends actual construction with projects still in the pipeline.',
   source:{publisher:'OPB', type:'news_report', url:'https://www.opb.org/article/2025/10/22/oregon-gov-tina-kotek-major-issues-progress-reelection-bid/'}},
  {id:'p18', memberId:'kotek-or', text:'Expand mental health and addiction treatment capacity.', category:'Health care', status:'in_progress',
   note:'State has added treatment beds since she took office, with hundreds more expected to open by the end of 2026 — real but partial progress on a persistently large problem.',
   source:{publisher:'OPB', type:'news_report', url:'https://www.opb.org/article/2025/10/22/oregon-gov-tina-kotek-major-issues-progress-reelection-bid/'}},
  {id:'p07', memberId:'hoyle-or', text:'Introduce housing choice voucher and tax credit legislation.', category:'Housing', status:'in_progress',
   note:'She says a bill has been introduced; tracked as in progress pending passage.',
   source:{publisher:'Oregon Capital Chronicle (candidate voter guide)', type:'campaign_statement', url:'https://oregoncapitalchronicle.com/race-details/oregon-4th-congressional-district-candidates-election-2024/'}},
);
