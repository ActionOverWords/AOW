/* AOW Index data — Archive: former officeholders, losing candidates, and other
   historical figures who don't currently hold a tracked office. Same status
   vocabulary and sourcing standard as current promises. 'category' is
   'former' | 'candidate' | 'historical'. Part of the split civic dataset —
   see data/README.md. Pushes into ARCHIVE / ARCHIVE_PROMISES, declared in
   data.js, which must load before this file. Only 3 people so far — not split further. */
ARCHIVE.push(
  {id:'arch-swalwell', name:'Eric Swalwell', initials:'ES3', party:'D', seat:'House · California 14th', years:'2013–2026', category:'former'},
  {id:'arch-orourke', name:'Beto O\'Rourke', initials:'BO', party:'D', seat:'Ran for U.S. Senate · Texas (2018, lost)', years:'2018', category:'candidate'},
  {id:'arch-romney', name:'Mitt Romney', initials:'MR2', party:'R', seat:'Senate · Utah', years:'2019–2025', category:'historical'},
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
