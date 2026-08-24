/* AOW Index data — Federal Executive Branch / current (Trump) Administration — part 1 of 2.
   President, VP, Cabinet, and senior agency heads — the officials with state:'US'.
   Part of the split civic dataset — see data/README.md for the full file map.
   Pushes into DEFAULT_MEMBERS / DEFAULT_PROMISES, declared (empty) in data.js,
   which must load before this file. Sorted alphabetically by name. */
DEFAULT_MEMBERS.push(
  {id:'cab-rollins', name:'Brooke Rollins', initials:'BR', level:'federal', chamber:'Secretary of Agriculture', party:'R', state:'US', appointed:true, seat:'Secretary of Agriculture · United States', termStart:'2025'},
  {id:'cab-wright', name:'Chris Wright', initials:'CW', level:'federal', chamber:'Secretary of Energy', party:'R', state:'US', appointed:true, seat:'Secretary of Energy · United States', termStart:'2025'},
  {id:'trump-pres', name:'Donald Trump', initials:'DT', level:'federal', chamber:'Executive', party:'R', state:'US', seat:'President of the United States', termStart:'2025', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Donald_Trump_official_portrait.jpg'},
  {id:'cab-burgum', name:'Doug Burgum', initials:'DB', level:'federal', chamber:'Secretary of the Interior', party:'R', state:'US', appointed:true, seat:'Secretary of the Interior · United States', termStart:'2025'},
  {id:'cab-collins', name:'Doug Collins', initials:'DC', level:'federal', chamber:'Secretary of Veterans Affairs', party:'R', state:'US', appointed:true, seat:'Secretary of Veterans Affairs · United States', termStart:'2025'},
  {id:'agh-serralta', name:'Gadyaces Serralta', initials:'GS', level:'federal', chamber:'U.S. Marshals Service Director', party:'R', state:'US', appointed:true, seat:'U.S. Marshals Service Director · United States', termStart:'2025'},
  {id:'cab-lutnick', name:'Howard Lutnick', initials:'HL', level:'federal', chamber:'Secretary of Commerce', party:'R', state:'US', appointed:true, seat:'Secretary of Commerce · United States', termStart:'2025'},
  {id:'cab-greer', name:'Jamieson Greer', initials:'JG', level:'federal', chamber:'United States Trade Representative', party:'R', state:'US', appointed:true, seat:'United States Trade Representative · United States', termStart:'2025'},
  {id:'vance-vp', name:'JD Vance', initials:'JV', level:'federal', chamber:'Executive', party:'R', state:'US', seat:'Vice President of the United States', termStart:'2025', photo:'https://commons.wikimedia.org/wiki/Special:FilePath/JD_Vance_official_portrait.jpg'},
  {id:'cab-ratcliffe', name:'John Ratcliffe', initials:'JR', level:'federal', chamber:'Director of the Central Intelligence Agency', party:'R', state:'US', appointed:true, seat:'Director of the Central Intelligence Agency · United States', termStart:'2025'},
  {id:'agh-patel', name:'Kash Patel', initials:'KP', level:'federal', chamber:'FBI Director', party:'R', state:'US', appointed:true, seat:'FBI Director · United States', termStart:'2025'},
  {id:'cab-sonderling', name:'Keith E. Sonderling', initials:'KS', level:'federal', chamber:'Secretary of Labor (Acting)', party:'R', state:'US', appointed:true, seat:'Secretary of Labor (Acting) · United States', termStart:'2025'},
  {id:'cab-loeffler', name:'Kelly Loeffler', initials:'KL', level:'federal', chamber:'Administrator of the Small Business Administration', party:'R', state:'US', appointed:true, seat:'Administrator of the Small Business Administration · United States', termStart:'2025'},
  {id:'cab-zeldin', name:'Lee Zeldin', initials:'LZ', level:'federal', chamber:'Administrator of the Environmental Protection Agency', party:'R', state:'US', appointed:true, seat:'Administrator of the Environmental Protection Agency · United States', termStart:'2025'},
  {id:'cab-mcmahon', name:'Linda McMahon', initials:'LM', level:'federal', chamber:'Secretary of Education', party:'R', state:'US', appointed:true, seat:'Secretary of Education · United States', termStart:'2025'},
);

DEFAULT_PROMISES.push(
  {id:'p14', memberId:'trump-pres', text:'Eliminate federal taxes on tips.', category:'Taxes & IRS', status:'compromise',
   note:'Now implemented, not just proposed: the One Big Beautiful Bill Act created a deduction of up to $25,000 in reported tips through 2028, income-capped above $150,000 and limited to occupations on a Treasury-published list. The IRS issued final rules and a filing worksheet for the 2025 tax year — real savings for many tipped workers, but still a capped, time-limited deduction rather than tips going untaxed outright.',
   sources:[
     {publisher:'IRS (U.S. Department of the Treasury)', type:'official_record', url:'https://www.irs.gov/newsroom/one-big-beautiful-bill-how-to-take-advantage-of-no-tax-on-tips-and-overtime'},
     {publisher:'PolitiFact', type:'news_report', url:'https://www.politifact.com/article/2026/apr/14/Trump-taxes-Door-Dash-tips-overtime/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/no-tax-on-tips-uber-driver-johnson-tax-break'}
   ]},
  {id:'p15', memberId:'trump-pres', text:'Secure the southern border and reduce illegal crossings.', category:'Immigration & border', status:'completed',
   note:'Holding steady well into the second year: CBP\'s own data show nationwide encounters at their lowest levels in more than 50 years, and the agency marked a full year of what it called \'the most secure border in history.\' Pew Research independently confirms the trend using the same government data. Worth noting for context: the decline began in mid-2024, under a Biden-era asylum crackdown, before accelerating further after Trump took office.',
   sources:[
     {publisher:'U.S. Customs and Border Protection', type:'official_record', url:'https://www.cbp.gov/newsroom/national-media-release/one-year-most-secure-border-history'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/border-crossings-plummet-historic-lows-trumps-enforcement-policies-yield-big-results'},
     {publisher:'PBS News', type:'news_report', url:'https://www.pbs.org/video/trump-one-year-in-immigration-1769116809/'}
   ]},
  {id:'p25', memberId:'trump-pres', text:'Impose sweeping tariffs on imports, including a universal baseline and steep "reciprocal" tariffs on major trading partners.', category:'Trade & economy', status:'compromise',
   note:'The broad "Liberation Day" reciprocal tariffs, imposed under emergency economic powers (IEEPA), were ruled unlawful by the Supreme Court in February 2026, 6-3. Trump replaced them within days with a smaller global 10% tariff under a different, time-limited authority (Section 122); that replacement drew fresh court challenges of its own by May 2026. Tariffs remain a major part of trade policy, just not at the scope or on the legal footing first claimed.',
   sources:[
     {publisher:'PolitiFact', type:'news_report', url:'https://politifact.com/article/2026/feb/20/supreme-court-strikes-down-tariffs-Trump/'},
     {publisher:'Congress.gov (Congressional Research Service)', type:'official_record', url:'https://www.congress.gov/crs-product/LSB11398'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/opinion/supreme-court-blocks-trump-tariffs-but-hands-him-smarter-path-forward'}
   ]},
  {id:'p26', memberId:'trump-pres', text:'Carry out the "largest deportation operation in American history."', category:'Immigration & border', status:'in_progress',
   note:'DHS and ICE reported roughly 600,000 removals within the first 18 months of the term, including more than 350,000 in fiscal year 2026 alone — a real enforcement surge. Independent researchers, including TRAC at Syracuse University, say the pace has not clearly exceeded the modern annual record of over 400,000 removals in a single year under the Obama administration, and have questioned how DHS calculates its own cumulative total.',
   sources:[
     {publisher:'NBC News', type:'news_report', url:'https://www.nbcnews.com/politics/immigration/trumps-immigration-record-far-high-arrests-low-deportations-rcna217752'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trump-admin-on-pace-shatter-deportation-record-end-first-year-just-the-beginning'},
     {publisher:'U.S. Immigration and Customs Enforcement', type:'official_record', url:'https://www.ice.gov/statistics'}
   ]},
  {id:'p27', memberId:'trump-pres', text:'End the war between Russia and Ukraine "in 24 hours," before or immediately upon taking office.', category:'Foreign policy', status:'broken',
   note:'The war was still active, with intensifying drone and missile strikes, as of August 2026 — nowhere close to the one-day resolution promised on the campaign trail. The administration did broker a three-day ceasefire and prisoner exchange in May 2026, but it collapsed within days, and a U.S.-set June 2026 deadline for a broader deal passed without a breakthrough.',
   sources:[
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trump-announces-surprise-three-day-ceasefire-russia-ukraine-war'},
     {publisher:'Council on Foreign Relations (Global Conflict Tracker)', type:'news_report', url:'https://www.cfr.org/global-conflict-tracker/conflict/conflict-ukraine'},
     {publisher:'PBS News', type:'news_report', url:'https://www.pbs.org/newshour/world/russia-and-ukraine-trade-blame-for-continued-fighting-that-killed-at-least-2-as-u-s-brokered-ceasefire-nears-its-end'}
   ]},
  {id:'p28', memberId:'trump-pres', text:'End automatic birthright citizenship for children born in the U.S. to parents unlawfully present or on temporary visas, by executive order.', category:'Immigration & border', status:'broken',
   note:'The Supreme Court upheld birthright citizenship as a 14th Amendment guarantee and ruled against the administration\'s Day 1 executive order on June 30, 2026, ending its attempt to narrow citizenship unilaterally. Changing it now would require a constitutional amendment, which no one in Congress has formally proposed.',
   sources:[
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/watch-supreme-court-birthright-citizenship-decision-strikes-divide-lawmakers'},
     {publisher:'Supreme Court of the United States (Trump v. Barbara)', type:'official_record', url:'https://www.supremecourt.gov/opinions/25pdf/25-365_4hdj.pdf'},
     {publisher:'PBS News', type:'news_report', url:'https://www.pbs.org/newshour/politics/supreme-court-rejects-trump-limits-on-birthright-citizenship'}
   ]},
  {id:'p29', memberId:'trump-pres', text:'Create the Department of Government Efficiency (DOGE) to cut trillions of dollars in wasteful federal spending.', category:'Government reform', status:'stalled',
   note:'Musk\'s initial $2 trillion target was cut to a $150 billion-a-year goal within his first few months running it, and he left the effort altogether by mid-2025. A Government Accountability Office audit released in August 2026 found DOGE\'s own \'Wall of Receipts\' overstated its claimed $110 billion in savings and could not verify the great majority of the grant-cancellation savings it reviewed. DOGE no longer has centralized leadership as of late 2025, per federal personnel officials, though scattered modernization projects continue.',
   sources:[
     {publisher:'Fox News', type:'news_report', url:'https://noticias.foxnews.com/politics/musk-says-doge-set-top-150b-fraud-savings-fy-2026.print'},
     {publisher:'The Hill', type:'news_report', url:'https://thehill.com/homenews/administration/6015109-gao-doge-savings-unreliable/'},
     {publisher:'U.S. Government Accountability Office', type:'official_record', url:'https://www.gao.gov/products/gao-26-108615'}
   ]},
  {id:'p30', memberId:'trump-pres', text:'Withdraw the United States from the Paris Climate Agreement.', category:'Energy & environment', status:'completed',
   note:'Signed as an executive order on Inauguration Day, 2025. The formal one-year withdrawal notice period under the agreement\'s own rules ran out in January 2026, making the exit final. It is the second time Trump has pulled the U.S. out of the accord, after doing the same in his first term.',
   sources:[
     {publisher:'Congress.gov (Congressional Research Service)', type:'official_record', url:'https://www.congress.gov/crs-product/R48504'},
     {publisher:'NBC News', type:'news_report', url:'https://www.nbcnews.com/science/climate-change/trump-exit-climate-treaty-us-no-voice-global-negotiations-rcna252980'},
     {publisher:'National Review', type:'news_report', url:'https://www.nationalreview.com/2025/02/trump-ate-my-climate-plan/'}
   ]},
  {id:'p31', memberId:'trump-pres', text:'Pardon those charged and convicted in connection with the January 6, 2021 Capitol riot.', category:'Public safety', status:'completed',
   note:'Signed on Inauguration Day, granting clemency to roughly 1,500 people charged over Jan. 6, including some convicted of assaulting police officers. It was one of the fastest-delivered promises in this entire dataset, from either party.',
   sources:[
     {publisher:'The White House', type:'official_record', url:'https://www.whitehouse.gov/presidential-actions/2025/01/granting-pardons-and-commutation-of-sentences-for-certain-offenses-relating-to-the-events-at-or-near-the-united-states-capitol-on-january-6-2021/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trump-pardons-nearly-all-jan-6-defendants-inauguration-day'},
     {publisher:'PolitiFact', type:'news_report', url:'https://www.politifact.com/truth-o-meter/promises/maga-meter-tracking-donald-trumps-2024-promises/promise/1655/fully-pardon-people-convicted-of-crimes-related-to/article/3128'}
   ]},
  {id:'p32', memberId:'trump-pres', text:'Make the 2017 tax cuts permanent and cut taxes further through a major reconciliation bill (the "One Big Beautiful Bill").', category:'Taxes & IRS', status:'completed',
   note:'Signed into law July 4, 2025 after passing Congress by reconciliation with no Democratic votes. It permanently extends the 2017 individual tax brackets, adds new deductions for tips, overtime, seniors, and auto-loan interest, and raises the SALT cap. It is paired with cuts to Medicaid and SNAP that independent analyses project will leave many lower-income households worse off on net, even as most households see a tax cut.',
   sources:[
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/news/trump-one-big-beautiful-bill-obbba-winners-losers-one-year-later/'},
     {publisher:'The White House', type:'official_record', url:'https://www.whitehouse.gov/releases/2025/07/president-trumps-one-big-beautiful-bill-is-now-the-law/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/opinion/how-trumps-big-beautiful-bill-ends-decades-temporary-tax-policy-games-washington'}
   ]},
  {id:'p33', memberId:'trump-pres', text:'Lower prescription drug prices by tying U.S. prices to the lowest price paid by other wealthy nations ("Most Favored Nation" pricing).', category:'Health care', status:'in_progress',
   note:'Signed as an executive order in May 2025. By April 2026 the administration had announced 17 separate pricing agreements with drugmakers, including Pfizer and Regeneron, covering a claimed 86% of the branded drug market, plus a TrumpRx.gov direct-purchase site. The deals are voluntary and company by company rather than one uniform rule, run for a limited term (about three years for some), and, per health-policy reporting, light on public detail about how the price cuts are calculated. The "Most Favored Nation" policy promised as a single economy-wide rule is still not in place.',
   sources:[
     {publisher:'The Hill', type:'news_report', url:'https://thehill.com/policy/healthcare/5657095-trump-policy-pharma-agreement/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trump-promises-cheaper-drugs-under-trumprx-economists-say-long-term-costs-may-hidden'},
     {publisher:'The White House', type:'official_record', url:'https://www.whitehouse.gov/fact-sheets/2026/04/fact-sheet-president-donald-j-trump-announces-deal-with-regeneron-to-bring-most-favored-nation-pricing-to-american-patients/'}
   ]},
  {id:'p34', memberId:'trump-pres', text:'Declare a national energy emergency and "unleash" American oil and gas drilling.', category:'Energy & environment', status:'in_progress',
   note:'Declared by executive order on Inauguration Day. The Interior Department reports federal drilling permits up roughly 55% and touts record domestic energy production; independent trade coverage confirms the permit surge but notes U.S. oil output was already near record levels before Trump took office, so how much of the increase reflects the emergency declaration versus a preexisting market trend is disputed.',
   sources:[
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trump-energy-czar-says-iran-conflict-gas-spike-temporary-blip-drilling-push-ramps-up'},
     {publisher:'U.S. Department of the Interior', type:'official_record', url:'https://www.doi.gov/pressreleases/interior-highlights-record-us-energy-production-under-president-trumps-american'},
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/news/trump-drilling-mining-permitting-process-shortened/'}
   ]},
  {id:'p35', memberId:'trump-pres', text:'Broker a lasting peace deal to end the Israel-Hamas war in Gaza.', category:'Foreign policy', status:'in_progress',
   note:'A 20-point "Board of Peace" framework and Hamas disarmament agreement were announced in late July 2026, which Trump called a "historic" and "monumental" breakthrough. Within days Israel said it would not withdraw troops until Hamas actually disarms, and fighting resumed, including Israeli strikes on Gaza in early August 2026. A real diplomatic framework exists, but on-the-ground implementation remains unresolved.',
   sources:[
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/hamas-agrees-complete-disarmament-historic-gaza-agreement-trump'},
     {publisher:'PBS News', type:'news_report', url:'https://www.pbs.org/newshour/show/whats-in-the-proposed-deal-to-disarm-hamas-and-withdraw-israeli-forces-from-gaza'},
     {publisher:'The White House', type:'official_record', url:'https://www.whitehouse.gov/briefings-statements/2026/01/statement-on-president-trumps-comprehensive-plan-to-end-the-gaza-conflict/'}
   ]},
  {id:'p16', memberId:'vance-vp', text:'Bring manufacturing investment and jobs back to the U.S.', category:'Trade & economy', status:'stalled',
   note:'Update: manufacturing employment remains net negative since the term began, down roughly 77,000 jobs as of a May 2026 independent fact-check, after a first-year loss estimated at 108,000 by Senate Joint Economic Committee minority staff in February 2026. Monthly data have been choppy (BLS recorded a small gain in July), and investment announcements have risen, but the cumulative jobs count has not turned positive.',
   sources:[
     {publisher:'U.S. Bureau of Labor Statistics', type:'official_record', url:'https://www.bls.gov/news.release/empsit.nr0.htm'},
     {publisher:'Fox 8 Cleveland', type:'news_report', url:'https://fox8.com/news/highlights-jd-vance-speaks-in-middletown/'},
     {publisher:'CNN (fact check)', type:'news_report', url:'https://www.cnn.com/2026/05/21/politics/fact-check-vance-manufacturing-jobs'}
   ]},
  {id:'p36', memberId:'vance-vp', text:'Expand the Child Tax Credit to as much as $5,000 per child.', category:'Taxes & IRS', status:'compromise',
   note:'Floated in an August 2024 interview as his own aspirational number, not a formal administration policy. The One Big Beautiful Bill Act, which he helped push as VP, set the credit at $2,200 per child with future inflation adjustments — a real increase over the prior $2,000 base, but well short of the $5,000 he floated.',
   sources:[
     {publisher:'U.S. Senate Committee on Finance', type:'official_record', url:'https://www.finance.senate.gov/chairmans-news/the-one-big-beautiful-bill-invests-in-families'},
     {publisher:'CBS News', type:'interview', url:'https://www.cbsnews.com/news/jd-vance-child-tax-credit-5000-what-to-know/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/opinion/congress-delivers-one-big-beautiful-win-middle-class'}
   ]},
  {id:'p40', memberId:'cab-mcmahon', text:'Shut down the U.S. Department of Education and return education authority to the states.', category:'Education', status:'compromise',
   note:'An executive order directing McMahon to facilitate the department\'s closure \'to the maximum extent\' legally possible was signed in March 2025, and large parts of its functions, including student loans and career and technical education, have since moved to other agencies. But the department still legally exists and continues to run core programs like Title I, since fully abolishing it requires an act of Congress that has not happened.',
   sources:[
     {publisher:'Sec. McMahon\'s remarks, U.S. Department of Education', type:'self_published_report', url:'https://www.ed.gov/about/news/speech/secretary-mcmahon-our-departments-final-mission'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/media/department-education-leave-building-after-40-years-part-effort-eliminate-government-agency'},
     {publisher:'NBC News', type:'news_report', url:'https://www.nbcnews.com/politics/white-house/trump-signs-executive-order-dismantle-education-department-white-house-rcna197251'}
   ]},
  {id:'p41', memberId:'trump-pres', text:'Eliminate federal taxes on Social Security benefits.', category:'Taxes & IRS', status:'compromise',
   note:'What passed is a temporary $6,000 deduction for filers 65 and older (2025\u20132028, phasing out above $75,000/$150,000 income) rather than an elimination of taxation on Social Security benefits \u2014 the underlying provision taxing benefits is unchanged. The administration says this eliminates SS-benefit tax liability for about 88% of current beneficiaries; the Committee for a Responsible Federal Budget and other analysts warn it accelerates Social Security trust fund depletion by roughly a year, since it reduces the revenue that benefit taxation feeds into the trust funds. Real, substantial relief for most current recipients \u2014 narrower and more temporary than the pledge as stated, and not free of tradeoffs.',
   sources:[
     {publisher:'PolitiFact', type:'news_report', url:'https://www.politifact.com/truth-o-meter/promises/maga-meter-tracking-donald-trumps-2024-promises/'},
     {publisher:'Tax Foundation', type:'news_report', url:'https://taxfoundation.org/blog/obbba-senior-deduction-tax-relief/'},
     {publisher:'Congressional Research Service \u2014 Taxation of Social Security Benefits and the Senior Deduction', type:'official_record', url:'https://www.congress.gov/crs-product/R48613'}
   ]},
  {id:'p42', memberId:'trump-pres', text:'Save TikTok from being banned in the United States.', category:'Technology', status:'compromise',
   note:'The app has remained continuously available to U.S. users, which is what the promise most literally required \u2014 delivered via a first-day executive order and four subsequent extensions. But the underlying divest-or-ban law, unanimously upheld by the Supreme Court, permitted only one 90-day extension; the administration has issued five. Republican senators Tom Cotton and Pete Ricketts said publicly there was "no legal basis" for the additional extensions, and National Review described the approach as flouting a bipartisan law upheld by the Court. A nonprofit sued the administration in 2026 over the continued non-enforcement. Kept in the narrow sense that TikTok stayed online; the legal mechanism used to keep it that way remains disputed, including within the president\u2019s own party.',
   sources:[
     {publisher:'NBC News', type:'news_report', url:'https://www.nbcnews.com/politics/congress/speaker-johnson-2-gop-senators-break-trump-tiktok-extension-rcna188307'},
     {publisher:'Federal Register \u2014 Saving TikTok While Protecting National Security', type:'official_record', url:'https://www.federalregister.gov/documents/2025/09/30/2025-19139/saving-tiktok-while-protecting-national-security'},
     {publisher:'National Review', type:'news_report', url:'https://www.nationalreview.com/news/trump-to-sign-off-on-tiktok-deal-with-majority-american-investors-retrained-algorithm/'}
   ]},
  {id:'p43', memberId:'trump-pres', text:'Shut down the federal Department of Education and return schooling to the states.', category:'Education', status:'stalled',
   note:'Tracked separately from Sec. McMahon\'s own promise on this (see her entry) since the two are distinct commitments. Pursued through executive action and staffing reductions, but abolishing a cabinet department requires an act of Congress, which has not passed. In July 2026 the House Education and Workforce Committee advanced a package to codify the shift, but it still needs Senate Democratic votes to pass. Independent tracking places this among the roughly one-third of second-term promises stalled by congressional inaction.',
   sources:[
     {publisher:'PBS NewsHour / PolitiFact', type:'news_report', url:'https://www.pbs.org/newshour/politics/trump-says-hes-kept-all-of-his-campaign-promises-politifacts-maga-meter-shows-otherwise'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/education-secretary-linda-mcmahon-pulls-back-curtain-trumps-plan-return-education-states.print'},
     {publisher:'U.S. Dept. of Education (McMahon budget testimony)', type:'self_published_report', url:'https://edworkforce.house.gov/uploadedfiles/mcmahon_budget_testimony.pdf'}
   ]},
  {id:'p44', memberId:'trump-pres', text:'Impose a temporary cap on credit card interest rates.', category:'Consumer protection', status:'stalled',
   note:'Proposed during the campaign, then revived in January 2026 with a Truth Social post asking major card issuers to voluntarily cap rates at 10% by January 20 \u2014 a request, not an order. No law or executive order was ever issued to mandate it, and the deadline passed with no enforcement action. A Republican-sponsored bill to codify it (Sen. Roger Marshall) has stalled amid opposition from GOP leadership, who warn a hard cap could reduce credit access. Credit card rates have drifted down somewhat on their own with 2025 Fed rate cuts, but nowhere near 10%.',
   sources:[
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/news/trump-10-percent-credit-card-rate-cap-banks-january-20/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/gop-senator-pushes-trumps-10-credit-card-rate-cap-party-leaders-push-back'},
   ]},
  {id:'p45', memberId:'trump-pres', text:'Roll back federal environmental and climate regulations.', category:'Energy & environment', status:'in_progress',
   note:'The EPA\u2019s February 2026 repeal of the 2009 "endangerment finding" \u2014 the legal foundation for most federal greenhouse-gas rules \u2014 is the single largest action here, eliminating vehicle emissions standards the agency says cost $1.3 trillion. Zeldin has called it the largest deregulatory action in U.S. history; health and environmental groups sued within days to block it, so it is being counted as in progress rather than completed pending that litigation.',
   sources:[
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/obama-era-greenhouse-gas-rules-gone-epas-zeldin-signs-single-largest-deregulatory-action-history'},
     {publisher:'U.S. Environmental Protection Agency', type:'official_record', url:'https://www.epa.gov/newsreleases/president-trump-and-administrator-zeldin-deliver-single-largest-deregulatory-action-us'},
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/news/trump-epa-endangerment-finding-greenhouse-gases-climate-change/'}
   ]},
  {id:'p46', memberId:'trump-pres', text:'Eliminate the federal income tax on overtime pay.', category:'Taxes & IRS', status:'compromise',
   note:'Same structure as the tips provision: the One Big Beautiful Bill Act created a deduction \u2014 up to $12,500 single/$25,000 joint \u2014 for the "premium" portion of overtime pay, through 2028 and phased out above $150,000/$300,000 income, not a blanket exemption. Nearly 20 million filers claimed it in the 2025 tax year per Treasury. Real relief, but narrower and shorter-lived than "eliminate the tax," and payroll taxes still apply.',
   sources:[
     {publisher:'Fox Business', type:'news_report', url:'https://www.foxbusiness.com/economy/irs-releases-guidance-trumps-no-tax-tips-overtime-deductions-what-know'},
     {publisher:'PolitiFact', type:'news_report', url:'https://www.politifact.com/truth-o-meter/promises/maga-meter-tracking-donald-trumps-2024-promises/promise/1633/end-taxation-on-overtime/article/3207/'},
     {publisher:'IRS (U.S. Department of the Treasury)', type:'official_record', url:'https://www.irs.gov/newsroom/one-big-beautiful-bill-how-to-take-advantage-of-no-tax-on-tips-and-overtime'}
   ]},
  {id:'p47', memberId:'trump-pres', text:'Withdraw the United States from international organizations and agreements seen as harmful to U.S. interests.', category:'Foreign policy', status:'completed',
   note:'Distinct from the Paris Agreement withdrawal (tracked separately). In January 2026, Trump signed a presidential memorandum directing withdrawal from 66 international organizations \u2014 31 UN entities and 35 non-UN bodies \u2014 building on earlier 2025 exits from the World Health Organization and the UN Human Rights Council. Secretary of State Rubio called the bodies "wasteful" and "captured" by agendas contrary to U.S. interests. One of the more unambiguously delivered second-term promises, though critics argue it cedes influence in forums like UNESCO to China and the EU.',
   sources:[
     {publisher:'The White House', type:'official_record', url:'https://www.whitehouse.gov/fact-sheets/2026/01/fact-sheet-president-donald-j-trump-withdraws-the-united-states-from-international-organizations-that-are-contrary-to-the-interests-of-the-united-states/'},
     {publisher:'PBS News', type:'news_report', url:'https://www.pbs.org/newshour/world/u-s-will-leave-66-international-organizations-as-trump-further-retreats-from-global-cooperation'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trump-orders-us-withdrawal-from-66-wasteful-global-organizations-sweeping-america-first-crackdown'}
   ]},
  {id:'p48', memberId:'trump-pres', text:'Deliver the most aggressive housing reform plan in American history and make housing affordable again.', category:'Housing', status:'in_progress',
   note:'A mixed record so far. The headline idea \u2014 a 50-year mortgage \u2014 was floated in late 2025, drew immediate MAGA-aligned backlash over lifetime debt concerns, and FHFA Director Pulte signaled the administration was moving away from it by January 2026. What has advanced further: a January 2026 executive order restricting large institutional investors from buying single-family homes, which is now working through Congress as part of broader bipartisan housing legislation (the Housing for the 21st Century Act / ROAD to Housing Act) rather than standing alone. The White House points to falling mortgage rates and rising affordability indices as evidence of progress; the underlying supply shortage that drives most of the affordability crisis remains largely unaddressed.',
   sources:[
     {publisher:'The White House', type:'official_record', url:'https://www.whitehouse.gov/releases/2026/01/as-president-trump-tackles-housing-affordability-progress-emerges-and-more-relief-is-on-the-horizon/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/bipartisan-housing-push-advances-trump-backed-investor-ban-faces-resistance'},
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/news/trump-ban-institutional-investors-single-family-homes'}
   ]},
  {id:'p49', memberId:'cab-lutnick', text:'Renegotiate CHIPS Act awards to extract more private investment for less federal money.', category:'Trade & economy', status:'completed',
   note:'Executed, and further than the statute\u2019s authors intended. He withheld or slowed subsidies to pressure Intel, Samsung and Micron into raising their own U.S. investment, and converted federal support into government equity \u2014 a roughly 10% stake in Intel against about $11 billion in subsidies. NIST\u2019s own press release confirms the pattern continuing at smaller scale: seven more letters of intent worth $874 million signed in July 2026, each carrying "a minority, non-controlling equity stake" for the government "to enhance the return for the U.S. taxpayer." The pushback from his own party is substantial and specific: Fox News\u2019s own coverage cites a National Review editorial stating flatly that "government shouldn\u2019t get into the chip business," alongside Sen. Thom Tillis calling the arrangement "a semi-state-owned enterprise a la CCCP" and Sen. Rand Paul calling it "a step toward socialism." The renegotiation promise was kept; whether the mechanism was authorized is disputed within his own party, by name, on the record.',
   sources:[
     {publisher:'The Hill', type:'news_report', url:'https://thehill.com/policy/technology/6000186-commerce-ai-chips-stakes/'},
     {publisher:'NIST / U.S. Department of Commerce \u2014 CHIPS Program press release', type:'self_published_report', url:'https://www.nist.gov/news-events/news/2026/07/department-commerce-announces-letters-intent-7-companies-874-million'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trumps-intel-deal-more-come-putting-government-roller-coaster-ride-business'}
   ]},
  {id:'p53', memberId:'vance-vp', text:'Defend the administration\u2019s tariff program as the engine of an American industrial revival.', category:'Trade & economy', status:'compromise',
   note:'He has been among the most consistent public advocates for the tariff strategy, including casting a tie-breaking Senate vote to protect it from a disapproval resolution. Its legal foundation has failed twice since: the Supreme Court struck down the original IEEPA tariffs on February 20, 2026, and the replacement \u2014 a 10% global surcharge under Section 122 of the Trade Act of 1974 \u2014 was itself ruled "invalid as contrary to law" by the Court of International Trade on May 7, 2026, though a federal appeals court stayed that ruling in June, letting collection continue pending appeal. The policy survives in reduced, currently-litigated form; the case for it as a durable industrial strategy remains unresolved.',
   sources:[
     {publisher:'PolitiFact', type:'news_report', url:'https://www.politifact.com/factchecks/2024/aug/29/jd-vance/most-economists-and-analyses-say-jd-vance-is-wrong/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/senate-fails-reject-trumps-national-emergency-tariffs-republicans-splinter'},
     {publisher:'Congress.gov (Congressional Research Service)', type:'official_record', url:'https://www.congress.gov/crs-product/LSB11398'}
   ]},
  {id:'p63', memberId:'cab-wright', text:'Unleash a golden era of American energy dominance by expanding LNG exports.', category:'Energy & environment', status:'completed',
   note:'His first secretarial order, signed February 5, 2025, directed DOE to boost fossil and nuclear output, speed permitting and expand exports. The Biden-era pause on new LNG export approvals was reversed on day one; DOE has since authorized or reauthorized more than 17.6 billion cubic feet per day of LNG exports. Crude production set a record 13.6 million barrels per day in 2025. Delivered on the terms he set at his confirmation hearing, where he named expanding LNG and nuclear as his first priority.',
   sources:[
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/video/6403610176112'},
     {publisher:'U.S. Department of Energy (official)', type:'self_published_report', url:'https://www.energy.gov/articles/icymi-secretaries-wright-and-burgum-join-american-energy-workers-applauding-president'},
     {publisher:'CBS News (Face the Nation)', type:'interview', url:'https://www.cbsnews.com/news/chris-wright-energy-secretary-face-the-nation-transcript-05-10-2026/'}
   ]},
  {id:'p64', memberId:'cab-wright', text:'Refill the Strategic Petroleum Reserve, drawn down under the previous administration.', category:'Energy & environment', status:'compromise',
   note:'Refilling genuinely happened through 2025, rebuilding the reserve to roughly 411\u2013415 million barrels. Then the U.S. and Israel struck Iran on February 28, 2026, and the reserve was drawn down again to fight resulting price spikes \u2014 by mid-2026 it sat near 316\u2013320 million barrels, close to a 43-year low, with Fox News reporting Wright defending the drawdown as necessary while Senate Democrats, including Schumer, called for tapping it further. The Department has since announced a 172-million-barrel "exchange" release, structured so companies borrow crude now and return it with a premium (returns beginning November 2026), which DOE projects will net roughly 200 million barrels back into the reserve over time \u2014 not a permanent sale, but not resolved yet either. GAO\u2019s own 2026 report separately found aging infrastructure and one storage site left inoperable. Genuine progress, a real reversal, and a repayment plan that hasn\u2019t delivered yet.',
   sources:[
     {publisher:'U.S. Department of Energy (official)', type:'self_published_report', url:'https://www.energy.gov/node/4849402'},
     {publisher:'U.S. Government Accountability Office \u2014 GAO-26-106918', type:'official_record', url:'https://www.gao.gov/products/gao-26-106918'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/schumer-once-blocked-trumps-move-fill-nations-oil-reserves-now-he-wants-them-opened'}
   ]},
  {id:'p69', memberId:'trump-pres', text:'Tariff foreign-made automobiles to bring car manufacturing back to the U.S.', category:'Trade & economy', status:'completed',
   note:'Proclamation invoking Section 232 of the Trade Expansion Act of 1962 imposed a 25% tariff on imported automobiles and auto parts starting April 2025 \u2014 a different legal authority than the broader "reciprocal" tariffs, so it survived the Supreme Court\u2019s February 2026 ruling against those. CBS News reporting found the tariffs raising consumer prices by thousands of dollars per vehicle even for domestically-assembled cars, since no vehicle is built with 100% U.S. content; Commerce Secretary Lutnick has pointed to Ford\u2019s move to end Lincoln imports from China as evidence the policy is working. The tariff itself is in place as promised; its net effect on reshoring versus consumer cost is genuinely disputed.',
   sources:[
     {publisher:'Fox Business', type:'news_report', url:'https://www.foxbusiness.com/politics/trump-says-he-couldnt-care-less-foreign-automakers-raise-prices-over-tariffs-we-have-plenty'},
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/news/trump-auto-tariffs-gm-ford-stellantis-car-prices/'},
     {publisher:'The White House', type:'official_record', url:'https://www.whitehouse.gov/fact-sheets/2025/03/fact-sheet-president-donald-j-trump-adjusts-imports-of-automobiles-and-automobile-parts-into-the-united-states/'}
   ]},
  {id:'p70', memberId:'trump-pres', text:'Direct the Justice Department to release the Epstein files in full.', category:'Government reform', status:'compromise',
   note:'Real disclosure at real scale: DOJ released hundreds of thousands of pages starting in early 2025 and, under a February 2026 letter, said "all" required files had been released, including a list of over 300 "politically exposed persons" named in them. That claim didn\u2019t hold up on its own terms \u2014 a bipartisan House Oversight vote subpoenaed Bondi in March 2026 after continued pressure, and DOJ subsequently released previously-withheld documents including material describing an allegation against Trump himself, which oversight Democrats called evidence of an ongoing "cover-up" rather than completeness. The administration attributes gaps to victim-identifying redactions required by law, not concealment. Genuine, large-scale disclosure; whether it is actually complete remains contested and litigated in real time.',
   sources:[
     {publisher:'U.S. Department of Justice', type:'official_record', url:'https://www.justice.gov/opa/pr/attorney-general-pamela-bondi-releases-first-phase-declassified-epstein-files'},
     {publisher:'PBS News', type:'news_report', url:'https://www.pbs.org/newshour/politics/pam-bondi-will-face-a-closed-door-questioning-from-house-lawmakers-over-the-epstein-files'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/us/ag-pam-bondi-announces-all-epstein-files-released-listing-high-profile-names'}
   ]},
  {id:'p74', memberId:'cab-greer', text:'Negotiate reciprocal trade agreements that lower foreign barriers to American exports.', category:'Trade & economy', status:'in_progress',
   note:'Real deals, real number: USTR itself counts 9 signed Agreements on Reciprocal Trade plus 9 additional frameworks as of mid-2026, including Japan, South Korea, the EU, Indonesia, Taiwan, and several Latin American and Central Asian countries, alongside dozens of Section 301 investigations. Greer told the House Ways and Means Committee the U.S. goods trade deficit fell 24% in the year after the program began. But the durability question is real: the Supreme Court struck down the broader IEEPA tariffs these deals were negotiated under the shadow of, and in July 2026 the U.S. declined to renew USMCA in its current form after a mandatory joint review, leaving that agreement merely "not terminated" rather than renewed. Deals are being signed at real pace; whether the underlying legal and negotiating leverage holds is unsettled.',
   sources:[
     {publisher:'Office of the U.S. Trade Representative', type:'self_published_report', url:'https://ustr.gov/about/policy-offices/press-office/press-releases/2026/march/ambassador-greer-announces-2026-trade-policy-agenda-and-2025-annual-report'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/media/trump-trade-chief-warns-canada-walked-away-best-deal-trigger-50-percent-us-tariffs'},
     {publisher:'Bloomberg', type:'news_report', url:'https://www.bloomberg.com/news/articles/2026-02-22/us-bilateral-trade-deals-are-still-on-track-greer-says'}
   ]},
  {id:'p75', memberId:'cab-rollins', text:'Deliver economic relief to farmers hurt by trade disruption and rising input costs.', category:'Agriculture', status:'in_progress',
   note:'USDA\u2019s own program confirms the scale: a $12 billion Farmer Bridge Assistance package announced December 8, 2025 \u2014 up to $11 billion for row-crop producers, $1 billion for specialty crops \u2014 with payments beginning by February 28, 2026. Rollins and the White House tied it explicitly to tariff-driven losses even while emphasizing "affordability" gains elsewhere. Senate Democrats Schumer and Wyden called it "a consolation prize" for markets Trump\u2019s own tariffs damaged. By July 2026 she was requesting a further $11.1 billion, and USDA secretarial disaster designations rose from 1,012 counties in 2025 to 1,152 in 2026. Real money moving on a real timeline; whether it fully offsets the underlying trade damage remains disputed along predictable lines.',
   sources:[
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/news/white-house-12-billion-aid-package-farmers'},
     {publisher:'U.S. Department of Agriculture', type:'self_published_report', url:'https://www.usda.gov/farmers-first'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trump-unleash-12b-farm-rescue-china-trade-reset-hits-us-growers.print'}
   ]},
  {id:'p76', memberId:'cab-rollins', text:'Reopen and expand export markets for American agricultural commodities, including a China soybean deal.', category:'Agriculture', status:'compromise',
   note:'The headline commitment was China purchasing 12 million metric tons of U.S. soybeans by the end of 2025, agreed after the Trump-Xi meeting in South Korea, with 25 million tons annually pledged for the following years. By late January 2026 confirmed sales stood at roughly 9.4 million metric tons against a two-year seasonal average of 20.4 million tons by that point \u2014 real recovery, still well off pace. PBS reported China had only reached about 20% of the pledged volume by the original deadline, prompting the December farm-aid package as an explicit bridge. She separately reports record corn and tree nut export years. Partial delivery against a specific, quantified target that was not met on its original timeline.',
   sources:[
     {publisher:'PBS News', type:'news_report', url:'https://www.pbs.org/newshour/show/trump-proposes-12-billion-in-aid-to-farmers-after-exceptionally-difficult-year'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trump-unleash-12b-farm-rescue-china-trade-reset-hits-us-growers.print'},
     {publisher:'U.S. Department of Agriculture', type:'self_published_report', url:'https://www.usda.gov/about-usda/news/press-releases/2026/08/04/secretary-rollins-announces-new-steps-put-farmers-first-while-minnesota-farmfest'}
   ]},
  {id:'p77', memberId:'cab-loeffler', text:'Expand capital access for small manufacturers to bring supply chains home.', category:'Economy', status:'in_progress',
   note:'Concrete steps taken: the SBA launched the 7(a) Manufacturer\u2019s Access to Revolving Credit program \u2014 its first loan program dedicated to small manufacturers \u2014 waived most upfront fees for manufacturers in FY2026, and backed the Made in America Manufacturing Finance Act to double 7(a) and 504 loan limits from $5 million to $10 million, which passed the House unanimously. As of August 2026 she was still pitching higher limits, so the increase is not yet law. Counterpoint worth recording: Senate Democrats have formally challenged her and Commerce Secretary Lutnick over simultaneous moves to eliminate the SBA\u2019s Women\u2019s Business Centers and abolish the Minority Business Development Agency, arguing support for small business is being cut even as manufacturing lending expands.',
   sources:[
     {publisher:'U.S. Small Business Administration', type:'self_published_report', url:'https://www.sba.gov/article/2025/12/01/administrator-loeffler-applauds-house-passage-made-america-manufacturing-finance-act'},
     {publisher:'Senate Commerce Committee Democrats', type:'official_record', url:'https://www.commerce.senate.gov/press/dem/release/senators-demand-answers-from-sba-administrator-loeffler-and-commerce-secretary-lutnick-on-gutting-support-for-entrepreneurs-and-small-businesses-2025-6/'},
     {publisher:'Indiana Capital Chronicle', type:'news_report', url:'https://indianacapitalchronicle.com/2026/08/14/young-loeffler-pitch-expanded-small-business-lending-during-indiana-visit/'}
   ]},
  {id:'p79', memberId:'cab-collins', text:'Clear the VA benefits claims backlog and speed up decisions for veterans.', category:'Veterans', status:'completed',
   note:'VA reports the claims backlog down more than 49% since January 20, 2025 \u2014 from roughly 260,000 unanswered claims to under 100,000 \u2014 with average processing time falling from 141.5 to 80.7 days, alongside AI pilots to streamline first-time claims. The figures are the department\u2019s own and have not been independently audited, though outside reporting corroborates the direction and Collins has defended the numbers in multiple on-record interviews, including with Fox News. Marked completed on this specific, quantified metric; the broader VHA reorganization\u2019s effect on veteran care is tracked separately. Flagging honestly: no current national left/mainstream-tier story turned up after real searching \u2014 coverage of this specific metric runs through VA\u2019s own releases and trade press rather than dedicated PBS/NBC/CBS reporting.',
   sources:[
     {publisher:'U.S. Department of Veterans Affairs', type:'self_published_report', url:'https://news.va.gov/press-room/ahead-of-veterans-day-sec-collins-vows-to-keep-improving-va-services/'},
     {publisher:'Federal News Network', type:'interview', url:'https://federalnewsnetwork.com/veterans-affairs/2026/02/va-secretary-reflects-on-year-1-what-hes-learned-whats-changing-and-whats-next/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/trump-admin-va-benefits-claims-backlog-below-100k-first-time-6-years-record-levels-service'}
   ]},
  {id:'p80', memberId:'cab-collins', text:'Make VA a service organization rather than a bureaucracy, with shorter wait times and more accountability.', category:'Veterans', status:'in_progress',
   note:'The centerpiece is the RISE reorganization of the Veterans Health Administration, announced December 2025: shrinking regional networks (VISNs) from 18 to 5, cutting administrative layers, and redirecting staff toward direct care, without (VA says) cutting medical-facility staffing. VA reports 81% of veterans in Q2 FY2026 saying they trust the agency and a record $4.8 billion in facility maintenance spending. The Senate and House Veterans Affairs Committees have pushed back hard on transparency grounds, formally demanding benchmarks, a list of cancelled contracts, and the full reorganization white paper before signing off. Flagging honestly: this entry currently lacks a source from the reliable conservative-media tier \u2014 coverage of the RISE plan specifically skewed toward trade press, government-oversight outlets, and left-leaning critique in what I found. Marked in progress because the restructuring is mid-flight and under active, unresolved congressional oversight.',
   sources:[
     {publisher:'U.S. Department of Veterans Affairs', type:'self_published_report', url:'https://www.va.gov/opa/pressrel/pressrelease.cfm?id=6118'},
     {publisher:'Senate Veterans Affairs Committee (oversight letter)', type:'official_record', url:'https://www.veterans.senate.gov/services/files/E2EB5DD4-CFE8-4657-8E45-F84E6BEFF262'},
     {publisher:'The American Prospect', type:'news_report', url:'https://prospect.org/2026/03/02/va-veterans-health-administration-consolidation-doug-collins-trump/'}
   ]},
  {id:'p83', memberId:'agh-patel', text:'Run a transparent, accountable FBI and help expose the full Epstein files.', category:'Government reform', status:'compromise',
   note:'At his January 2025 confirmation hearing he pledged to "do everything" to help expose Epstein\u2019s network, building on years of public advocacy for releasing the files before he held the job. As director, the FBI has released roughly 33,000 pages and a list naming over 300 "politically exposed persons." But at a September 2025 House Judiciary hearing, Democrats played archived video of Patel\u2019s own past calls for full release and accused him of now running "part of the cover-up," which he strenuously denied, saying court orders and victim-protection redactions explain the gaps; he declined to answer several direct yes-or-no questions on the subject. Real disclosure at real volume; the "full" release he once promised, on his own former terms, has not happened.',
   sources:[
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/kash-patel-vows-do-everything-help-gop-senator-expose-epstein-files.print'},
     {publisher:'House Judiciary Committee Democrats', type:'official_record', url:'https://democrats-judiciary.house.gov/media-center/press-releases/under-director-kash-patel-fbi-is-covering-up-trump-s-relationship-with-epstein-sacking-experienced-counterterrorism-agents-and-endangering-public-safety'},
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/live-updates/kash-patel-hearing-house-judiciary-committee-charlie-kirk-epstein-files/'}
   ]},
  {id:'p85', memberId:'cab-burgum', text:'Expand oil and gas leasing and permitting on federal lands.', category:'Energy & environment', status:'completed',
   note:'Interior reports Bureau of Land Management oil and gas lease sales raised over $356 million in the first year, which the department says exceeds the total across all four years of the previous administration, plus a single New Mexico/Texas sale later topping $4 billion and a National Petroleum Reserve-Alaska sale setting a program revenue record. The Arctic National Wildlife Refuge coastal plain was reopened to leasing (82% of NPR-A and all 1.56 million acres of the ANWR coastal plain), though the first ANWR sale itself drew only $3.7 million with major producers staying away. Interior also proposed rules shortening public-comment windows on new leases from 90 days to 10. Note the sourcing: the headline revenue figures are Interior\u2019s own and self-reported rather than independently audited, and reporting has separately found the secretary meeting with an oil executive whose company benefited from expedited permits on land the secretary\u2019s own family leases.',
   sources:[
     {publisher:'Fox News (Burgum, Zeldin & Wright op-ed)', type:'news_report', url:'https://www.foxnews.com/opinion/burgum-zeldin-wright-how-america-achieve-energy-dominance'},
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/news/trump-offshore-oil-leases-us-coastlines/'},
     {publisher:'U.S. Department of the Interior', type:'self_published_report', url:'https://www.doi.gov/promises-made-promises-kept'}
   ]},
  {id:'p86', memberId:'cab-zeldin', text:'Address PFAS ("forever chemicals") contamination and protect drinking water.', category:'Energy & environment', status:'compromise',
   note:'A genuinely mixed record. EPA announced a broad PFAS action plan in April 2025, kept the enforceable Biden-era limits on the two best-studied compounds (PFOA and PFOS), and later announced nearly $1 billion for small and rural water systems to address contamination. But the agency also proposed extending utility compliance deadlines from 2029 to 2031, rescinded limits on four other PFAS compounds entirely, terminated more than $15 million in PFAS research grants, and cut the Clean Water State Revolving Fund \u2014 the main mechanism for removing PFAS from drinking water \u2014 by 90% in its budget request. Zeldin has repeatedly requested delays in the court case over the Superfund liability designation he says he supports. Real action on some fronts, real rollback on others, by the agency\u2019s own hand.',
   sources:[
     {publisher:'U.S. Environmental Protection Agency', type:'self_published_report', url:'https://www.epa.gov/newsreleases/administrator-zeldin-announces-major-epa-actions-combat-pfas-contamination'},
     {publisher:'PBS News', type:'news_report', url:'https://www.pbs.org/newshour/politics/watch-live-zeldin-testfies-on-budget-request-as-epa-announces-it-plans-to-weaken-limits-on-some-pfas-chemicals'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/video/6372981773112'}
   ]},
  {id:'p87', memberId:'cab-ratcliffe', text:'Dramatically accelerate CIA technology adoption, especially AI and quantum computing.', category:'Government reform', status:'in_progress',
   note:'He raised this at his January 2025 confirmation hearing, calling the agency\u2019s tech posture "not where it\u2019s supposed to be," and detailed the plan publicly for the first time at an AWS Public Sector Summit keynote on June 30, 2026: compressing the acquisition-to-deployment pipeline from roughly 24 months (plus 9 months of security review) down to 6 months. He reported nearly 400 acquisitions completed under the new framework in the prior six months, and credited the accelerated tech posture with supporting the January 2026 capture of Venezuelan president Nicol\u00e1s Maduro. Genuinely checkable: a specific, quantified timeline goal with an interim number attached, announced two months before this entry, still mid-rollout.',
   sources:[
     {publisher:'Bloomberg', type:'news_report', url:'https://www.bloomberg.com/news/articles/2026-06-30/cia-aims-to-speed-tech-adoption-as-ai-is-rewriting-conflict'},
     {publisher:'Federal News Network', type:'interview', url:'https://federalnewsnetwork.com/intelligence-community/2026/06/ratcliffe-details-fundamental-reshaping-of-cia-tech-efforts/'},
     {publisher:'Fox News', type:'news_report', url:'https://www.foxnews.com/politics/cia-being-restructured-eliminate-well-documented-politicization-ratcliffe'}
   ]},
  {id:'p88', memberId:'cab-sonderling', text:'Prepare American workers for AI\u2019s impact through training, literacy, and workforce data.', category:'Economy', status:'in_progress',
   note:'A genuinely active, multi-part rollout rather than a single action: DOL released an AI Literacy Framework, launched a "Make America AI-Ready" training course, partnered with the National Science Foundation on the TechAccess initiative, and began integrating AI skills into Registered Apprenticeship programs, all stemming from the White House\u2019s July 2025 "AI Action Plan." The centerpiece \u2014 a dedicated AI Workforce Hub to track AI\u2019s labor-market impact \u2014 was still described as "not yet launched" as of his July 2026 confirmation hearing, a year after DOL first announced the initiative, with no firm date given beyond "super big" ambitions. Real programs shipped; the flagship piece is still pending.',
   sources:[
     {publisher:'U.S. Department of Labor', type:'self_published_report', url:'https://www.dol.gov/newsroom/releases/osec/osec20260324'},
     {publisher:'FedScoop', type:'news_report', url:'https://fedscoop.com/labor-department-ai-workforce-hub-launch/'},
     {publisher:'Fox News', type:'news_report', url:'https://radio.foxnews.com/?p=289750'}
   ]},
  {id:'p92', memberId:'agh-serralta', text:'Prioritize protecting federal judges amid a documented surge in threats.', category:'Public safety', status:'in_progress',
   note:'He called judicial protection the Marshals Service\u2019s "solemn mandate" at his confirmation hearing, pledging to properly resource protective details as threats rose. The agency\u2019s own data shows why: 564 threats to federal judges in fiscal 2025, with 370 more logged by July 2026, and 299 individual judges named as threat targets that year. Concrete follow-through includes an open multi-agency investigation (with CIA and FBI assistance, by his own account) into a judge-intimidation scheme, and a $34 million budget request for 78 additional judicial-security positions. The tension: congressional Democrats and outside reporting note the same agency has simultaneously deployed marshals to immigration enforcement and local "crime surge" task forces, which judges and Bloomberg Law reporting say has strained the staffing available for the judicial-protection mission he calls his top priority.',
   sources:[
     {publisher:'U.S. Marshals Service (2026 Judicial Security Fact Sheet)', type:'self_published_report', url:'https://www.usmarshals.gov/sites/default/files/media/document/2026-Judicial-Security.pdf'},
     {publisher:'Washington Times', type:'news_report', url:'https://www.washingtontimes.com/news/2026/mar/18/cia-fbi-help-us-marshals-service-probe-pizza-doxxing-judicial-threats/'},
     {publisher:'CBS News', type:'news_report', url:'https://www.cbsnews.com/video/threats-federal-judges-have-already-outpaced-last-years-total-numbers-new-data-shows'}
   ]},
);
