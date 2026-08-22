/* AOW Index data — Trump (First Term) (2017–2021), a closed historical record.
   Part of the split civic dataset — see data/README.md for the full file map.
   Pushes into the 'trump-45' entry of PAST_ADMINISTRATIONS and into PAST_PROMISES,
   both declared in data.js, which must load before this file. Order preserved as
   the original roughly followed presidential line-of-succession / Cabinet order,
   not alphabetical — this is a small, closed set (17 people), not being split further. */
PAST_ADMINISTRATIONS.find(a=>a.id==='trump-45').people.push(
  {id:'past-trump45', name:'Donald Trump', initials:'DT', seat:'President of the United States', party:'R', termStart:'2017'},
  {id:'past-pence', name:'Mike Pence', initials:'MP', seat:'Vice President of the United States', party:'R', termStart:'2017'},
  {id:'past-pompeo', name:'Mike Pompeo', initials:'MP2', seat:'Secretary of State', party:'R', termStart:'2018'},
  {id:'past-mnuchin', name:'Steven Mnuchin', initials:'SM', seat:'Secretary of the Treasury', party:'R', termStart:'2017'},
  {id:'past-mattis', name:'James Mattis', initials:'JM2', seat:'Secretary of Defense', party:'R', termStart:'2017'},
  {id:'past-barr', name:'William Barr', initials:'WB', seat:'Attorney General', party:'R', termStart:'2019'},
  {id:'past-bernhardt', name:'David Bernhardt', initials:'DB', seat:'Secretary of the Interior', party:'R', termStart:'2019'},
  {id:'past-perdue', name:'Sonny Perdue', initials:'SP', seat:'Secretary of Agriculture', party:'R', termStart:'2017'},
  {id:'past-ross', name:'Wilbur Ross', initials:'WR', seat:'Secretary of Commerce', party:'R', termStart:'2017'},
  {id:'past-scalia', name:'Eugene Scalia', initials:'ES', seat:'Secretary of Labor', party:'R', termStart:'2019'},
  {id:'past-azar', name:'Alex Azar', initials:'AA2', seat:'Secretary of Health and Human Services', party:'R', termStart:'2018'},
  {id:'past-carson', name:'Ben Carson', initials:'BC', seat:'Secretary of Housing and Urban Development', party:'R', termStart:'2017'},
  {id:'past-chao', name:'Elaine Chao', initials:'EC', seat:'Secretary of Transportation', party:'R', termStart:'2017'},
  {id:'past-brouillette', name:'Dan Brouillette', initials:'DB2', seat:'Secretary of Energy', party:'R', termStart:'2019'},
  {id:'past-devos', name:'Betsy DeVos', initials:'BD', seat:'Secretary of Education', party:'R', termStart:'2017'},
  {id:'past-wilkie', name:'Robert Wilkie', initials:'RW2', seat:'Secretary of Veterans Affairs', party:'R', termStart:'2018'},
  {id:'past-nielsen', name:'Kirstjen Nielsen', initials:'KN', seat:'Secretary of Homeland Security', party:'R', termStart:'2017'},
);

PAST_PROMISES.push(
  {id:'pp4', memberId:'past-trump45', text:'Build a wall on the southern border, and Mexico will pay for it.', category:'Immigration', status:'broken',
   note:'About $15 billion in U.S. federal funds was spent on the wall, not Mexican funds. Independent counts found only a few dozen miles of genuinely new wall where none existed before; most work replaced existing fencing.',
   source:{publisher:'CNN', type:'news_report', url:'https://www.cnn.com/2021/01/30/politics/trump-broken-promises'}},
  {id:'pp5', memberId:'past-trump45', text:'Cut taxes for everyone, especially the middle class.', category:'Economy', status:'compromise',
   note:'The 2017 tax law did cut both corporate and individual rates as promised, but fell short of the specific targets pledged — a 15% corporate rate was promised, 21% was delivered; three brackets were promised, seven remained — and analysts found it tilted further toward top earners than described.',
   source:{publisher:'Associated Press', type:'news_report', url:'https://www.pressreader.com/usa/santa-fe-new-mexican/20180114/281689730216972'}},
);
