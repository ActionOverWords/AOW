/* AOW Index data — Texas (TX) — part 1 of 3.
   Federal (Senate/House) and state-level officials whose state code is 'TX',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'rep-tx09', name:'Al Green', initials:'AG', level:'federal', chamber:'House', party:'D', state:'TX', district:9, seat:'House · Texas 9th', termStart:'2025'},
  {id:'rep-tx11', name:'August Pfluger', initials:'AP', level:'federal', chamber:'House', party:'R', state:'TX', district:11, seat:'House · Texas 11th', termStart:'2025'},
  {id:'rep-tx24', name:'Beth Van Duyne', initials:'BD', level:'federal', chamber:'House', party:'R', state:'TX', district:24, seat:'House · Texas 24th', termStart:'2025'},
  {id:'rep-tx26', name:'Brandon Gill', initials:'BG', level:'federal', chamber:'House', party:'R', state:'TX', district:26, seat:'House · Texas 26th', termStart:'2025'},
  {id:'rep-tx36', name:'Brian Babin', initials:'BB', level:'federal', chamber:'House', party:'R', state:'TX', district:36, seat:'House · Texas 36th', termStart:'2025'},
  {id:'rep-tx21', name:'Chip Roy', initials:'CR', level:'federal', chamber:'House', party:'R', state:'TX', district:21, seat:'House · Texas 21th', termStart:'2025'},
  {id:'rep-tx18', name:'Christian Menefee', initials:'CM', level:'federal', chamber:'House', party:'D', state:'TX', district:18, seat:'House · Texas 18th', termStart:'2025'},
  {id:'rep-tx12', name:'Craig Goldman', initials:'CG', level:'federal', chamber:'House', party:'R', state:'TX', district:12, seat:'House · Texas 12th', termStart:'2025'},
  {id:'rep-tx02', name:'Dan Crenshaw', initials:'DC', level:'federal', chamber:'House', party:'R', state:'TX', district:2, seat:'House · Texas 2nd', termStart:'2025'},
  {id:'exec-patrick-tx', name:'Dan Patrick', initials:'DP', level:'state', chamber:'Lieutenant Governor', party:'R', state:'TX', seat:'Lieutenant Governor · Texas', termStart:'2023'},
  {id:'exec-buckingham-tx', name:'Dawn Buckingham', initials:'DB', level:'state', chamber:'Land Commissioner', party:'R', state:'TX', seat:'Land Commissioner · Texas', termStart:'2023'},
  {id:'abbott-tx', name:'Greg Abbott', initials:'GA', level:'state', chamber:'Governor', party:'R', state:'TX', seat:'Governor · Texas', termStart:'2015', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Greg_Abbott_official_portrait.jpg'},
  {id:'rep-tx35', name:'Greg Casar', initials:'GC', level:'federal', chamber:'House', party:'D', state:'TX', district:35, seat:'House · Texas 35th', termStart:'2025'},
  {id:'rep-tx28', name:'Henry Cuellar', initials:'HC', level:'federal', chamber:'House', party:'D', state:'TX', district:28, seat:'House · Texas 28th', termStart:'2025'},
  {id:'rep-tx06', name:'Jake Ellzey', initials:'JE', level:'federal', chamber:'House', party:'R', state:'TX', district:6, seat:'House · Texas 6th', termStart:'2025'},
);

DEFAULT_PROMISES.push(
  {id:'p19', memberId:'abbott-tx', text:'Build a state-funded wall along the Texas-Mexico border.', category:'Immigration & border', status:'compromise',
   note:'The state declared the project "complete" in early 2026 at 82.2 miles — a small fraction of the roughly 805-1,254 miles originally planned when Operation Lone Star launched in 2021. Real infrastructure was built and construction crews have since left; the scope was quietly redefined rather than the original goal met.',
   source:{publisher:'Border Report', type:'news_report', url:'https://www.borderreport.com/border-report-tour/the-border-wall/mission-accomplished-texas-officials-say-state-funded-border-wall-complete/'}},
  {id:'p20', memberId:'abbott-tx', text:'Eliminate property taxes for Texas homeowners.', category:'Taxes & IRS', status:'not_started',
   note:'Centerpiece of his 2026 reelection campaign, unveiled in a five-point plan; requires legislative action and likely a voter-approved constitutional change neither of which has happened yet. Past rounds of Abbott property-tax "relief" (2019, 2023, 2025) reduced bills temporarily but didn’t stop them from rising overall.',
   source:{publisher:'The Texas Tribune', type:'news_report', url:'https://www.texastribune.org/2025/12/09/greg-abbott-schools-property-tax-cut-election-2026/'}},
);
