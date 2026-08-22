/* AOW Index data — Federal Executive Branch / current (Trump) Administration — part 2 of 2.
   President, VP, Cabinet, and senior agency heads — the officials with state:'US'.
   Part of the split civic dataset — see data/README.md for the full file map.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'cab-rubio', name:'Marco Rubio', initials:'MR', level:'federal', chamber:'Secretary of State', party:'R', state:'US', appointed:true, seat:'Secretary of State · United States', termStart:'2025'},
  {id:'cab-mullin', name:'Markwayne Mullin', initials:'MM', level:'federal', chamber:'Secretary of Homeland Security', party:'R', state:'US', appointed:true, seat:'Secretary of Homeland Security · United States', termStart:'2025'},
  {id:'cab-hegseth', name:'Pete Hegseth', initials:'PH', level:'federal', chamber:'Secretary of War', party:'R', state:'US', appointed:true, seat:'Secretary of War · United States', termStart:'2025'},
  {id:'agh-cekada', name:'Robert Cekada', initials:'RC', level:'federal', chamber:'ATF Director', party:'R', state:'US', appointed:true, seat:'ATF Director · United States', termStart:'2025'},
  {id:'cab-jr', name:'Robert F. Kennedy Jr.', initials:'RJ', level:'federal', chamber:'Secretary of Health and Human Services', party:'I', state:'US', appointed:true, seat:'Secretary of Health and Human Services · United States', termStart:'2025'},
  {id:'agh-scott', name:'Rodney Scott', initials:'RS', level:'federal', chamber:'CBP Commissioner', party:'R', state:'US', appointed:true, seat:'CBP Commissioner · United States', termStart:'2025'},
  {id:'cab-vought', name:'Russ Vought', initials:'RV', level:'federal', chamber:'Director of the Office of Management and Budget', party:'R', state:'US', appointed:true, seat:'Director of the Office of Management and Budget · United States', termStart:'2025'},
  {id:'cab-bessent', name:'Scott Bessent', initials:'SB', level:'federal', chamber:'Secretary of the Treasury', party:'R', state:'US', appointed:true, seat:'Secretary of the Treasury · United States', termStart:'2025'},
  {id:'cab-turner', name:'Scott Turner', initials:'ST', level:'federal', chamber:'Secretary of Housing and Urban Development', party:'R', state:'US', appointed:true, seat:'Secretary of Housing and Urban Development · United States', termStart:'2025'},
  {id:'cab-duffy', name:'Sean Duffy', initials:'SD', level:'federal', chamber:'Secretary of Transportation', party:'R', state:'US', appointed:true, seat:'Secretary of Transportation · United States', termStart:'2025'},
  {id:'agh-curran', name:'Sean M. Curran', initials:'SC', level:'federal', chamber:'U.S. Secret Service Director', party:'R', state:'US', appointed:true, seat:'U.S. Secret Service Director · United States', termStart:'2025'},
  {id:'agh-cole', name:'Terrance Cole', initials:'TC', level:'federal', chamber:'DEA Administrator', party:'R', state:'US', appointed:true, seat:'DEA Administrator · United States', termStart:'2025'},
  {id:'cab-blanche', name:'Todd Blanche', initials:'TB', level:'federal', chamber:'Attorney General (Acting)', party:'R', state:'US', appointed:true, seat:'Attorney General (Acting) · United States', termStart:'2025'},
  {id:'agh-lyons', name:'Todd Lyons', initials:'TL', level:'federal', chamber:'ICE Director (Acting)', party:'R', state:'US', appointed:true, seat:'ICE Director (Acting) · United States', termStart:'2025'},
  {id:'cab-pulte', name:'William J. Pulte', initials:'WP', level:'federal', chamber:'Director of National Intelligence (Acting)', party:'R', state:'US', appointed:true, seat:'Director of National Intelligence (Acting) · United States', termStart:'2025'},
);

DEFAULT_PROMISES.push(
  {id:'p39', memberId:'cab-rubio', text:'Designate major drug cartels and trafficking organizations as Foreign Terrorist Organizations.', category:'Public safety', status:'completed',
   note:'Rubio\'s State Department designated an initial eight cartels and criminal organizations, including Tren de Aragua and MS-13, as Foreign Terrorist Organizations in February 2025, and kept adding more through the year, including the Juarez Cartel, Los Viagras, and Venezuela\'s Cartel de los Soles in November. It is a clearly delivered, well-documented promise, though immigration attorneys and some researchers have raised concerns about the designations being applied in unrelated immigration and asylum cases.',
   source:{publisher:'U.S. Department of State', type:'official_record', url:'https://www.state.gov/terrorist-designations-of-international-cartels/'}},
  {id:'p38', memberId:'cab-hegseth', text:'Rename the Department of Defense the "Department of War."', category:'Government reform', status:'compromise',
   note:'Trump signed an executive order authorizing the secondary name in September 2025, and the department now operates day-to-day under it: its own website is war.gov and Hegseth is formally styled \'Secretary of War.\' Making it the department\'s actual legal name requires an act of Congress. As of mid-2026 a name-change bill had cleared House and Senate committees, with a Congressional Budget Office estimate that formalizing it could cost over $100 million, but it had not yet passed both chambers.',
   source:{publisher:'U.S. Department of War', type:'official_record', url:'https://www.war.gov/'}},
  {id:'p37', memberId:'cab-jr', text:'Eliminate petroleum-based synthetic dyes from the U.S. food supply.', category:'Health care', status:'compromise',
   note:'HHS and the FDA announced a phase-out plan in April 2025, but it relies on voluntary commitments from food manufacturers rather than a binding regulation banning the dyes outright. The FDA has moved to formally revoke authorization for a couple of specific dyes, but most of the eight targeted dyes remain legal and in the food supply pending industry cooperation. Fact-checkers and consumer-advocacy groups have both described this as a "plan" and an "understanding" with industry, not the outright ban it is often described as.',
   source:{publisher:'U.S. Food and Drug Administration', type:'official_record', url:'https://www.fda.gov/news-events/press-announcements/hhs-fda-phase-out-petroleum-based-synthetic-dyes-nations-food-supply'}},
);
