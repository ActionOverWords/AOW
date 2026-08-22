# AOW Index — data/ file map

The civic dataset used to live entirely in one ~310KB `data.js`. It's now split into small
files in this folder — alphabetically by state, and separately by administration — capped at
20 people per file, so any one file is quick to open, edit, and review. `data.js` (one level up)
declares the shared arrays empty; every file below pushes its rows into them. `aow-index.html`
loads `data.js` first, then every file below (order among them doesn't matter), then the app.

To add a new state file later (e.g. a state crosses 20 people and needs a `-2` part), create the
file and add one `<script src="data/...">` line in `aow-index.html` — `data.js` itself never needs
to change.

**Use Ctrl+F / Cmd+F on a person's name below to find which file has their record.**

## Administration (federal executive branch — President, VP, Cabinet, agency heads)

### data/members/administration-1.js (15 people)

- Brooke Rollins (R) — Secretary of Agriculture · United States
- Chris Wright (R) — Secretary of Energy · United States
- Donald Trump (R) — President of the United States
- Doug Burgum (R) — Secretary of the Interior · United States
- Doug Collins (R) — Secretary of Veterans Affairs · United States
- Gadyaces Serralta (R) — U.S. Marshals Service Director · United States
- Howard Lutnick (R) — Secretary of Commerce · United States
- Jamieson Greer (R) — United States Trade Representative · United States
- JD Vance (R) — Vice President of the United States
- John Ratcliffe (R) — Director of the Central Intelligence Agency · United States
- Kash Patel (R) — FBI Director · United States
- Keith E. Sonderling (R) — Secretary of Labor (Acting) · United States
- Kelly Loeffler (R) — Administrator of the Small Business Administration · United States
- Lee Zeldin (R) — Administrator of the Environmental Protection Agency · United States
- Linda McMahon (R) — Secretary of Education · United States

### data/members/administration-2.js (15 people)

- Marco Rubio (R) — Secretary of State · United States
- Markwayne Mullin (R) — Secretary of Homeland Security · United States
- Pete Hegseth (R) — Secretary of War · United States
- Robert Cekada (R) — ATF Director · United States
- Robert F. Kennedy Jr. (I) — Secretary of Health and Human Services · United States
- Rodney Scott (R) — CBP Commissioner · United States
- Russ Vought (R) — Director of the Office of Management and Budget · United States
- Scott Bessent (R) — Secretary of the Treasury · United States
- Scott Turner (R) — Secretary of Housing and Urban Development · United States
- Sean Duffy (R) — Secretary of Transportation · United States
- Sean M. Curran (R) — U.S. Secret Service Director · United States
- Terrance Cole (R) — DEA Administrator · United States
- Todd Blanche (R) — Attorney General (Acting) · United States
- Todd Lyons (R) — ICE Director (Acting) · United States
- William J. Pulte (R) — Director of National Intelligence (Acting) · United States

## States & territories (A–Z)

### data/members/ak.js (6 people)

- Cori Mills (R) — Attorney General · Alaska
- Dan Sullivan (R) — Senate · Alaska
- Lisa Murkowski (R) — Senate · Alaska
- Mike Dunleavy (R) — Governor · Alaska
- Nancy Dahlstrom (R) — Lieutenant Governor · Alaska
- Nicholas Begich (R) — House · Alaska At-Large

### data/members/al.js (12 people)

- Barry Moore (R) — House · Alabama 1st
- Dale Strong (R) — House · Alabama 5th
- Gary Palmer (R) — House · Alabama 6th
- Katie Boyd Britt (R) — Senate · Alabama
- Kay Ivey (R) — Governor · Alabama
- Mike Rogers (R) — House · Alabama 3rd
- Robert Aderholt (R) — House · Alabama 4th
- Shomari Figures (D) — House · Alabama 2nd
- Steve Marshall (R) — Attorney General · Alabama
- Terri Sewell (D) — House · Alabama 7th
- Tommy Tuberville (R) — Senate · Alabama
- Will Ainsworth (R) — Lieutenant Governor · Alabama

### data/members/ar.js (9 people)

- Bruce Westerman (R) — House · Arkansas 4th
- Eric Crawford (R) — House · Arkansas 1st
- J. Hill (R) — House · Arkansas 2nd
- John Boozman (R) — Senate · Arkansas
- Leslie Rutledge (R) — Lieutenant Governor · Arkansas
- Sarah Huckabee Sanders (R) — Governor · Arkansas
- Steve Womack (R) — House · Arkansas 3rd
- Tim Griffin (R) — Attorney General · Arkansas
- Tom Cotton (R) — Senate · Arkansas

### data/members/as.js (1 people)

- Aumua Amata Coleman Radewagen (R) — House · Delegate, American Samoa

### data/members/az.js (14 people)

- Abraham Hamadeh (R) — House · Arizona 8th
- Adelita Grijalva (D) — House · Arizona 7th
- Adrian Fontes (D) — Secretary of State · Arizona
- Andy Biggs (R) — House · Arizona 5th
- David Schweikert (R) — House · Arizona 1st
- Elijah Crane (R) — House · Arizona 2nd
- Greg Stanton (D) — House · Arizona 4th
- Juan Ciscomani (R) — House · Arizona 6th
- Katie Hobbs (D) — Governor · Arizona
- Kris Mayes (D) — Attorney General · Arizona
- Mark Kelly (D) — Senate · Arizona
- Paul Gosar (R) — House · Arizona 9th
- Ruben Gallego (D) — Senate · Arizona
- Yassamin Ansari (D) — House · Arizona 3rd

### data/members/ca-1.js (16 people)

- Adam B. Schiff (D) — Senate · California
- Adam Gray (D) — House · California 13th
- Alex Padilla (D) — Senate · California
- Ami Bera (D) — House · California 6th
- Brad Sherman (D) — House · California 32th
- Darrell Issa (R) — House · California 48th
- Dave Min (D) — House · California 47th
- David Valadao (R) — House · California 22th
- Derek Tran (D) — House · California 45th
- Doris Matsui (D) — House · California 7th
- Eleni Kounalakis (D) — Lieutenant Governor · California
- Fiona Ma (D) — Treasurer · California
- Gavin Newsom (D) — Governor · California
- George Whitesides (D) — House · California 27th
- Gilbert Cisneros (D) — House · California 31th
- J. Correa (D) — House · California 46th

### data/members/ca-2.js (15 people)

- James Gallagher (R) — House · California 1st
- Jared Huffman (D) — House · California 2nd
- Jay Obernolte (R) — House · California 23th
- Jim Costa (D) — House · California 21th
- Jimmy Gomez (D) — House · California 34th
- Jimmy Panetta (D) — House · California 19th
- John Garamendi (D) — House · California 8th
- Josh Harder (D) — House · California 9th
- Juan Vargas (D) — House · California 52th
- Judy Chu (D) — House · California 28th
- Julia Brownley (D) — House · California 26th
- Ken Calvert (R) — House · California 41th
- Kevin Kiley (R) — House · California 3rd
- Kevin Mullin (D) — House · California 15th
- Lateefah Simon (D) — House · California 12th

### data/members/ca-3.js (15 people)

- Laura Friedman (D) — House · California 30th
- Linda Sanchez (D) — House · California 38th
- Luz Rivas (D) — House · California 29th
- Malia Cohen (D) — Controller · California
- Mark DeSaulnier (D) — House · California 10th
- Mark Takano (D) — House · California 39th
- Maxine Waters (D) — House · California 43th
- Mike Levin (D) — House · California 49th
- Mike Thompson (D) — House · California 4th
- Nancy Pelosi (D) — House · California 11th
- Nanette Barragan (D) — House · California 44th
- Norma Torres (D) — House · California 35th
- Pete Aguilar (D) — House · California 33th
- Raul Ruiz (D) — House · California 25th
- Ricardo Lara (D) — Insurance Commissioner · California

### data/members/ca-4.js (15 people)

- Ro Khanna (D) — House · California 17th
- Rob Bonta (D) — Attorney General · California
- Robert Garcia (D) — House · California 42th
- Salud Carbajal (D) — House · California 24th
- Sam Liccardo (D) — House · California 16th
- Sara Jacobs (D) — House · California 51th
- Scott Peters (D) — House · California 50th
- Shirley Weber (D) — Secretary of State · California
- Sydney Kamlager-Dove (D) — House · California 37th
- Ted Lieu (D) — House · California 36th
- Tom McClintock (R) — House · California 5th
- Tony Thurmond (NP) — Superintendent of Public Instruction · California
- Vince Fong (R) — House · California 20th
- Young Kim (R) — House · California 40th
- Zoe Lofgren (D) — House · California 18th

### data/members/co.js (13 people)

- Brittany Pettersen (D) — House · Colorado 7th
- Diana DeGette (D) — House · Colorado 1st
- Dianne Primavera (D) — Lieutenant Governor · Colorado
- Gabe Evans (R) — House · Colorado 8th
- Jared Polis (D) — Governor · Colorado
- Jason Crow (D) — House · Colorado 6th
- Jeff Crank (R) — House · Colorado 5th
- Jeff Hurd (R) — House · Colorado 3rd
- Joe Neguse (D) — House · Colorado 2nd
- John W. Hickenlooper (D) — Senate · Colorado
- Lauren Boebert (R) — House · Colorado 4th
- Michael F. Bennet (D) — Senate · Colorado
- Phil Weiser (D) — Attorney General · Colorado

### data/members/ct.js (10 people)

- Christopher Murphy (D) — Senate · Connecticut
- Jahana Hayes (D) — House · Connecticut 5th
- James Himes (D) — House · Connecticut 4th
- Joe Courtney (D) — House · Connecticut 2nd
- John Larson (D) — House · Connecticut 1st
- Ned Lamont (D) — Governor · Connecticut
- Richard Blumenthal (D) — Senate · Connecticut
- Rosa DeLauro (D) — House · Connecticut 3rd
- Susan Bysiewicz (D) — Lieutenant Governor · Connecticut
- William Tong (D) — Attorney General · Connecticut

### data/members/dc.js (1 people)

- Eleanor Holmes Norton (D) — House · Delegate, District of Columbia

### data/members/de.js (6 people)

- Christopher A. Coons (D) — Senate · Delaware
- Kathy Jennings (D) — Attorney General · Delaware
- Kyle Evans Gay (D) — Lieutenant Governor · Delaware
- Lisa Blunt Rochester (D) — Senate · Delaware
- Matt Meyer (D) — Governor · Delaware
- Sarah McBride (D) — House · Delaware At-Large

### data/members/fl-1.js (17 people)

- Aaron Bean (R) — House · Florida 4th
- Anna Paulina Luna (R) — House · Florida 13th
- Ashley Moody (R) — Senate · Florida
- Blaise Ingoglia (R) — Chief Financial Officer · Florida
- Brian Mast (R) — House · Florida 21st
- Byron Donalds (R) — House · Florida 19th
- Carlos Gimenez (R) — House · Florida 28th
- Cory Mills (R) — House · Florida 7th
- Daniel Webster (R) — House · Florida 11th
- Darren Soto (D) — House · Florida 9th
- Debbie Wasserman Schultz (D) — House · Florida 25th
- Frederica Wilson (D) — House · Florida 24th
- Gus Bilirakis (R) — House · Florida 12th
- James Uthmeier (R) — Attorney General · Florida
- Jared Moskowitz (D) — House · Florida 23th
- Jay Collins (R) — Lieutenant Governor · Florida
- Jimmy Patronis (R) — House · Florida 1st

### data/members/fl-2.js (17 people)

- John Rutherford (R) — House · Florida 5th
- Kat Cammack (R) — House · Florida 3rd
- Kathy Castor (D) — House · Florida 14th
- Laurel Lee (R) — House · Florida 15th
- Lois Frankel (D) — House · Florida 22th
- Maria Salazar (R) — House · Florida 27th
- Mario Diaz-Balart (R) — House · Florida 26th
- Maxwell Frost (D) — House · Florida 10th
- Mike Haridopolos (R) — House · Florida 8th
- Neal Dunn (R) — House · Florida 2nd
- Randy Fine (R) — House · Florida 6th
- Rick Scott (R) — Senate · Florida
- Ron DeSantis (R) — Governor · Florida
- Scott Franklin (R) — House · Florida 18th
- Vern Buchanan (R) — House · Florida 16th
- W. Steube (R) — House · Florida 17th
- Wilton Simpson (R) — Commissioner of Agriculture · Florida

### data/members/ga.js (18 people)

- Andrew Clyde (R) — House · Georgia 9th
- Austin Scott (R) — House · Georgia 8th
- Barry Loudermilk (R) — House · Georgia 11th
- Brian Jack (R) — House · Georgia 3rd
- Brian Kemp (R) — Governor · Georgia
- Burt Jones (R) — Lieutenant Governor · Georgia
- Chris Carr (R) — Attorney General · Georgia
- Clay Fuller (R) — House · Georgia 14th
- Earl Carter (R) — House · Georgia 1st
- Henry Johnson (D) — House · Georgia 4th
- Jon Ossoff (D) — Senate · Georgia
- Lucy McBath (D) — House · Georgia 6th
- Mike Collins (R) — House · Georgia 10th
- Nikema Williams (D) — House · Georgia 5th
- Raphael G. Warnock (D) — Senate · Georgia
- Richard McCormick (R) — House · Georgia 7th
- Rick Allen (R) — House · Georgia 12th
- Sanford Bishop (D) — House · Georgia 2nd

### data/members/gu.js (1 people)

- James Moylan (R) — House · Delegate, Guam

### data/members/hi.js (8 people)

- Anne E. Lopez (D) — Attorney General · Hawaii
- Brian Schatz (D) — Senate · Hawaii
- Ed Case (D) — House · Hawaii 1st
- Jill Tokuda (D) — House · Hawaii 2nd
- Josh Green (D) — Governor · Hawaii
- Keith Regan (D) — Acting Lieutenant Governor · Hawaii
- Mazie K. Hirono (D) — Senate · Hawaii
- Sylvia Luke (D) — Lieutenant Governor · Hawaii

### data/members/ia.js (9 people)

- Ashley Hinson (R) — House · Iowa 2nd
- Brenna Bird (R) — Attorney General · Iowa
- Chris Cournoyer (R) — Lieutenant Governor · Iowa
- Chuck Grassley (R) — Senate · Iowa
- Joni Ernst (R) — Senate · Iowa
- Kim Reynolds (R) — Governor · Iowa
- Mariannette Miller-Meeks (R) — House · Iowa 1st
- Randy Feenstra (R) — House · Iowa 4th
- Zachary Nunn (R) — House · Iowa 3rd

### data/members/id.js (7 people)

- Brad Little (R) — Governor · Idaho
- James E. Risch (R) — Senate · Idaho
- Michael Simpson (R) — House · Idaho 2nd
- Mike Crapo (R) — Senate · Idaho
- Raúl Labrador (R) — Attorney General · Idaho
- Russ Fulcher (R) — House · Idaho 1st
- Scott Bedke (R) — Lieutenant Governor · Idaho

### data/members/il-1.js (13 people)

- Alexi Giannoulias (D) — Secretary of State · Illinois
- Bill Foster (D) — House · Illinois 11th
- Bradley Schneider (D) — House · Illinois 10th
- Danny Davis (D) — House · Illinois 7th
- Darin LaHood (R) — House · Illinois 16th
- Delia Ramirez (D) — House · Illinois 3rd
- Eric Sorensen (D) — House · Illinois 17th
- Janice Schakowsky (D) — House · Illinois 9th
- JB Pritzker (D) — Governor · Illinois
- Jesus Garcia (D) — House · Illinois 4th
- Jonathan Jackson (D) — House · Illinois 1st
- Juliana Stratton (D) — Lieutenant Governor · Illinois
- Kwame Raoul (D) — Attorney General · Illinois

### data/members/il-2.js (12 people)

- Lauren Underwood (D) — House · Illinois 14th
- Mary Miller (R) — House · Illinois 15th
- Mike Bost (R) — House · Illinois 12th
- Mike Frerichs (D) — Treasurer · Illinois
- Mike Quigley (D) — House · Illinois 5th
- Nikki Budzinski (D) — House · Illinois 13th
- Raja Krishnamoorthi (D) — House · Illinois 8th
- Richard J. Durbin (D) — Senate · Illinois
- Robin Kelly (D) — House · Illinois 2nd
- Sean Casten (D) — House · Illinois 6th
- Susana Mendoza (D) — Comptroller · Illinois
- Tammy Duckworth (D) — Senate · Illinois

### data/members/in.js (14 people)

- Andre Carson (D) — House · Indiana 7th
- Erin Houchin (R) — House · Indiana 9th
- Frank Mrvan (D) — House · Indiana 1st
- James Baird (R) — House · Indiana 4th
- Jefferson Shreve (R) — House · Indiana 6th
- Jim Banks (R) — Senate · Indiana
- Mark Messmer (R) — House · Indiana 8th
- Marlin Stutzman (R) — House · Indiana 3rd
- Micah Beckwith (R) — Lieutenant Governor · Indiana
- Mike Braun (R) — Governor · Indiana
- Rudy Yakym (R) — House · Indiana 2nd
- Todd Rokita (R) — Attorney General · Indiana
- Todd Young (R) — Senate · Indiana
- Victoria Spartz (R) — House · Indiana 5th

### data/members/ks.js (9 people)

- David Toland (D) — Lieutenant Governor · Kansas
- Derek Schmidt (R) — House · Kansas 2nd
- Jerry Moran (R) — Senate · Kansas
- Kris Kobach (R) — Attorney General · Kansas
- Laura Kelly (D) — Governor · Kansas
- Roger Marshall (R) — Senate · Kansas
- Ron Estes (R) — House · Kansas 4th
- Sharice Davids (D) — House · Kansas 3rd
- Tracey Mann (R) — House · Kansas 1st

### data/members/ky.js (11 people)

- Andy Barr (R) — House · Kentucky 6th
- Andy Beshear (D) — Governor · Kentucky
- Brett Guthrie (R) — House · Kentucky 2nd
- Harold Rogers (R) — House · Kentucky 5th
- Jacqueline Coleman (D) — Lieutenant Governor · Kentucky
- James Comer (R) — House · Kentucky 1st
- Mitch McConnell (R) — Senate · Kentucky
- Morgan McGarvey (D) — House · Kentucky 3rd
- Rand Paul (R) — Senate · Kentucky
- Russell Coleman (R) — Attorney General · Kentucky
- Thomas Massie (R) — House · Kentucky 4th

### data/members/la.js (11 people)

- Bill Cassidy (R) — Senate · Louisiana
- Billy Nungesser (R) — Lieutenant Governor · Louisiana
- Clay Higgins (R) — House · Louisiana 3rd
- Cleo Fields (D) — House · Louisiana 6th
- Jeff Landry (R) — Governor · Louisiana
- John Kennedy (R) — Senate · Louisiana
- Julia Letlow (R) — House · Louisiana 5th
- Liz Murrill (R) — Attorney General · Louisiana
- Mike Johnson (R) — House · Louisiana 4th
- Steve Scalise (R) — House · Louisiana 1st
- Troy Carter (D) — House · Louisiana 2nd

### data/members/ma.js (14 people)

- Andrea Campbell (D) — Attorney General · Massachusetts
- Ayanna Pressley (D) — House · Massachusetts 7th
- Edward J. Markey (D) — Senate · Massachusetts
- Elizabeth Warren (D) — Senate · Massachusetts
- Jake Auchincloss (D) — House · Massachusetts 4th
- James McGovern (D) — House · Massachusetts 2nd
- Katherine Clark (D) — House · Massachusetts 5th
- Kim Driscoll (D) — Lieutenant Governor · Massachusetts
- Lori Trahan (D) — House · Massachusetts 3rd
- Maura Healey (D) — Governor · Massachusetts
- Richard Neal (D) — House · Massachusetts 1st
- Seth Moulton (D) — House · Massachusetts 6th
- Stephen Lynch (D) — House · Massachusetts 8th
- William Keating (D) — House · Massachusetts 9th

### data/members/md.js (13 people)

- Andy Harris (R) — House · Maryland 1st
- Angela D. Alsobrooks (D) — Senate · Maryland
- Anthony G. Brown (D) — Attorney General · Maryland
- April McClain Delaney (D) — House · Maryland 6th
- Aruna Miller (D) — Lieutenant Governor · Maryland
- Chris Van Hollen (D) — Senate · Maryland
- Glenn Ivey (D) — House · Maryland 4th
- Jamie Raskin (D) — House · Maryland 8th
- Johnny Olszewski (D) — House · Maryland 2nd
- Kweisi Mfume (D) — House · Maryland 7th
- Sarah Elfreth (D) — House · Maryland 3rd
- Steny Hoyer (D) — House · Maryland 5th
- Wes Moore (D) — Governor · Maryland

### data/members/me.js (7 people)

- Aaron Frey (D) — Attorney General · Maine
- Angus S., Jr. King (I) — Senate · Maine
- Chellie Pingree (D) — House · Maine 1st
- Janet Mills (D) — Governor · Maine
- Jared Golden (D) — House · Maine 2nd
- Mattie Daughtry (D) — Senate President · Maine
- Susan M. Collins (R) — Senate · Maine

### data/members/mi.js (18 people)

- Bill Huizenga (R) — House · Michigan 4th
- Dana Nessel (D) — Attorney General · Michigan
- Debbie Dingell (D) — House · Michigan 6th
- Elissa Slotkin (D) — Senate · Michigan
- Garlin Gilchrist (D) — Lieutenant Governor · Michigan
- Gary C. Peters (D) — Senate · Michigan
- Gretchen Whitmer (D) — Governor · Michigan
- Haley Stevens (D) — House · Michigan 11th
- Hillary Scholten (D) — House · Michigan 3rd
- Jack Bergman (R) — House · Michigan 1st
- John James (R) — House · Michigan 10th
- John Moolenaar (R) — House · Michigan 2nd
- Kristen McDonald Rivet (D) — House · Michigan 8th
- Lisa McClain (R) — House · Michigan 9th
- Rashida Tlaib (D) — House · Michigan 12th
- Shri Thanedar (D) — House · Michigan 13th
- Tim Walberg (R) — House · Michigan 5th
- Tom Barrett (R) — House · Michigan 7th

### data/members/mn.js (13 people)

- Amy Klobuchar (D) — Senate · Minnesota
- Angie Craig (D) — House · Minnesota 2nd
- Betty McCollum (D) — House · Minnesota 4th
- Brad Finstad (R) — House · Minnesota 1st
- Ilhan Omar (D) — House · Minnesota 5th
- Keith Ellison (D) — Attorney General · Minnesota
- Kelly Morrison (D) — House · Minnesota 3rd
- Michelle Fischbach (R) — House · Minnesota 7th
- Peggy Flanagan (D) — Lieutenant Governor · Minnesota
- Pete Stauber (R) — House · Minnesota 8th
- Tim Walz (D) — Governor · Minnesota
- Tina Smith (D) — Senate · Minnesota
- Tom Emmer (R) — House · Minnesota 6th

### data/members/mo.js (13 people)

- Ann Wagner (R) — House · Missouri 2nd
- Catherine Hanaway (R) — Attorney General · Missouri
- David Wasinger (R) — Lieutenant Governor · Missouri
- Emanuel Cleaver (D) — House · Missouri 5th
- Eric Burlison (R) — House · Missouri 7th
- Eric Schmitt (R) — Senate · Missouri
- Jason Smith (R) — House · Missouri 8th
- Josh Hawley (R) — Senate · Missouri
- Mark Alford (R) — House · Missouri 4th
- Mike Kehoe (R) — Governor · Missouri
- Robert Onder (R) — House · Missouri 3rd
- Sam Graves (R) — House · Missouri 6th
- Wesley Bell (D) — House · Missouri 1st

### data/members/mp.js (1 people)

- Kimberlyn King-Hinds (R) — House · Delegate, Northern Mariana Islands

### data/members/ms.js (9 people)

- Bennie Thompson (D) — House · Mississippi 2nd
- Cindy Hyde-Smith (R) — Senate · Mississippi
- Delbert Hosemann (R) — Lieutenant Governor · Mississippi
- Lynn Fitch (R) — Attorney General · Mississippi
- Michael Guest (R) — House · Mississippi 3rd
- Mike Ezell (R) — House · Mississippi 4th
- Roger F. Wicker (R) — Senate · Mississippi
- Tate Reeves (R) — Governor · Mississippi
- Trent Kelly (R) — House · Mississippi 1st

### data/members/mt.js (7 people)

- Austin Knudsen (R) — Attorney General · Montana
- Greg Gianforte (R) — Governor · Montana
- Kristen Juras (R) — Lieutenant Governor · Montana
- Ryan Zinke (R) — House · Montana 1st
- Steve Daines (R) — Senate · Montana
- Tim Sheehy (R) — Senate · Montana
- Troy Downing (R) — House · Montana 2nd

### data/members/nc.js (19 people)

- Addison McDowell (R) — House · North Carolina 6th
- Alma Adams (D) — House · North Carolina 12th
- Brad Knott (R) — House · North Carolina 13th
- Chuck Edwards (R) — House · North Carolina 11th
- David Rouzer (R) — House · North Carolina 7th
- Deborah Ross (D) — House · North Carolina 2nd
- Donald Davis (D) — House · North Carolina 1st
- Gregory Murphy (R) — House · North Carolina 3rd
- Jeff Jackson (D) — Attorney General · North Carolina
- Josh Stein (D) — Governor · North Carolina
- Mark Harris (R) — House · North Carolina 8th
- Pat Harrigan (R) — House · North Carolina 10th
- Rachel Hunt (D) — Lieutenant Governor · North Carolina
- Richard Hudson (R) — House · North Carolina 9th
- Ted Budd (R) — Senate · North Carolina
- Thom Tillis (R) — Senate · North Carolina
- Tim Moore (R) — House · North Carolina 14th
- Valerie Foushee (D) — House · North Carolina 4th
- Virginia Foxx (R) — House · North Carolina 5th

### data/members/nd.js (6 people)

- Drew Wrigley (R) — Attorney General · North Dakota
- John Hoeven (R) — Senate · North Dakota
- Julie Fedorchak (R) — House · North Dakota At-Large
- Kelly Armstrong (R) — Governor · North Dakota
- Kevin Cramer (R) — Senate · North Dakota
- Michelle Strinden (R) — Lieutenant Governor · North Dakota

### data/members/ne.js (8 people)

- Adrian Smith (R) — House · Nebraska 3rd
- Deb Fischer (R) — Senate · Nebraska
- Don Bacon (R) — House · Nebraska 2nd
- Jim Pillen (R) — Governor · Nebraska
- Joe Kelly (R) — Lieutenant Governor · Nebraska
- Mike Flood (R) — House · Nebraska 1st
- Mike Hilgers (R) — Attorney General · Nebraska
- Pete Ricketts (R) — Senate · Nebraska

### data/members/nh.js (7 people)

- Chris Pappas (D) — House · New Hampshire 1st
- Jeanne Shaheen (D) — Senate · New Hampshire
- John Formella (R) — Attorney General · New Hampshire
- Kelly Ayotte (R) — Governor · New Hampshire
- Maggie Goodlander (D) — House · New Hampshire 2nd
- Margaret Wood Hassan (D) — Senate · New Hampshire
- Sharon Carson (R) — Senate President · New Hampshire

### data/members/nj.js (17 people)

- Analilia Mejia (D) — House · New Jersey 11th
- Andy Kim (D) — Senate · New Jersey
- Bonnie Watson Coleman (D) — House · New Jersey 12th
- Christopher Smith (R) — House · New Jersey 4th
- Cory A. Booker (D) — Senate · New Jersey
- Dale Caldwell (D) — Lieutenant Governor · New Jersey
- Donald Norcross (D) — House · New Jersey 1st
- Frank Pallone (D) — House · New Jersey 6th
- Herbert Conaway (D) — House · New Jersey 3rd
- Jefferson Van Drew (R) — House · New Jersey 2nd
- Jennifer Davenport (D) — Attorney General · New Jersey
- Josh Gottheimer (D) — House · New Jersey 5th
- LaMonica McIver (D) — House · New Jersey 10th
- Mikie Sherrill (D) — Governor · New Jersey
- Nellie Pou (D) — House · New Jersey 9th
- Robert Menendez (D) — House · New Jersey 8th
- Thomas Kean (R) — House · New Jersey 7th

### data/members/nm.js (8 people)

- Ben Ray Luján (D) — Senate · New Mexico
- Gabe Vasquez (D) — House · New Mexico 2nd
- Howie Morales (D) — Lieutenant Governor · New Mexico
- Martin Heinrich (D) — Senate · New Mexico
- Melanie Stansbury (D) — House · New Mexico 1st
- Michelle Lujan Grisham (D) — Governor · New Mexico
- Raúl Torrez (D) — Attorney General · New Mexico
- Teresa Leger Fernandez (D) — House · New Mexico 3rd

### data/members/nv.js (9 people)

- Aaron D. Ford (D) — Attorney General · Nevada
- Catherine Cortez Masto (D) — Senate · Nevada
- Dina Titus (D) — House · Nevada 1st
- Jacky Rosen (D) — Senate · Nevada
- Joe Lombardo (R) — Governor · Nevada
- Mark Amodei (R) — House · Nevada 2nd
- Stavros Anthony (R) — Lieutenant Governor · Nevada
- Steven Horsford (D) — House · Nevada 4th
- Susie Lee (D) — House · Nevada 3rd

### data/members/ny-1.js (16 people)

- Adriano Espaillat (D) — House · New York 13th
- Alexandria Ocasio-Cortez (D) — House · New York 14th
- Andrew Garbarino (R) — House · New York 2nd
- Antonio Delgado (D) — Lieutenant Governor · New York
- Charles E. Schumer (D) — Senate · New York
- Claudia Tenney (R) — House · New York 24th
- Daniel Goldman (D) — House · New York 10th
- Elise Stefanik (R) — House · New York 21th
- George Latimer (D) — House · New York 16th
- Grace Meng (D) — House · New York 6th
- Gregory Meeks (D) — House · New York 5th
- Hakeem Jeffries (D) — House · New York 8th
- Jerrold Nadler (D) — House · New York 12th
- John Mannion (D) — House · New York 22th
- Joseph Morelle (D) — House · New York 25th
- Josh Riley (D) — House · New York 19th

### data/members/ny-2.js (16 people)

- Kathy Hochul (D) — Governor · New York
- Kirsten E. Gillibrand (D) — Senate · New York
- Laura Gillen (D) — House · New York 4th
- Letitia James (D) — Attorney General · New York
- Michael Lawler (R) — House · New York 17th
- Nicholas Langworthy (R) — House · New York 23th
- Nick LaLota (R) — House · New York 1st
- Nicole Malliotakis (R) — House · New York 11th
- Nydia Velazquez (D) — House · New York 7th
- Patrick Ryan (D) — House · New York 18th
- Paul Tonko (D) — House · New York 20th
- Ritchie Torres (D) — House · New York 15th
- Thomas DiNapoli (D) — Comptroller · New York
- Thomas R. Suozzi (D) — House · New York 3rd
- Timothy Kennedy (D) — House · New York 26th
- Yvette Clarke (D) — House · New York 9th

### data/members/oh.js (20 people)

- Andy Wilson (R) — Attorney General · Ohio
- Bernie Moreno (R) — Senate · Ohio
- David Joyce (R) — House · Ohio 14th
- David Taylor (R) — House · Ohio 2nd
- Emilia Sykes (D) — House · Ohio 13th
- Greg Landsman (D) — House · Ohio 1st
- Jim Jordan (R) — House · Ohio 4th
- Jim Tressel (R) — Lieutenant Governor · Ohio
- Jon Husted (R) — Senate · Ohio
- Joyce Beatty (D) — House · Ohio 3rd
- Marcy Kaptur (D) — House · Ohio 9th
- Max Miller (R) — House · Ohio 7th
- Michael A. Rulli (R) — House · Ohio 6th
- Michael Turner (R) — House · Ohio 10th
- Mike Carey (R) — House · Ohio 15th
- Mike DeWine (R) — Governor · Ohio
- Robert Latta (R) — House · Ohio 5th
- Shontel Brown (D) — House · Ohio 11th
- Troy Balderson (R) — House · Ohio 12th
- Warren Davidson (R) — House · Ohio 8th

### data/members/ok.js (10 people)

- Alan Armstrong (R) — Senate · Oklahoma
- Frank Lucas (R) — House · Oklahoma 3rd
- Gentner Drummond (R) — Attorney General · Oklahoma
- James Lankford (R) — Senate · Oklahoma
- Josh Brecheen (R) — House · Oklahoma 2nd
- Kevin Hern (R) — House · Oklahoma 1st
- Kevin Stitt (R) — Governor · Oklahoma
- Matt Pinnell (R) — Lieutenant Governor · Oklahoma
- Stephanie Bice (R) — House · Oklahoma 5th
- Tom Cole (R) — House · Oklahoma 4th

### data/members/or.js (13 people)

- Andrea Salinas (D) — House · Oregon 6th
- Christina Stephenson (NP) — Commissioner of Labor and Industries · Oregon
- Cliff Bentz (R) — House · Oregon 2nd
- Dan Rayfield (D) — Attorney General · Oregon
- Elizabeth Steiner (D) — Treasurer · Oregon
- Janelle Bynum (D) — House · Oregon 5th
- Jeff Merkley (D) — Senate · Oregon
- Maxine Dexter (D) — House · Oregon 3rd
- Ron Wyden (D) — Senate · Oregon
- Suzanne Bonamici (D) — House · Oregon 1st
- Tina Kotek (D) — Governor · Oregon
- Tobias Read (D) — Secretary of State · Oregon
- Val Hoyle (D) — House · Oregon 4th

### data/members/pa-1.js (12 people)

- Austin Davis (D) — Lieutenant Governor · Pennsylvania
- Brendan Boyle (D) — House · Pennsylvania 2nd
- Brian Fitzpatrick (R) — House · Pennsylvania 1st
- Chrissy Houlahan (D) — House · Pennsylvania 6th
- Christopher Deluzio (D) — House · Pennsylvania 17th
- Daniel Meuser (R) — House · Pennsylvania 9th
- Dave Sunday (R) — Attorney General · Pennsylvania
- David McCormick (R) — Senate · Pennsylvania
- Dwight Evans (D) — House · Pennsylvania 3rd
- Glenn Thompson (R) — House · Pennsylvania 15th
- Guy Reschenthaler (R) — House · Pennsylvania 14th
- John Fetterman (D) — Senate · Pennsylvania

### data/members/pa-2.js (12 people)

- John Joyce (R) — House · Pennsylvania 13th
- Josh Shapiro (D) — Governor · Pennsylvania
- Lloyd Smucker (R) — House · Pennsylvania 11th
- Madeleine Dean (D) — House · Pennsylvania 4th
- Mary Gay Scanlon (D) — House · Pennsylvania 5th
- Mike Kelly (R) — House · Pennsylvania 16th
- Robert Bresnahan (R) — House · Pennsylvania 8th
- Ryan Mackenzie (R) — House · Pennsylvania 7th
- Scott Perry (R) — House · Pennsylvania 10th
- Stacy Garrity (R) — Treasurer · Pennsylvania
- Summer Lee (D) — House · Pennsylvania 12th
- Timothy DeFoor (R) — Auditor General · Pennsylvania

### data/members/pr.js (1 people)

- Pablo José Hernández Rivera (D) — House · Resident Commissioner, Puerto Rico

### data/members/ri.js (7 people)

- Dan McKee (D) — Governor · Rhode Island
- Gabe Amo (D) — House · Rhode Island 1st
- Jack Reed (D) — Senate · Rhode Island
- Peter F. Neronha (D) — Attorney General · Rhode Island
- Sabina Matos (D) — Lieutenant Governor · Rhode Island
- Seth Magaziner (D) — House · Rhode Island 2nd
- Sheldon Whitehouse (D) — Senate · Rhode Island

### data/members/sc.js (12 people)

- Alan Wilson (R) — Attorney General · South Carolina
- Darline Graham (R) — Senate · South Carolina
- Henry McMaster (R) — Governor · South Carolina
- James Clyburn (D) — House · South Carolina 6th
- Joe Wilson (R) — House · South Carolina 2nd
- Nancy Mace (R) — House · South Carolina 1st
- Pamela Evette (R) — Lieutenant Governor · South Carolina
- Ralph Norman (R) — House · South Carolina 5th
- Russell Fry (R) — House · South Carolina 7th
- Sheri Biggs (R) — House · South Carolina 3rd
- Tim Scott (R) — Senate · South Carolina
- William Timmons (R) — House · South Carolina 4th

### data/members/sd.js (6 people)

- Dusty Johnson (R) — House · South Dakota At-Large
- John Thune (R) — Senate · South Dakota
- Larry Rhoden (R) — Governor · South Dakota
- Marty Jackley (R) — Attorney General · South Dakota
- Mike Rounds (R) — Senate · South Dakota
- Tony Venhuizen (R) — Lieutenant Governor · South Dakota

### data/members/tn.js (14 people)

- Andrew Ogles (R) — House · Tennessee 5th
- Bill Hagerty (R) — Senate · Tennessee
- Bill Lee (R) — Governor · Tennessee
- Charles Fleischmann (R) — House · Tennessee 3rd
- David Kustoff (R) — House · Tennessee 8th
- Diana Harshbarger (R) — House · Tennessee 1st
- John Rose (R) — House · Tennessee 6th
- Jonathan Skrmetti (R) — Attorney General · Tennessee
- Marsha Blackburn (R) — Senate · Tennessee
- Matt Van Epps (R) — House · Tennessee 7th
- Randy McNally (R) — Lieutenant Governor · Tennessee
- Scott DesJarlais (R) — House · Tennessee 4th
- Steve Cohen (D) — House · Tennessee 9th
- Tim Burchett (R) — House · Tennessee 2nd

### data/members/tx-1.js (15 people)

- Al Green (D) — House · Texas 9th
- August Pfluger (R) — House · Texas 11th
- Beth Van Duyne (R) — House · Texas 24th
- Brandon Gill (R) — House · Texas 26th
- Brian Babin (R) — House · Texas 36th
- Chip Roy (R) — House · Texas 21th
- Christian Menefee (D) — House · Texas 18th
- Craig Goldman (R) — House · Texas 12th
- Dan Crenshaw (R) — House · Texas 2nd
- Dan Patrick (R) — Lieutenant Governor · Texas
- Dawn Buckingham (R) — Land Commissioner · Texas
- Greg Abbott (R) — Governor · Texas
- Greg Casar (D) — House · Texas 35th
- Henry Cuellar (D) — House · Texas 28th
- Jake Ellzey (R) — House · Texas 6th

### data/members/tx-2.js (15 people)

- Jasmine Crockett (D) — House · Texas 30th
- Joaquin Castro (D) — House · Texas 20th
- Jodey Arrington (R) — House · Texas 19th
- John Carter (R) — House · Texas 31th
- John Cornyn (R) — Senate · Texas
- Julie Johnson (D) — House · Texas 32th
- Keith Self (R) — House · Texas 3rd
- Kelly Hancock (R) — Comptroller · Texas
- Ken Paxton (R) — Attorney General · Texas
- Lance Gooden (R) — House · Texas 5th
- Lizzie Fletcher (D) — House · Texas 7th
- Lloyd Doggett (D) — House · Texas 37th
- Marc Veasey (D) — House · Texas 33th
- Michael Cloud (R) — House · Texas 27th
- Michael McCaul (R) — House · Texas 10th

### data/members/tx-3.js (15 people)

- Monica De La Cruz (R) — House · Texas 15th
- Morgan Luttrell (R) — House · Texas 8th
- Nathaniel Moran (R) — House · Texas 1st
- Pat Fallon (R) — House · Texas 4th
- Pete Sessions (R) — House · Texas 17th
- Randy Weber (R) — House · Texas 14th
- Roger Williams (R) — House · Texas 25th
- Ronny Jackson (R) — House · Texas 13th
- Sid Miller (R) — Agriculture Commissioner · Texas
- Sylvia Garcia (D) — House · Texas 29th
- Ted Cruz (R) — Senate · Texas
- Troy Nehls (R) — House · Texas 22th
- Veronica Escobar (D) — House · Texas 16th
- Vicente Gonzalez (D) — House · Texas 34th
- Wesley Hunt (R) — House · Texas 38th

### data/members/ut.js (9 people)

- Blake Moore (R) — House · Utah 1st
- Burgess Owens (R) — House · Utah 4th
- Celeste Maloy (R) — House · Utah 2nd
- Deidre Henderson (R) — Lieutenant Governor · Utah
- Derek Brown (R) — Attorney General · Utah
- John R. Curtis (R) — Senate · Utah
- Mike Kennedy (R) — House · Utah 3rd
- Mike Lee (R) — Senate · Utah
- Spencer Cox (R) — Governor · Utah

### data/members/va.js (16 people)

- Abigail Spanberger (D) — Governor · Virginia
- Ben Cline (R) — House · Virginia 6th
- Donald Beyer (D) — House · Virginia 8th
- Eugene Vindman (D) — House · Virginia 7th
- Ghazala Hashmi (D) — Lieutenant Governor · Virginia
- H. Griffith (R) — House · Virginia 9th
- James Walkinshaw (D) — House · Virginia 11th
- Jay Jones (D) — Attorney General · Virginia
- Jennifer Kiggans (R) — House · Virginia 2nd
- Jennifer McClellan (D) — House · Virginia 4th
- John McGuire (R) — House · Virginia 5th
- Mark R. Warner (D) — Senate · Virginia
- Robert Scott (D) — House · Virginia 3rd
- Robert Wittman (R) — House · Virginia 1st
- Suhas Subramanyam (D) — House · Virginia 10th
- Tim Kaine (D) — Senate · Virginia

### data/members/vi.js (1 people)

- Stacey Plaskett (D) — House · Delegate, U.S. Virgin Islands

### data/members/vt.js (6 people)

- Becca Balint (D) — House · Vermont At-Large
- Bernard Sanders (I) — Senate · Vermont
- Charity R. Clark (D) — Attorney General · Vermont
- John Rodgers (R) — Lieutenant Governor · Vermont
- Peter Welch (D) — Senate · Vermont
- Phil Scott (R) — Governor · Vermont

### data/members/wa.js (15 people)

- Adam Smith (D) — House · Washington 9th
- Bob Ferguson (D) — Governor · Washington
- Dan Newhouse (R) — House · Washington 4th
- Denny Heck (D) — Lieutenant Governor · Washington
- Emily Randall (D) — House · Washington 6th
- Kim Schrier (D) — House · Washington 8th
- Maria Cantwell (D) — Senate · Washington
- Marie Perez (D) — House · Washington 3rd
- Marilyn Strickland (D) — House · Washington 10th
- Michael Baumgartner (R) — House · Washington 5th
- Nick Brown (D) — Attorney General · Washington
- Patty Murray (D) — Senate · Washington
- Pramila Jayapal (D) — House · Washington 7th
- Rick Larsen (D) — House · Washington 2nd
- Suzan DelBene (D) — House · Washington 1st

### data/members/wi.js (13 people)

- Bryan Steil (R) — House · Wisconsin 1st
- Derrick Van Orden (R) — House · Wisconsin 3rd
- Glenn Grothman (R) — House · Wisconsin 6th
- Gwen Moore (D) — House · Wisconsin 4th
- Josh Kaul (D) — Attorney General · Wisconsin
- Mark Pocan (D) — House · Wisconsin 2nd
- Ron Johnson (R) — Senate · Wisconsin
- Sara Rodriguez (D) — Lieutenant Governor · Wisconsin
- Scott Fitzgerald (R) — House · Wisconsin 5th
- Tammy Baldwin (D) — Senate · Wisconsin
- Thomas Tiffany (R) — House · Wisconsin 7th
- Tony Evers (D) — Governor · Wisconsin
- Tony Wied (R) — House · Wisconsin 8th

### data/members/wv.js (7 people)

- Carol Miller (R) — House · West Virginia 1st
- James C. Justice (R) — Senate · West Virginia
- John B. McCuskey (R) — Attorney General · West Virginia
- Patrick Morrisey (R) — Governor · West Virginia
- Randy Smith (R) — Lieutenant Governor · West Virginia
- Riley Moore (R) — House · West Virginia 2nd
- Shelley Moore Capito (R) — Senate · West Virginia

### data/members/wy.js (6 people)

- Chuck Gray (R) — Secretary of State · Wyoming
- Cynthia M. Lummis (R) — Senate · Wyoming
- Harriet Hageman (R) — House · Wyoming At-Large
- John Barrasso (R) — Senate · Wyoming
- Keith Kautz (R) — Attorney General · Wyoming
- Mark Gordon (R) — Governor · Wyoming

## Past administrations (closed historical record)

- `data/past-administrations/biden-46.js` — Biden Administration (17 people + their promises)
- `data/past-administrations/trump-45.js` — Trump (First Term) (17 people + their promises)

## Reference data (not split by state)

These aren't "people" records in the primary sense, and several of them (a person-link group, a
prior career stint) can span a current role, a past administration, and a prior elected office all
at once — there's no single state each entry cleanly belongs to. Kept as a few compact files
instead of forcing a per-state split:

- `data/archive.js` — Archive (3 entries)
- `data/person-links.js` — Person links (502 entries)
- `data/confirmed-no-prior-role.js` — Confirmed no prior role (204 entries)
- `data/prior-roles/part-1.js` — Prior roles (part 1) (259 entries)
- `data/prior-roles/part-2.js` — Prior roles (part 2) (258 entries)
- `data/prior-roles/part-3.js` — Prior roles (part 3) (258 entries)

- `archive.js` — people who don't currently hold a tracked office (former officeholders, losing
  candidates, historical figures) and their promises. Only 3 people so far, so it's one file.
- `person-links.js` — groups of IDs that are the same real person under different roles (e.g. a
  Cabinet secretary and their prior Senate seat), so their profile page merges into one.
- `confirmed-no-prior-role.js` — a flat research checklist: IDs specifically verified to have NO
  prior elected office, so nobody re-researches them from scratch later. Not read by the app itself.
- `prior-roles/part-1.js` … `part-3.js` — one row per prior elected-office stint, linked back to a
  current official via `person-links.js`.

## Totals (must match the app's own count)

- 736 current officials across 67 files (matches the "736 officials tracked" figure in the site footer)
- 34 people across 2 past-administration files
- 3 people in the archive
