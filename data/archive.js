/* AOW Index data — Archive: people who don't currently hold a tracked office. Same status
   vocabulary and sourcing standard as current promises. 'category' is one of:
     'former'          left office (resigned, retired, defeated, died)
     'candidate'       ran for an office and did not win  (shown as "Ran, did not win")
     'candidate-2026'  on the November 3, 2026 ballot for an office the person doesn't hold yet.
                       After the election: winners move to the roster (data/members/), losers become
                       'candidate' — update 'seat' to "Ran for …" and 'years' when that happens.
     'historical'      historical figures whose promises are still worth having on record
   Optional 'bio' is one factual line (offices held with years, or occupation) shown on the profile
   page. Part of the split civic dataset — see data/README.md. Pushes into ARCHIVE /
   ARCHIVE_PROMISES, declared in data.js, which must load before this file. 17 people so far — not
   split further. The 14 'candidate-2026' entries were checked against Wikipedia, Ballotpedia and
   news coverage on October 10, 2026; they have no promises yet (each needs the three-source check). */
ARCHIVE.push(
  {id:'arch-swalwell', name:'Eric Swalwell', initials:'ES3', party:'D', seat:'House · California 14th', years:'2013–2026', category:'former'},
  {id:'arch-orourke', name:'Beto O\'Rourke', initials:'BO', party:'D', seat:'Ran for U.S. Senate · Texas (2018, lost)', years:'2018', category:'candidate'},
  {id:'arch-romney', name:'Mitt Romney', initials:'MR2', party:'R', seat:'Senate · Utah', years:'2019–2025', category:'historical'},

  // ---- 2026 candidates (grouped by race; races A–Z, people A–Z by surname within a race) ----
  // U.S. Senate — Maine. Opponent: Sen. Susan Collins (R), roster id sen-collins-me.
  {id:'arch-troy-jackson', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/L-21-10-05-C-022_(51559078584)_(3x4).jpg', name:'Troy Jackson', initials:'TJ', party:'D', seat:'Running for U.S. Senate · Maine (2026)', years:'2026', category:'candidate-2026',
   bio:'Maine Senate President 2018–2024; in the Maine Legislature 2002–2014 and 2016–2024.'},
  // U.S. Senate — Ohio (special election). Opponent: Sen. Jon Husted (R), roster id sen-husted-oh.
  {id:'arch-sherrod-brown', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Sherrod_Brown_117th_Congress_(2).jpg', name:'Sherrod Brown', initials:'SB', party:'D', seat:'Running for U.S. Senate · Ohio (special election, 2026)', years:'2026', category:'candidate-2026',
   bio:'U.S. Senator for Ohio 2007–2025; U.S. Representative 1993–2007; Ohio Secretary of State 1983–1991.'},
  // Governor — Alaska (open seat, top-four primary, ranked-choice general). Four candidates on the November ballot.
  {id:'arch-dave-bronson', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Dave_bronson_(cropped).jpg', name:'Dave Bronson', initials:'DB', party:'R', seat:'Running for Governor · Alaska (2026)', years:'2026', category:'candidate-2026',
   bio:'Mayor of Anchorage 2021–2024; former military and airline pilot.'},
  {id:'arch-jonathan-kreiss-tomkins', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Jonathan_Kreiss-Tomkins_743.jpg', name:'Jonathan Kreiss-Tomkins', initials:'JKT', party:'D', seat:'Running for Governor · Alaska (2026)', years:'2026', category:'candidate-2026',
   bio:'Alaska state representative 2013–2023.'},
  {id:'arch-treg-taylor', name:'Treg Taylor', initials:'TT', party:'R', seat:'Running for Governor · Alaska (2026)', years:'2026', category:'candidate-2026',
   bio:'Alaska Attorney General 2021–2025.'},
  {id:'arch-bernadette-wilson', name:'Bernadette Wilson', initials:'BW', party:'R', seat:'Running for Governor · Alaska (2026)', years:'2026', category:'candidate-2026',
   bio:'Anchorage business owner (Denali Disposal) and former talk-radio host; has not held elected office.'},
  // Governor — Georgia (open seat).
  {id:'arch-keisha-lance-bottoms', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Keisha_Lance_Bottoms_2019.jpg', name:'Keisha Lance Bottoms', initials:'KLB', party:'D', seat:'Running for Governor · Georgia (2026)', years:'2026', category:'candidate-2026',
   bio:'Mayor of Atlanta 2018–2022; Atlanta City Council 2010–2018; White House Office of Public Engagement director 2022–2023.'},
  {id:'arch-rick-jackson', name:'Rick Jackson', initials:'RJ', party:'R', seat:'Running for Governor · Georgia (2026)', years:'2026', category:'candidate-2026',
   bio:'Founder of Jackson Healthcare, a privately owned health care staffing company.'},
  // Governor — Ohio (open seat).
  {id:'arch-amy-acton', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Amy_Acton_(cropped).jpg', name:'Amy Acton', initials:'AA', party:'D', seat:'Running for Governor · Ohio (2026)', years:'2026', category:'candidate-2026',
   bio:'Physician and public health official; Ohio Department of Health director 2019–2020.'},
  {id:'arch-vivek-ramaswamy', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Vivek_Ramaswamy,_Prime_Minister_Narendra_Modi,_2025_(cropped).jpg', name:'Vivek Ramaswamy', initials:'VR', party:'R', seat:'Running for Governor · Ohio (2026)', years:'2026', category:'candidate-2026',
   bio:'Entrepreneur; founded Roivant Sciences and co-founded Strive Asset Management; sought the 2024 Republican presidential nomination.'},
  // Governor — Oregon. Opponent: Gov. Tina Kotek (D), roster id kotek-or.
  {id:'arch-christine-drazan', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Christine_Drazan_(3x4a).jpg', name:'Christine Drazan', initials:'CD', party:'R', seat:'Running for Governor · Oregon (2026)', years:'2026', category:'candidate-2026',
   bio:'Oregon state senator since 2025; former Oregon House Republican Leader; 2022 Republican nominee for governor.'},
  // Governor — Wisconsin (open seat). Opponent: Rep. Tom Tiffany (R), roster id rep-wi07.
  {id:'arch-david-crowley', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/David_Crowley.jpg', name:'David Crowley', initials:'DC', party:'D', seat:'Running for Governor · Wisconsin (2026)', years:'2026', category:'candidate-2026',
   bio:'Milwaukee County Executive since 2020; Wisconsin State Assembly 2017–2020.'},
  // U.S. House — Colorado 8th. Opponent: Rep. Gabe Evans (R), roster id rep-co08.
  {id:'arch-manny-rutinel', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Manny_rutinel.jpg', name:'Manny Rutinel', initials:'MR', party:'D', seat:'Running for U.S. House · Colorado 8th (2026)', years:'2026', category:'candidate-2026',
   bio:'Colorado state representative (District 32) since 2023.'},
  // U.S. House — Pennsylvania 8th. Opponent: Rep. Rob Bresnahan (R), roster id rep-pa08.
  {id:'arch-paige-cognetti', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Paige_Cognetti_(52165104986)_(3x4a).jpg', name:'Paige Cognetti', initials:'PC', party:'D', seat:'Running for U.S. House · Pennsylvania 8th (2026)', years:'2026', category:'candidate-2026',
   bio:'Mayor of Scranton since 2020.'},
);

