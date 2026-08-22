/* AOW Index data — Alaska (AK).
   Federal (Senate/House) and state-level officials whose state code is 'AK',
   plus their promises. Part of the split civic dataset — see data/README.md.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'ag-mills-ak', name:'Cori Mills', initials:'CM', level:'state', chamber:'Attorney General', party:'R', state:'AK', seat:'Attorney General · Alaska', termStart:'2026'},
  {id:'sen-sullivan-ak', name:'Dan Sullivan', initials:'DS', level:'federal', chamber:'Senate', party:'R', state:'AK', seat:'Senate · Alaska', termStart:'2021'},
  {id:'sen-murkowski-ak', name:'Lisa Murkowski', initials:'LM', level:'federal', chamber:'Senate', party:'R', state:'AK', seat:'Senate · Alaska', termStart:'2023'},
  {id:'gov-ak', name:'Mike Dunleavy', initials:'MD', level:'state', chamber:'Governor', party:'R', state:'AK', seat:'Governor · Alaska', termStart:'2025'},
  {id:'ltg-dahlstrom-ak', name:'Nancy Dahlstrom', initials:'ND', level:'state', chamber:'Lieutenant Governor', party:'R', state:'AK', seat:'Lieutenant Governor · Alaska', termStart:'2023'},
  {id:'rep-ak00', name:'Nicholas Begich', initials:'NB', level:'federal', chamber:'House', party:'R', state:'AK', district:0, seat:'House · Alaska At-Large', termStart:'2025'},
);
