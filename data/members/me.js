/* AOW Index data — Maine (ME).
   Federal (Senate/House) and state-level officials whose state code is 'ME',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'ag-frey-me', name:'Aaron Frey', initials:'AF', level:'state', chamber:'Attorney General', party:'D', state:'ME', seat:'Attorney General · Maine', termStart:'2023'},
  {id:'sen-king-me', name:'Angus S., Jr. King', initials:'AK', level:'federal', chamber:'Senate', party:'I', state:'ME', seat:'Senate · Maine', termStart:'2025'},
  {id:'rep-me01', name:'Chellie Pingree', initials:'CP', level:'federal', chamber:'House', party:'D', state:'ME', district:1, seat:'House · Maine 1st', termStart:'2009'},
  {id:'gov-me', name:'Janet Mills', initials:'JM', level:'state', chamber:'Governor', party:'D', state:'ME', seat:'Governor · Maine', termStart:'2025'},
  {id:'golden-me', name:'Jared Golden', initials:'JG', level:'federal', chamber:'House', party:'D', state:'ME', seat:'House · Maine 2nd', termStart:'2019', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Jared_Golden,_official_portrait,_119th_Congress.jpg'},
  {id:'ltg-daughtry-me', name:'Mattie Daughtry', initials:'MD', level:'state', chamber:'Senate President', party:'D', state:'ME', seat:'Senate President · Maine', termStart:'2023'},
  {id:'sen-collins-me', name:'Susan M. Collins', initials:'SC', level:'federal', chamber:'Senate', party:'R', state:'ME', seat:'Senate · Maine', termStart:'2021'},
);

DEFAULT_PROMISES.push(
  {id:'p12', memberId:'golden-me', text:'Pass a universal 10% tariff on all imports (BUILT USA Act).', category:'Trade & economy', status:'in_progress',
   note:'Introduced and reintroduced as his own standalone bill; hasn’t passed under that name, though the administration separately adopted a baseline tariff along similar lines.',
   source:{publisher:'Maine Morning Star', type:'news_report', url:'https://mainemorningstar.com/briefs/rep-golden-reintroduces-proposal-for-10-tariffs-on-imports-as-a-supportive-trump-takes-office/'}},
  {id:'p13', memberId:'golden-me', text:'Cap insulin costs at $35/month for Medicare beneficiaries.', category:'Health care', status:'completed',
   note:'Reflects the Medicare insulin cap enacted via the 2022 Inflation Reduction Act, which he voted for and lists as a delivered priority.',
   source:{publisher:'Jared Golden for Congress (campaign site)', type:'campaign_statement', url:'https://jaredgoldenforcongress.com/issues/'}},
);