ARCHIVE_PROMISES.push(
  {id:'arc1', memberId:'arch-swalwell', text:'Ban and buy back military-style semiautomatic assault weapons.', category:'Public Safety', status:'broken',
   note:'A central pledge of his 2020 presidential run and a bill he repeatedly introduced in the House (the Freedom from Assault Weapons Act) for years afterward. It never gained traction in the Senate and was never enacted; he resigned from the House in April 2026 before completing his current term.',
   source:{publisher:'NBC News', type:'news_report', url:'https://nbcnews.com/politics/congress/dem-congressman-force-gun-owners-sell-assault-weapons-n871066'}},
  {id:'arc2', memberId:'arch-orourke', text:'Will not accept campaign contributions from oil and gas companies or their PACs.', category:'Government Ethics', status:'broken',
   note:'A specific pledge from his 2018 Senate campaign against Ted Cruz. Reporting during that same race found he had accepted contributions from oil and gas industry donors, breaking the pledge before the election he ultimately lost.',
   source:{publisher:'VICE News', type:'news_report', url:'https://www.vice.com/en/article/what-does-beto-actually-believe-its-tough-to-say/'}},
  {id:'arc3', memberId:'arch-romney', text:'Serve as a bipartisan dealmaker willing to work across the aisle in the Senate.', category:'Government Ethics', status:'completed',
   note:'A defining theme of his 2018 campaign and time in office. He was a lead negotiator on the 2021 bipartisan infrastructure law, COVID-19 relief legislation, gun safety legislation, and electoral vote counting reform — and was the only Senate Republican to vote to convict Trump in both impeachment trials. He chose not to seek re-election in 2024, citing his age.',
   source:{publisher:'NPR', type:'news_report', url:'https://www.npr.org/2023/09/14/1199429479/republican-sen-mitt-romney-announces-he-will-not-seek-reelection-in-2024'}},
);
