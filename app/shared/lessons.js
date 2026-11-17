/* Generated once from the v5 prototype by tools/split_prototype.py; edit here from now on. */
/* SERVER ONLY for students: holds the answer keys. Students receive a sanitised copy. */

/* ================================================================
   LESSON 1 — Why post-quantum, and what a KEM actually is
   ================================================================ */
LESSONS.L1 = {
  id:'L1', n:1, title:'Why post-quantum, and what a KEM actually is', short:'Why PQC · the KEM model',
  concepts:['A-01','A-02','A-03'], minutes:80,
  gate:null,
  hint:'Which of the six steps is involved here? Is the question about what crosses the wire, what each side computes, or what happens on failure?',
  bans:[{terms:['implicit rejection','fujisaki'], until:['A3','C1']}, {terms:['do not interoperate','not wire-compatible'], until:['C2']}],
  instr:{
    misconceptions:[
      '"Post-quantum crypto needs a quantum computer." → "Your laptop runs ML-KEM in Lesson 2. What does post-quantum protect against, then?"',
      '"A KEM encrypts my message." → "Point to where Alice types the message in the six steps."',
      '"If Decaps doesn\'t throw, the key is right." → animate a flipped byte producing a different K.',
      '"Kyber and ML-KEM are the same algorithm." → B2 and C2.',
    ],
  },
  hook:{
    title:'"I always assumed ML-KEM is the same as Kyber"',
    story:[
      'In March 2025 a developer tested two well-known libraries against each other: libOQS, written in C, and Bouncy Castle, written in Java. Both implement ML-KEM, the new NIST standard. One side generated a key pair, the other encapsulated, and they compared the shared secret.',
      'The secrets did not match. Then the developer tried Bouncy Castle\'s older <i>Kyber</i> against libOQS\'s ML-KEM, and the secrets <i>did</i> match.',
    ],
    prompt:'Write down the most likely cause, in one or two sentences.',
    reveal:{
      intro:'Three explanations were offered on the issue thread, in this order:',
      items:[
        'A maintainer: Kyber and ML-KEM are different algorithms; one descends from the other.',
        'A second guess: one library implemented an older draft.',
        'The real cause, found by the developer: Bouncy Castle\'s Java API passes the raw 32-byte secret through a key derivation function by default. libOQS returns the raw secret. The two sides were comparing different things. With the KDF switched off, the two ML-KEM implementations agreed.',
      ],
      close:'Three reasonable explanations, one symptom. By the end of this lesson you will know which facts tell them apart. Keep your guess: you will grade it yourself in the exit ticket.',
      src:'<a href="https://github.com/bcgit/bc-java/issues/2037" target="_blank" rel="noopener">bc-java #2037</a>',
    },
    instr:'Do not explain the KDF yet. Students should feel the gap first; Part 3 fills it. The hook previews all three ideas of the lesson: the KEM output, the KDF step, and the Kyber/ML-KEM distinction.',
  },
  parts:[
    { id:'P1', title:'Why the old key exchange expires', concepts:['A-01'],
      bigIdea:'Today\'s key exchange is safe only because certain maths problems are slow to solve. A large quantum computer makes those specific problems fast, but not every problem. That is why we replace RSA and ECDH but keep AES.',
      blocks:[
        {h:'What keeps RSA and ECDH safe today'},
        {p:'Public-key cryptography rests on a <b>one-way trapdoor function</b>: easy to compute in one direction, hard to reverse without one missing piece of information.'},
        {table:{head:['Problem','Easy direction','Hard direction','Used by'], rows:[
          ['Factoring','multiply two large primes, n = p·q','recover p and q from n','RSA'],
          ['Discrete logarithm','compute a = bᵉ mod p','recover e from a, b and p','Diffie–Hellman, ECDH (on curves)'],
        ]}, src:'Definitions after Vargas Martin, <i>Practical Cryptography</i> (2026), §3.6.'},
        {h:'Shor\'s algorithm: the problems become easy'},
        {p:'Shor\'s algorithm (1994) finds the hidden <i>period</i> of a function. Factoring and discrete logarithms can both be rewritten as period finding. On a large fault-tolerant quantum computer Shor solves them in polynomial time, so making keys longer barely helps.'},
        {table:{head:['','Classical attacker','Quantum attacker with Shor'], rows:[
          ['Effect of doubling the key size','Attack becomes enormously harder','Attack becomes only moderately harder'],
          ['Fix it with bigger keys?','Yes','No: the algorithm must change'],
        ]}},
        {h:'Grover\'s algorithm: search gets a square root faster'},
        {p:'Grover speeds up unstructured search, such as trying every AES key, from about 2ⁿ guesses to about 2ⁿᐟ² quantum steps.'},
        {table:{head:['Symmetric key','Classical brute force','Grover (idealised)','Verdict'], rows:[
          ['AES-128','~2¹²⁸','~2⁶⁴','Weakened on paper; Grover steps are expensive and parallelise poorly'],
          ['AES-256','~2²⁵⁶','~2¹²⁸','Comfortably safe'],
        ]}},
        {p:'The response to Grover is cheap: use 256-bit symmetric keys. The response to Shor is to replace the public-key algorithm. That is why this course uses AES-256 for data and ML-KEM for key exchange.'},
        {h:'Harvest now, decrypt later'},
        {p:'An attacker does not need a quantum computer today. They can record encrypted traffic now and decrypt it once a capable machine exists. Mosca\'s rule of thumb: if <i>x</i> is how long the data must stay secret, <i>y</i> how long migration takes and <i>z</i> the years until a cryptographically relevant quantum computer, you are already late whenever <b>x + y &gt; z</b>.'},
        {callout:{title:'The policy clock', html:'NIST IR 8547, final since October 2026, sets one schedule for every quantum-vulnerable public-key algorithm (RSA, ECDSA, EdDSA, DH and ECDH, at every approved key size): <b>deprecated after 2030, disallowed after 2035</b>. "Deprecated" means still allowed if the data owner accepts the risk; "disallowed" means no longer allowed for that purpose. The same report names ML-KEM-768 as the default parameter set. <span class="src">(<a href="https://nvlpubs.nist.gov/nistpubs/ir/2026/NIST.IR.8547.pdf" target="_blank" rel="noopener">NIST IR 8547</a>, Tables 2 and 4)</span>'}},
      ],
      checks:[
        {q:'Which of these does Shor\'s algorithm threaten?', opts:['RSA and ECDH only','AES-256 and SHA-256','RSA, ECDH, AES-256 and SHA-256','None of them until 2035'], a:0,
         why:'Shor breaks factoring and discrete logarithms. AES and SHA are only touched by Grover\'s square-root speed-up.'},
        {q:'Why can\'t we simply switch to RSA-8192?', opts:['Shor\'s cost grows only gently with key size','RSA-8192 is not standardised','RSA-8192 keys are too slow to generate','Grover would break it'], a:0,
         why:'The whole problem class has fallen; bigger keys buy very little against Shor.'},
        {q:'Hospital records must stay private for 25 years. Quantum computers might be 15 years away. Is RSA key exchange a problem today?', opts:['Yes: 25 > 15, and recorded traffic can be decrypted later','No: records are safe until the computer exists','Only if the hospital uses AES-128','Only after NIST disallows RSA'], a:0,
         why:'Mosca: x + y > z. The recorded traffic is already exposed.'},
      ],
      reteach:'Think of locks rather than keys. Shor does not pick one lock faster; it makes one whole kind of lock (factoring and discrete logs) easy at any size. Grover only lets an attacker try keys faster, which longer keys cancel out. And recorded traffic stays recorded, so the clock starts now, not when the machine arrives.',
      instr:'Ask the "estimate first" question before revealing each table. Wrong answer on check 1 → re-show the Shor table; on check 3 → work the Mosca inequality with the hospital numbers.',
    },
    { id:'P2', title:'What ML-KEM rests on instead', concepts:['A-01'],
      bigIdea:'ML-KEM\'s security rests on solving noisy linear equations, the Learning With Errors problem. It has no hidden period for Shor\'s algorithm to find.',
      blocks:[
        {p:'Exact equations are easy. Work modulo 17 with a public matrix A and a secret s = (2, 3).'},
        {table:{head:['Equation','Row of A','A·s mod 17 = b','Noise e','Published b′'], rows:[
          ['1','(3, 5)','4','+1','5'],
          ['2','(7, 2)','3','−1','2'],
          ['3','(4, 6)','9','+1','10'],
        ]}, num:true},
        {p:'Given A and b, ordinary elimination recovers s in a minute. Given A and the noisy b′, no s satisfies all three equations exactly, and elimination fails. Finding the s that "almost" fits is the <b>Learning With Errors</b> problem. At ML-KEM sizes (polynomials with 256 coefficients, modulus 3329) no efficient algorithm is known, classical or quantum.'},
        {annot:{q:'Try it: does s = (2, 3) satisfy noisy equation 1?', a:'3·2 + 5·3 = 21 ≡ 4 (mod 17), but the published value is 5. The noise is exactly what stops you.'}},
        {callout:{title:'The smallness trap', html:'Noise too small and lattice attacks succeed. Noise too large and the receiver cannot decrypt. FIPS 203 picks noise in a narrow band, which is why decryption failures are possible but astronomically rare (Lesson 3).'}},
        {src:'Toy example built on Vargas Martin, <i>Practical Cryptography</i> (2026), Definitions 8.4–8.6.'},
      ],
      checks:[
        {q:'Shor\'s algorithm finds hidden periods. Why is that not enough against ML-KEM?', opts:['Learning With Errors has no known periodic structure for Shor to exploit','ML-KEM keys are too long for any quantum computer','ML-KEM encrypts everything twice','Shor only works on AES'], a:0,
         why:'Shor needs a period to find. Noisy lattice problems do not offer one.'},
        {q:'What does the noise e do in Learning With Errors?', opts:['It makes the equations inconsistent, so elimination fails','It encrypts the message','It speeds up key generation','It is removed before the values are published'], a:0,
         why:'Without e, algebra reads s straight off; with e, you are left searching.'},
      ],
      reteach:'Picture the equations as a combination lock. Without noise, algebra reads the combination straight off. Add a small random error to every equation and the algebra stops working; you are left searching, and no known algorithm, classical or quantum, searches efficiently at ML-KEM\'s sizes.',
      instr:'New segment from the book review (3 min). Embedded check doubles as the "what replaces factoring" closure students otherwise miss.',
    },
    { id:'P3', title:'The KEM model in depth', concepts:['A-02'],
      bigIdea:'A KEM lets two parties end up holding the same random secret. Only one of them owns a key pair, and one message travels each way. The sender does not choose the secret; the algorithm generates it.',
      blocks:[
        {h:'The three operations'},
        {table:{head:['Operation','Who runs it','Input','Output','Can it fail loudly?'], rows:[
          ['<b>KeyGen</b>','Receiver (Bob)','randomness','encapsulation key <i>ek</i> (public) and decapsulation key <i>dk</i> (private)','only on internal error'],
          ['<b>Encaps</b>','Sender (Alice)','<i>ek</i>, randomness','shared secret <i>K</i> (32 bytes) <b>and</b> ciphertext <i>c</i>','yes, if <i>ek</i> is malformed'],
          ['<b>Decaps</b>','Receiver (Bob)','<i>dk</i>, <i>c</i>','shared secret <i>K</i>','only if <i>c</i> has the wrong length'],
        ]}},
        {h:'Six steps, one at a time'},
        {board:'kem'},
        {h:'Why the KDF step exists'},
        {ol:[
          '<b>One secret, several keys.</b> A session needs separate keys per direction and purpose; a KDF such as HKDF derives them from one <i>K</i>.',
          '<b>Binding context.</b> The KDF mixes in labels and transcript data, so a key derived for one purpose cannot be replayed in another.',
          '<b>Both sides must use the same recipe.</b> If Alice derives HKDF(<i>K</i>, "app v1") and Bob uses <i>K</i> raw, they hold different AES keys and every message fails, while the KEM itself worked perfectly.',
        ]},
        {callout:{title:'Back to the hook', html:'Reason 3 <i>is</i> bc-java #2037. Bouncy Castle\'s Java API applies a KDF by default; libOQS returns raw <i>K</i>. Printing both raw secrets side by side would have settled it in a minute.'}},
        {h:'Implicit rejection: the failure that makes no noise'},
        {p:'If <i>c</i> is damaged or forged on the wire, Decaps does <b>not</b> raise an error. It re-encrypts, compares, and on a mismatch returns a pseudorandom value derived from a secret inside <i>dk</i>. Bob ends up with a normal-looking <i>K</i> that is simply wrong.'},
        {p:'Why design it this way? If Decaps announced "bad ciphertext", an attacker could send many tampered ciphertexts and learn about <i>dk</i> from which ones were rejected. Returning a plausible wrong answer removes that signal. The construction is the Fujisaki–Okamoto transform built into FIPS 203. Mismatches surface later, when an AEAD tag fails or a key-confirmation message does not match.'},
        {h:'Three contrasts'},
        {table:{head:['','Public-key encryption (RSA-OAEP)','Diffie–Hellman (ECDH)','KEM (ML-KEM)'], rows:[
          ['Who picks the secret?','Sender chooses the message','Both contribute; result emerges','Generated during Encaps'],
          ['Key pairs needed','Receiver only','Both parties','Receiver only'],
          ['Messages','One (ciphertext)','One each way','ek one way, c the other'],
          ['Tampered input','Usually an explicit error','Different value, no error','Different value, no error'],
        ]}},
        {callout:{title:'Terminology used in this course', html:'FIPS 203 says <b>encapsulation key</b> (<i>ek</i>, the public key) and <b>decapsulation key</b> (<i>dk</i>, the private key). Alice encapsulates; Bob decapsulates. Some books swap the names of the two people; the roles stay the same.'}},
      ],
      checks:[
        {q:'Name the two values that cross the network, in order.', opts:['ek, then c','K, then c','dk, then ek','c, then K'], a:0,
         why:'Bob sends ek; Alice sends back c. K never crosses the wire.'},
        {q:'Alice wants to send Bob one specific AES key she already has. Can ML-KEM do that directly?', opts:['No: Encaps generates K; she would derive or wrap a key from it','Yes: she passes her key to Encaps','Yes: she sends it as c','Only with ML-KEM-1024'], a:0,
         why:'Encaps takes only ek and randomness. The sender cannot choose K.'},
        {q:'Bob\'s Decaps ran without an error. Can he be sure he shares K with Alice?', opts:['No, because of implicit rejection','Yes, Decaps would have thrown','Yes, if c was 1088 bytes','Only if he used HKDF'], a:0,
         why:'A well-sized but wrong c yields a different K silently.'},
      ],
      reteach:'Think of a machine only Bob can open. Alice feeds it Bob\'s public key (ek) and it hands her two things: a sealed capsule (c) and a copy of what is inside (K). She sends Bob the capsule. Bob\'s private key (dk) opens it. If someone swaps the capsule on the way, Bob still gets something out, just not what Alice has, and nothing beeps.',
      instr:'Build the board one click at a time; ask the pause question before revealing each next step. Close the hook loop at the KDF callout: "Now which of the three explanations was right?"',
    },
    { id:'P4', title:'FIPS 203 and its ecosystem', concepts:['A-03'],
      bigIdea:'"ML-KEM" is a precise, versioned standard. Similar names (Kyber, ML-KEM-512, the BCPQC provider) refer to different things, and code that mixes them can compile, run and still be wrong.',
      blocks:[
        {table:{head:['Parameter set','NIST category','Roughly as hard to break as','Ciphertext','Typical use'], rows:[
          ['ML-KEM-512','1','AES-128 key search','768 B','constrained devices, by deliberate choice'],
          ['ML-KEM-768','3','AES-192 key search','1088 B','general default (this course)'],
          ['ML-KEM-1024','5','AES-256 key search','1568 B','long-lived, high-sensitivity data'],
        ]}, src:'FIPS 203 sizes as restated in <a href="https://datatracker.ietf.org/doc/draft-ietf-tls-mlkem/09/" target="_blank" rel="noopener">draft-ietf-tls-mlkem</a>.'},
        {p:'Each set produces a different, fixed ciphertext length. Hold on to that: in Lesson 3 it lets you prove which set your code really used.'},
        {h:'Kyber is the ancestor, not a synonym'},
        {p:'CRYSTALS-Kyber was the competition submission NIST selected. Details changed on the way to FIPS 203, including how the final shared secret is computed, so <b>round-3 Kyber and ML-KEM do not interoperate on the wire.</b> In March 2025, on an issue filed against Bouncy Castle 1.79/1.80, a maintainer wrote that "Kyber in the BCPQC provider is simply an alias for ML-KEM". The same word can mean different algorithms in different libraries and versions, so the safe habit is to check what code actually runs.'},
        {h:'Where ML-KEM lives in Java'},
        {table:{head:['Component','What it provides','Relevance to the lab'], rows:[
          ['JDK 21 up to 21.0.12','The <code>javax.crypto.KEM</code> API, but no built-in ML-KEM','Only a provider such as Bouncy Castle can supply the algorithm'],
          ['JDK 24 and later, and JDK 21.0.13 (October 2026) onward','A built-in ML-KEM in the SunJCE provider, defaulting to ML-KEM-768 (JEP 496, backported to 21.0.13)','The lab runs 21.0.13: an unpinned <code>getInstance("ML-KEM")</code> gets the JDK\'s ML-KEM, not BC (Lesson 4)'],
          ['Bouncy Castle <b>BC</b> provider','Standardised algorithms under NIST names; ML-KEM since 1.79','The provider this course uses'],
          ['Bouncy Castle <b>BCPQC</b> provider','Experimental and pre-standard algorithms','Source of Lesson 4\'s label-vs-substance failure'],
        ]}},
      ],
      checks:[
        {q:'Which parameter set does this course use, and what is its NIST category?', opts:['ML-KEM-768, category 3','ML-KEM-512, category 1','ML-KEM-1024, category 5','ML-KEM-768, category 1'], a:0, why:'768 is the general default, category 3.'},
        {q:'A server running round-3 Kyber talks to a client running ML-KEM-768. Do they agree on a key?', opts:['No','Yes, they are the same algorithm','Yes, if both use Bouncy Castle','Only with ML-KEM-1024'], a:0, why:'Round-3 Kyber and ML-KEM differ in detail and do not interoperate.'},
        {q:'The lab runs JDK 21.0.13, which has its own ML-KEM. Which implementation does course code use, and why?', opts:['Bouncy Castle\'s, because every getInstance names "BC"','The JDK\'s SunJCE, because it is built in','Whichever is faster','libOQS, through the KEM class'], a:0, why:'Both exist on the lab JDK; naming "BC" is what decides.'},
      ],
      reteach:'A name is a label on a box; the standard is what is inside. FIPS 203 defines the inside exactly. "Kyber", "ML-KEM" and provider names are labels that different libraries and versions attach to boxes whose insides may differ.',
      instr:'Do not memorise the BC/BCPQC history here; it is a preview of Lesson 4.',
    },
  ],
  exercises:[
    { id:'A1', type:'A', step:'practice', title:'The missing KDF step', cells:[['A-02','L2',1]], kind:'explain',
      prompt:'Alice and Bob both hold the same 32 bytes after step 5. Bob\'s program uses those 32 bytes directly as an AES-256 key. Alice\'s program first passes them through HKDF-SHA256 with the label "chat v1". What happens when Alice sends Bob an encrypted message, and why?',
      criteria:[
        {label:'Says the keys differ, so decryption fails', any:['differ','different','not the same','fail','cannot decrypt','can.t decrypt','mismatch','garbage','tag']},
        {label:'Traces it to only one side applying the KDF', any:['kdf','hkdf','deriv','one side','only alice','raw']},
      ],
      model:'Bob cannot decrypt it. The KEM worked and both hold the same K, but Alice\'s AES key is HKDF(K, "chat v1") while Bob\'s is K itself, so the keys differ and decryption, or the AEAD tag check, fails.',
      soc:'Write down Alice\'s AES key and Bob\'s AES key as formulas. Are they the same bytes?' },
    { id:'A2', type:'A', step:'practice', title:'Does quantum break AES too?', cells:[['A-01','L2',1]], kind:'explain',
      prompt:'A colleague says: "Quantum computers break AES too, so ML-KEM won\'t help unless we also replace AES." Which half of that sentence is right, by how much, and what is the standard response?',
      criteria:[
        {label:'Names Grover or a square-root speed-up', any:['grover','square','sqrt','half','2\\^?64','2\\^?128']},
        {label:'Concludes AES-256 stays acceptable', any:['aes-?256','256-bit','256 bit','longer key','double']},
        {label:'Places ML-KEM at key exchange (Shor)', any:['key exchange','key establishment','shor','rsa','ecdh','public.key']},
      ],
      model:'Quantum computers weaken AES through Grover, but only by a square root: AES-256 keeps about 128-bit security, which is ample. The real break is to the RSA/ECDH key exchange (Shor), which ML-KEM replaces. Standard response: ML-KEM for key exchange, AES-256 for data.',
      soc:'Look at the Grover table. How many bits of security does AES-256 keep?' },
    { id:'A3', type:'A', step:'practice', title:'A flipped bit on the wire', cells:[['A-02','L2',1]], kind:'explain',
      prompt:'An attacker on the wire flips one bit of <i>c</i> before it reaches Bob. Describe exactly what Bob\'s program sees at step 5, and explain why ML-KEM was designed to behave that way.',
      criteria:[
        {label:'No error is raised', any:['no error','no exception','not throw','doesn.t throw','silent','without (an )?error','returns normally','nothing']},
        {label:'Bob gets a different K', any:['different','wrong','random','pseudorandom','not the same']},
        {label:'Reason: deny the attacker information about dk', any:['attacker','oracle','learn','leak','information','chosen']},
      ],
      model:'Decaps returns normally with a 32-byte value that looks valid but differs from Alice\'s K. No error is raised. If it raised one, an attacker could submit many modified ciphertexts and learn about dk from which were rejected; returning a pseudorandom value removes that signal.',
      soc:'If Bob\'s program printed "bad ciphertext", who else would learn something from that message?',
      instr:'Tutor may not name "implicit rejection" or "Fujisaki–Okamoto" before the first attempt.' },
    { id:'B1', type:'B', step:'practice', title:'Fill the ML-KEM-768 artefact table', cells:[['A-02','L3',1],['A-03','L3',0.5]], kind:'table',
      prompt:'For each artefact, choose who owns it, whether it crosses the network, and its size in bytes.',
      head:['Artefact','Owner','Crosses the wire?','Size (bytes)'],
      rows:[
        ['<i>ek</i>',{opts:['Alice','Bob','Both'],a:'Bob'},{opts:['Yes','Never'],a:'Yes'},{opts:['32','1088','1184','2400'],a:'1184'}],
        ['<i>dk</i>',{opts:['Alice','Bob','Both'],a:'Bob'},{opts:['Yes','Never'],a:'Never'},{opts:['32','1088','1184','2400'],a:'2400'}],
        ['<i>c</i>', {opts:['Alice','Bob','Both'],a:'Alice'},{opts:['Yes','Never'],a:'Yes'},{opts:['32','1088','1184','2400'],a:'1088'}],
        ['<i>K</i>', {opts:['Alice','Bob','Both'],a:'Both'},{opts:['Yes','Never'],a:'Never'},{opts:['32','1088','1184','2400'],a:'32'}],
      ],
      model:'ek — Bob, crosses, 1184 · dk — Bob, never, 2400 · c — created by Alice, crosses, 1088 · K — both, never, 32.',
      hint:'Revisit the six-step board: what is sent at steps 2 and 4?' },
    { id:'B2', type:'B', step:'practice', title:'Complete the FIPS 203 facts', cells:[['A-03','L3',1]], kind:'table',
      prompt:'Choose the word that completes each sentence.',
      head:['Sentence','Answer'],
      rows:[
        ['ML-KEM-___ is NIST security category 3.',{opts:['512','768','1024'],a:'768'}],
        ['Round-3 Kyber-768 and ML-KEM-768 ___ interoperate on the wire.',{opts:['do','do not'],a:'do not'}],
        ['A built-in ML-KEM first shipped in JDK ___.',{opts:['17','21','24','25'],a:'24'}],
        ['In Bouncy Castle, the standardised ML-KEM lives in the ___ provider.',{opts:['BC','BCPQC','SunJCE'],a:'BC'}],
      ],
      model:'768 · do not · 24 · BC.' },
    { id:'B3', type:'B', step:'practice', title:'Sort: Shor or Grover?', cells:[['A-01','L3',1]], kind:'table',
      prompt:'Sort each algorithm by what a large quantum computer does to it.',
      head:['Algorithm','Effect'],
      rows:[
        ['RSA-2048',{opts:['Broken by Shor','Weakened by Grover only'],a:'Broken by Shor'}],
        ['ECDH P-256',{opts:['Broken by Shor','Weakened by Grover only'],a:'Broken by Shor'}],
        ['ECDSA',{opts:['Broken by Shor','Weakened by Grover only'],a:'Broken by Shor'}],
        ['AES-128',{opts:['Broken by Shor','Weakened by Grover only'],a:'Weakened by Grover only'}],
        ['AES-256',{opts:['Broken by Shor','Weakened by Grover only'],a:'Weakened by Grover only'}],
        ['SHA-256',{opts:['Broken by Shor','Weakened by Grover only'],a:'Weakened by Grover only'}],
      ],
      model:'Shor: RSA-2048, ECDH P-256, ECDSA. Grover only: AES-128, AES-256, SHA-256.' },
    { id:'C1', type:'C', step:'diagnose', title:'A vendor\'s KEM diagram', cells:[['A-02','L4',1]], kind:'findline',
      prompt:'This exchange is from a product brochure. Click every step that misrepresents ML-KEM, then choose what the brochure gets wrong.',
      lines:[
        'Step 1  Bob generates a key pair (ek, dk) and publishes ek.',
        'Step 2  Alice chooses a session key S for the conversation.',
        'Step 3  Alice encapsulates S under ek and sends the result c.',
        'Step 4  Bob decapsulates c with dk and recovers S.',
        'Step 5  If c was corrupted in transit, Bob sees "Decapsulation Error - retry".',
        'Step 6  Both sides use S with AES-256-GCM.',
      ],
      groups:[[2,3],[5]],
      mech:{q:'Which two facts does the brochure get wrong?', multi:true, opts:[
        'Alice cannot choose the secret; Encaps generates K',
        'A well-sized corrupted ciphertext gives a different K with no error',
        'ek must be kept secret',
        'Bob needs Alice\'s private key',
        'AES-256-GCM is not quantum-safe',
      ], a:[0,1]},
      model:'(1) Alice does not choose the key; Encaps generates K. (2) A correctly sized but corrupted ciphertext produces no error; Bob silently gets a different K.',
      soc:'Look at Alice\'s first arrow. Which ML-KEM operation could take her chosen key as an input?' },
    { id:'C2', type:'C', step:'diagnose', title:'A migration memo', cells:[['A-03','L4',1],['A-01','L4',0.5]], kind:'findline',
      prompt:'Click the sentences that are wrong, then choose why.',
      lines:[
        'We\'ll switch our code from Kyber to ML-KEM next year.',
        'They\'re the same algorithm under a new name,',
        'so peers still running Kyber will keep working and nothing needs coordinating.',
        'Since quantum computers don\'t exist yet, there\'s no urgency.',
        'We\'ll keep AES-256 for bulk data.',
      ],
      groups:[[2,3],[4]],
      mech:{q:'Why are they wrong?', multi:true, opts:[
        'Kyber and ML-KEM do not interoperate; both ends must migrate together',
        'Harvest-now-decrypt-later makes delay risky for long-lived data',
        'AES-256 must be replaced as well',
        'Kyber is more secure than ML-KEM',
      ], a:[0,1]},
      model:'(1) Round-3 Kyber and ML-KEM do not interoperate, so both endpoints must migrate together. (2) Recorded traffic can be decrypted later, so waiting is risky. Keeping AES-256 is correct.',
      soc:'If one side upgrades and the other does not, will their shared secrets match?' },
    { id:'D1', type:'D', step:'create', title:'Design an ML-KEM-768 handshake', cells:[['A-02','L6',1],['A-03','L6',1]], kind:'explain', design:true,
      prompt:'A client app wants an AES-256-GCM session with a server using ML-KEM-768. Write the full message sequence as numbered steps. Show: who generates which key; every value that crosses the network with its size in bytes; where the KDF runs and what it outputs; what each side does if a received ek or c has the wrong length; and how the parties discover a silent Decaps mismatch. Add one sentence explaining why the exchange is safe against a future quantum attacker who records it today.',
      criteria:[
        {label:'Correct roles: the server generates and keeps dk', any:['server.{0,40}(keygen|generat|key ?pair)','(keygen|generat).{0,40}server','dk.{0,30}(server|never|stays|keep)']},
        {label:'Correct sizes: ek 1184 B and c 1088 B', all:['1184','1088']},
        {label:'KDF on both sides with the same inputs', any:['hkdf','kdf','key derivation']},
        {label:'Loud branch: abort on a wrong length', any:['(wrong|incorrect|unexpected|check).{0,40}length','length.{0,40}(check|wrong|abort|reject)','abort','reject']},
        {label:'Silent mismatch detected by AEAD or key confirmation', any:['aead','gcm','tag','key confirmation','confirm']},
        {label:'Safety sentence: not based on factoring or discrete logs', any:['shor','lattice','lwe','learning with errors','discrete','factor']},
      ],
      partialAt:3,
      model:'1. Server: KeyGen → ek (1184 B), dk (2400 B); sends ek. 2. Client: checks ek is 1184 bytes (abort otherwise); Encaps(ek) → K (32 B), c (1088 B); sends c. 3. Server: checks c is 1088 bytes (abort otherwise); Decaps(dk, c) → K. 4. Both: session key = HKDF-SHA256(K, "app v1" + client ID + server ID) → 32-byte AES-256-GCM key. 5. The client\'s first message is AEAD-encrypted; if the server\'s tag check fails it aborts, which is how a silent Decaps mismatch surfaces. Safety: ML-KEM rests on lattice problems, not factoring or discrete logs, so Shor does not apply; AES-256 keeps ~128-bit security against Grover.' },
  ],
  exit:{
    intro:'Return to the guess you wrote in the Hook.',
    qs:[
      {q:'In #2037, which one design fact about the Bouncy Castle API explained the mismatch?', criteria:[{label:'Names the default KDF', any:['kdf','key derivation','deriv','hkdf']}], model:'Its Java API applies a KDF to the raw secret by default.', cells:[['A-02','L2',0.5]]},
      {q:'Name one thing the developer could have printed to rule out "Kyber vs ML-KEM" within a minute.', criteria:[{label:'Names a raw-secret or length/name comparison', any:['raw','secret','length','1088','algorithm','print']}], model:'Both raw 32-byte secrets side by side, or the ciphertext lengths and algorithm names on each side.', cells:[['A-03','L4',0.5]]},
      {q:'Grade your Hook guess: right, partly right or wrong, and why?', ungraded:true},
    ],
  },
};
/* ================================================================
   LESSON 2 — Your first ML-KEM-768 round-trip on Bouncy Castle 1.79
   ================================================================ */
const ROUNDTRIP_SRC =
`import java.security.*;
import javax.crypto.KeyGenerator;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public class RoundTrip {
    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());                         // [1]
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");   // [2]
            kpg.initialize(MLKEMParameterSpec.ml_kem_768, new SecureRandom());     // [3]
            KeyPair kp = kpg.generateKeyPair();                                    // [4]

            KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", "BC");          // [5]
            enc.init(new KEMGenerateSpec(kp.getPublic(), "AES", 256), new SecureRandom());
            SecretKeyWithEncapsulation sent = (SecretKeyWithEncapsulation) enc.generateKey();
            byte[] ct = sent.getEncapsulation();                                   // [6]

            KeyGenerator dec = KeyGenerator.getInstance("ML-KEM", "BC");          // [7]
            dec.init(new KEMExtractSpec(kp.getPrivate(), ct, "AES", 256));
            SecretKeyWithEncapsulation recv = (SecretKeyWithEncapsulation) dec.generateKey();

            System.out.println("provider = " + kpg.getProvider().getName());       // [8]
            System.out.println("ctLen    = " + ct.length);
            System.out.println("match    = " + MessageDigest.isEqual(sent.getEncoded(), recv.getEncoded()));
        } catch (GeneralSecurityException e) {                                     // [9]
            System.err.println("KEM failure: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            System.exit(1);
        }
    }
}`;

const KEMCHECK_STARTER =
`import java.security.*;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.security.auth.DestroyFailedException;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public class KemCheck {
    public static void main(String[] args) {
        // TODO register the provider
        int status = 0;
        byte[] a = null, b = null;
        SecretKey sent = null, recv = null;
        try {
            // TODO generate an ML-KEM-768 key pair with an explicit spec
            // TODO encapsulate an AES-256 key, decapsulate it
            // TODO print providerIsBC=, ctLenIs1088=, secretsMatch=
        } catch (GeneralSecurityException e) {
            // TODO report the class name and set a failure status
        } finally {
            // TODO wipe your byte[] copies and try destroy() on both keys
        }
        // TODO print cleanedUp= and exit with the status
    }
}`;

const KEMCHECK_REF =
`import java.security.*;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.security.auth.DestroyFailedException;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public class KemCheck {
    private static final int ML_KEM_768_CT = 1088;   // FIPS 203

    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());
        int status = 0;
        byte[] a = null, b = null;
        SecretKey sent = null, recv = null;
        try {
            SecureRandom rng = new SecureRandom();
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
            kpg.initialize(MLKEMParameterSpec.ml_kem_768, rng);
            KeyPair kp = kpg.generateKeyPair();

            KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", "BC");
            enc.init(new KEMGenerateSpec(kp.getPublic(), "AES", 256), rng);
            SecretKeyWithEncapsulation s = (SecretKeyWithEncapsulation) enc.generateKey();
            sent = s;
            byte[] ct = s.getEncapsulation();

            KeyGenerator dec = KeyGenerator.getInstance("ML-KEM", "BC");
            dec.init(new KEMExtractSpec(kp.getPrivate(), ct, "AES", 256));
            recv = dec.generateKey();

            a = sent.getEncoded();
            b = recv.getEncoded();
            System.out.println("providerIsBC=" + "BC".equals(kpg.getProvider().getName()));
            System.out.println("ctLenIs1088=" + (ct.length == ML_KEM_768_CT));
            System.out.println("secretsMatch=" + MessageDigest.isEqual(a, b));
        } catch (GeneralSecurityException e) {
            System.err.println("KEM failure: " + e.getClass().getSimpleName());
            status = 1;
        } finally {
            wipe(a);
            wipe(b);
            destroyQuietly(sent);
            destroyQuietly(recv);
        }
        if (status == 0) {
            System.out.println("cleanedUp=" + (isZero(a) && isZero(b)));
        }
        System.exit(status);
    }

    static void wipe(byte[] x) { if (x != null) Arrays.fill(x, (byte) 0); }

    static boolean isZero(byte[] x) {
        if (x == null) return false;
        for (byte v : x) if (v != 0) return false;
        return true;
    }

    static void destroyQuietly(SecretKey k) {
        if (k == null) return;
        try { k.destroy(); }
        catch (DestroyFailedException e) { /* not destroyable; own copies already wiped */ }
    }
}`;

LESSONS.L2 = {
  id:'L2', n:2, title:'Your first ML-KEM-768 round-trip on Bouncy Castle 1.79', short:'ML-KEM-768 round-trip',
  concepts:['B-01','B-02','B-03','B-05','D-01','D-02','D-03','D-04'], minutes:90,
  gate:{label:'A-02 Understand ≥ 0.40', cells:[['A-02','L2',0.40]]},
  hint:'What does the error or the output name: a provider, an algorithm name, a parameter type, or a key? Which of the nine markers in the reference program does that belong to?',
  bans:[{terms:['sha1prng is deterministic','deterministic'], until:['C3']}, {terms:['finally'], until:['D1']}],
  instr:{
    misconceptions:[
      '"Adding the jar is enough." → run without [1] and read the exception.',
      '"match = true means the KEM is correct." → downgrade, seeded RNG and wrong provider all still print true.',
      '"Catching Exception and logging it is good error handling." → it hides failures and continues with broken state.',
      '"destroy() threw, so cleanup failed." → the default destroy() throws by design; wiping own copies is the controllable part.',
    ],
  },
  hook:{
    title:'Sixteen developers, zero error handling',
    story:[
      'In 2026 researchers asked sixteen developers to implement ML-KEM and ML-DSA with real post-quantum libraries. Some were security specialists; some had years of professional experience.',
    ],
    prompt:'Predict: how many of the sixteen got basic key encapsulation working? How many handled the case where encapsulation or decapsulation fails? Then finish the sentence "My program will be done when…".',
    reveal:{
      intro:'What the study found:',
      items:[
        'All sixteen got encapsulation working.',
        'None handled encapsulation or decapsulation failures.',
        'None destroyed key material afterwards, including the three who called themselves security experts.',
      ],
      close:'The crypto call was never the hard part. Today your program is graded on three things equally: it works, it fails cleanly, and it cleans up.',
      src:'<a href="https://arxiv.org/abs/2602.14539" target="_blank" rel="noopener">Toruan et al., arXiv 2602.14539</a> (the study used Python APIs; the same omissions are easy in Java)',
    },
    instr:'Say the study used Python. The Java compiler forces you to declare exceptions, not to handle them well.',
  },
  parts:[
    { id:'P1', title:'How Java finds crypto code', concepts:['B-01','B-02','D-02','D-03','D-04'],
      bigIdea:'In Java you never call an algorithm directly. You ask the platform for an implementation by name, and an ordered list of installed providers decides whose code you get.',
      blocks:[
        {table:{head:['Layer','Example','Role'], rows:[
          ['Engine class (what)','<code>KeyPairGenerator</code>, <code>KeyGenerator</code>, <code>KEM</code>','A fixed API your code calls'],
          ['Algorithm name','<code>"ML-KEM"</code>','Which algorithm you ask for'],
          ['Provider (who)','<code>"BC"</code>, <code>"SunJCE"</code>','A library that registers implementations under names'],
          ['Provider list','<code>Security.getProviders()</code>','An ordered list; position 1 is asked first'],
        ]}},
        {p:'Think of a street of cafés. The engine class is a menu item ("a coffee"); providers are the cafés, checked in order; naming a provider is walking straight into one café.'},
        {h:'Registering Bouncy Castle'},
        {code:{fn:'registration', text:'Security.addProvider(new BouncyCastleProvider());'}},
        {ul:['This adds BC at the <b>end</b> of the provider list (lowest priority).','Without it, asking for provider <code>"BC"</code> fails immediately with <code>NoSuchProviderException</code>: a loud failure, which is the good kind.','<code>Security.insertProviderAt(p, 1)</code> puts a provider first. Lesson 4 shows why that matters.']},
        {h:'How getInstance chooses'},
        {table:{head:['Call','What happens on the lab JDK (21.0.13)','Risk'], rows:[
          ['<code>getInstance("ML-KEM", "BC")</code>','Goes straight to BC; fails loudly if BC is not registered','None: this is the course rule'],
          ['<code>getInstance("ML-KEM")</code>','Returns the first provider offering ML-KEM. On the lab JDK that is SunJCE, the JDK\'s own ML-KEM, not BC','Silent: your code runs a different library than you think. On JDK 21.0.12 the same line answered BC, so a routine patch changed it'],
        ]}},
        {callout:{title:'Course rule', html:'Always name <code>"BC"</code> in every <code>getInstance</code>, and print the provider once so it is visible in your output.'}},
        {h:'Declaring and pinning the dependency'},
        {code:{fn:'pom.xml', text:'<dependency>\n  <groupId>org.bouncycastle</groupId>\n  <artifactId>bcprov-jdk18on</artifactId>\n  <version>1.79</version>\n</dependency>'}},
        {ul:['<code>jdk18on</code> means "built for Java 8 and later"; it is the right artifact for JDK 21.','<b>Pin the exact version.</b> A range such as <code>[1.79,1.90)</code> pulls whichever release is newest that day. Bouncy Castle\'s PQC behaviour has changed between releases, so two builds a week apart could run different crypto.']},
        {h:'Choosing the right import'},
        {table:{head:['Class','Package','What it is','Use here?'], rows:[
          ['<code>MLKEMParameterSpec</code>','<code>org.bouncycastle.jcajce.spec</code>','JCA spec for <code>initialize(...)</code>','<b>Yes</b>'],
          ['<code>MLKEMParameters</code>','<code>org.bouncycastle.pqc.crypto.mlkem</code>','Parameter object for BC\'s low-level API','No: will not compile in <code>initialize(...)</code>'],
          ['<code>KEMGenerateSpec</code>, <code>KEMExtractSpec</code>','<code>org.bouncycastle.jcajce.spec</code>','Tell <code>KeyGenerator</code> to encapsulate or decapsulate','<b>Yes</b>'],
          ['<code>SecretKeyWithEncapsulation</code>','<code>org.bouncycastle.jcajce</code>','A secret key that also carries the ciphertext','<b>Yes</b>'],
        ]}},
        {p:'The habit to build: after accepting an autocomplete, read the package name before moving on.'},
      ],
      checks:[
        {q:'You call getInstance("ML-KEM", "BC") but forgot addProvider. Loud or silent?', opts:['Loud: NoSuchProviderException','Silent: it falls back to another provider','Silent: it returns null','Loud: a compile error'], a:0, why:'A named provider that is not registered fails immediately.'},
        {q:'Why is getInstance("ML-KEM") without a provider name risky, even though it works today?', opts:['A JDK upgrade or another library can change which provider answers, with no error','It is slower','It does not compile on JDK 21','It always picks ML-KEM-512'], a:0, why:'The first provider in a global list answers.'},
        {q:'Your build file says <version>[1.79,)</version>. What is the problem?', opts:['Unpinned: future builds may silently use a different Bouncy Castle','It is invalid Maven syntax','It forces version 1.79 only','It disables PQC algorithms'], a:0, why:'Ranges make builds non-reproducible.'},
      ],
      reteach:'Every line in this part answers one question: "whose code will actually run?" The provider list is the answer for unnamed calls, the provider argument overrides it, the pinned dependency fixes which release of that code you get, and the import decides which class you are even talking to.',
      instr:'Live demo: print Security.getProviders() before and after addProvider, then kpg.getProvider().getName().',
    },
    { id:'P2', title:'The round-trip, line by line', concepts:['B-03','B-05'],
      bigIdea:'Each block of the program is one step of Lesson 1\'s diagram. If you can point from a line to a step, you understand the code; if you cannot, you are copying it.',
      blocks:[
        {p:'Read the whole program once and predict the three output lines. Then run it, and try the two variations.'},
        {code:{fn:'RoundTrip.java', text:ROUNDTRIP_SRC, runs:[
          {label:'Run as written', out:['provider = BC','ctLen    = 1088','ok:match    = true','q:exit code 0']},
          {label:'[7] uses "AES", 128', out:['provider = BC','ctLen    = 1088','warn:match    = false','q:exit code 0 · no exception: a silent failure']},
          {label:'Delete [1]', out:['exc:KEM failure: NoSuchProviderException: no such provider: BC','q:exit code 1 · a loud failure']},
        ]}},
        {table:{head:['Marker','Code','Lesson 1 step','What breaks if it is wrong'], rows:[
          ['[1]','<code>addProvider</code>','setup','Loud: NoSuchProviderException at [2]'],
          ['[2]','<code>KeyPairGenerator.getInstance("ML-KEM", "BC")</code>','Step 1, KeyGen','Loud if name or provider is wrong'],
          ['[3]','<code>initialize(ml_kem_768, …)</code>','Step 1','<b>Silent</b> if a different set is chosen (Lesson 3)'],
          ['[4]','<code>generateKeyPair()</code>','Step 1','—'],
          ['[5]','<code>KEMGenerateSpec(ek, "AES", 256)</code>','Step 3 Encaps + step 6 KDF','Silent if the KDF arguments differ from Bob\'s'],
          ['[6]','<code>getEncapsulation()</code>','Step 4','—'],
          ['[7]','<code>KEMExtractSpec(dk, c, "AES", 256)</code>','Step 5 Decaps + step 6 KDF','Silent on a wrong c or wrong KDF arguments'],
          ['[8]','three <code>println</code> lines','verification','—'],
          ['[9]','<code>catch (GeneralSecurityException e)</code>','failure branch','Unhandled failure or leaked secrets'],
        ]}},
        {h:'Four details worth a pause'},
        {ol:[
          '<b>The "AES", 256 arguments are the KDF.</b> Bouncy Castle derives an AES-256 key from the raw secret here. Both sides must pass identical arguments.',
          '<b>getEncapsulation() is the only fixed-size artefact you can check.</b> Its length is a FIPS 203 constant: 1088 bytes for ML-KEM-768. The derived key is 32 bytes because you <i>asked</i> for 256 bits.',
          '<b>In real code Alice and Bob are different programs.</b> Only ek and ct cross a network; the private key never leaves Bob.',
          '<b>MessageDigest.isEqual is a constant-time comparison.</b> Arrays.equals stops at the first differing byte. And only a test ever compares the two keys.',
        ]},
      ],
      checks:[
        {q:'Which marker is Encaps, and which key does it take?', opts:['[5], the public key ek','[7], the private key dk','[2], no key','[5], the private key dk'], a:0, why:'KEMGenerateSpec takes kp.getPublic().'},
        {q:'Why does the derived key have 32 bytes?', opts:['KEMGenerateSpec asked for a 256-bit AES key; it is KDF output','ML-KEM-768 secrets are always 32 bytes of ciphertext','Because the ciphertext is 1088 bytes','Because SHA-256 is used'], a:0, why:'The size follows your request, not the parameter set.'},
        {q:'The "AES", 128 run printed match = false with exit code 0. What kind of failure is that?', opts:['Silent','Loud','A compile error','Not a failure'], a:0, why:'It ran, exited 0 and printed plausible output.'},
      ],
      reteach:'Lay Lesson 1\'s board beside the code. Markers [2]–[4] are KeyGen, [5] is Encaps plus the KDF, [6] is what crosses the wire, [7] is Decaps plus the same KDF, [8] proves the result, [9] is the failure path.',
      instr:'Guided run: as written; change [7] to 128; delete [1]; then print kp.getPublic().getClass().getName() for Lesson 4.',
    },
    { id:'P3', title:'When things go wrong', concepts:['D-01','D-05'],
      bigIdea:'A crypto program can fail loudly (an exception), silently (wrong output, no error), or by leaving secrets lying around. You need a handling pattern for the first, suspicion for the second, and a realistic habit for the third.',
      blocks:[
        {table:{head:['Exception','Meaning','Typical cause here','First fix'], rows:[
          ['<code>NoSuchProviderException</code>','Named provider not registered','Forgot addProvider; typo in "BC"','Register BC before the first getInstance'],
          ['<code>NoSuchAlgorithmException</code>','Provider does not offer that name','Typo; an old name such as "Kyber" asked of the wrong provider','Use the name the provider registers'],
          ['<code>NullPointerException</code> at <code>generateKeyPair()</code>','Wrong kind of spec: BC 1.79 accepts it in <code>initialize</code>, then fails one line later','A classical (EC) spec passed to ML-KEM','Use <code>MLKEMParameterSpec</code>'],
          ['<code>ArrayIndexOutOfBoundsException</code> at decapsulation','Ciphertext too short','A truncated or corrupted <code>ct</code>','Check <code>ct.length == 1088</code> before decapsulating'],
          ['<code>ClassCastException</code> naming <code>BCKyberPublicKey</code>','A key from another provider','Key generated through BCPQC, used with BC','Pin "BC" where the key is created; guard with <code>instanceof MLKEMKey</code>'],
        ]}},
        {callout:{title:'Measured on JDK 21 + Bouncy Castle 1.79', html:'Three of these five failures are <b>runtime</b> exceptions, so <code>catch (GeneralSecurityException e)</code> does not catch them and the program stops with a stack trace. That is loud, which is good, but the real fix is to check inputs before the call: the spec type, the ciphertext length and the key class. A ciphertext that is too <i>long</i> is worse: BC 1.79 accepts it with no error and returns a different key.'}},
        {h:'The minimum handling pattern'},
        {ol:['Catch <code>GeneralSecurityException</code> (or each subtype if you react differently).','Report the exception class and message. Never print key bytes or <code>getEncoded()</code> output in an error path.','Stop with a non-zero exit code, or rethrow. Do not carry on with half-built crypto objects.','Do not catch <code>Exception</code> and continue: that hides the silent failures this course is about.']},
        {h:'Randomness: the bug that passes every test'},
        {code:{fn:'seeded RNG', text:'SecureRandom rng = SecureRandom.getInstance("SHA1PRNG");\nrng.setSeed(42L);   // seeded before first use', runs:[
          {label:'Run 1', out:['provider = BC','ctLen    = 1088','match    = true','q:sha256(ct) = 1359d26a31a8…']},
          {label:'Run 2', out:['provider = BC','ctLen    = 1088','match    = true','warn:sha256(ct) = 1359d26a31a8…   ← identical to run 1']},
        ]}},
        {p:'A SHA1PRNG seeded before its first use becomes deterministic: every run produces the same "random" bytes, so every key pair and ciphertext can be reproduced by anyone who knows the seed. The program still prints BC, 1088, true. Only comparing two runs reveals it. <span class="src">(Recorded on JDK 21 + Bouncy Castle 1.79.)</span>'},
        {callout:{title:'"I seeded it for speed"', html:'Secure randomness is not the bottleneck. In Vargas Martin\'s Exercise 6.3 a CSPRNG produced 15,000 values in about 3.3 ms against 125.2 ms for Python\'s default generator. Use <code>new SecureRandom()</code> and never call <code>setSeed</code> with a constant.'}},
        {h:'Cleaning up secrets: what Java actually lets you do'},
        {ol:['<b>Wipe the copies you own.</b> <code>getEncoded()</code> returns a copy; overwrite it with <code>Arrays.fill(bytes, (byte) 0)</code> when done.','<b>Ask the key to destroy itself.</b> <code>destroy()</code> is correct, but Java\'s default throws <code>DestroyFailedException</code>, meaning "not supported". Catch it and treat it as information.']},
        {code:{fn:'cleanup pattern', text:'static void wipe(byte[] b) { if (b != null) Arrays.fill(b, (byte) 0); }\n\nstatic void destroyQuietly(SecretKey k) {\n    if (k == null) return;\n    try { k.destroy(); }\n    catch (DestroyFailedException e) { /* not destroyable; own copies already wiped */ }\n}'}},
        {p:'Put cleanup in a <code>finally</code> block so it runs on both paths. <code>System.exit</code> inside a <code>catch</code> skips <code>finally</code>: set a status and exit at the end instead. What you cannot do: reach copies the JVM made during garbage collection. Wiping narrows the window; it does not close it.'},
      ],
      checks:[
        {q:'initialize(...) at marker [3] returns normally, then generateKeyPair() throws NullPointerException. Most likely cause?', opts:['The wrong kind of spec was passed to initialize','BC is not registered','The key is from another provider','The ciphertext is too short'], a:0, why:'BC 1.79 does not reject a foreign spec in initialize; the failure surfaces at key generation.'},
        {q:'Your round-trip prints match = true on every run. Does that prove your randomness is good?', opts:['No: a deterministic RNG also gives true; compare two runs','Yes: a bad RNG would fail the match','Yes, if ctLen is 1088','Only on JDK 21'], a:0, why:'Agreement and freshness are different properties.'},
        {q:'key.destroy() threw DestroyFailedException. Is your program broken?', opts:['No: the key type does not support it; make sure your byte copies are wiped','Yes: the key is still in memory','Yes: rethrow it','Only if the key is a private key'], a:0, why:'The default destroy() throws by design.'},
      ],
      reteach:'Three columns: loud (an exception you can read), silent (the output looks fine), residue (secret bytes left in memory). Exceptions get a catch that reports and stops. Silent failures get an observable you check. Residue gets a finally that wipes what you own.',
      instr:'Run the seeded program twice live and diff the ciphertext hashes.',
    },
  ],
  exercises:[
    { id:'A1', type:'A', step:'practice', title:'Remove one line, then another', cells:[['B-02','L2',1],['B-01','L2',0.5]], kind:'explain',
      prompt:'Case 1: delete <code>Security.addProvider(...)</code> but keep <code>"BC"</code> in every <code>getInstance</code>. Case 2: keep <code>addProvider</code> but remove <code>"BC"</code> from every <code>getInstance</code>. On the lab JDK (21.0.13), what happens in each case? What did case 2 do on JDK 21.0.12, before the October 2026 update? Why the difference?',
      criteria:[
        {label:'Case 1 fails loudly (NoSuchProviderException)', any:['nosuchprovider','no such provider','loud','exception']},
        {label:'Case 2 runs, but silently on the JDK\'s own ML-KEM (SunJCE)', any:['sun','built-?in','jdk.{0,12}(own|provider|implementation)','silent','not bc','different provider']},
        {label:'On 21.0.12 it answered BC, because the JDK had no ML-KEM yet', any:['21\\.0\\.12','before','older','earlier','only (provider|one)','bc answered','used bc','update','patch']},
      ],
      model:'Case 1 fails loudly with NoSuchProviderException at the first getInstance. Case 2 runs without error, but on the JDK\'s own ML-KEM (SunJCE), because the JDK comes earlier in the provider list than the appended BC. On 21.0.12 the JDK had no ML-KEM, so the same code ran on BC. A routine patch silently changed which library runs.',
      soc:'Print Security.getProviders(). Where is BC in the list, and who else offers ML-KEM on the lab JDK?' },
    { id:'A2', type:'A', step:'practice', title:'Where does Bob\'s key come from?', cells:[['B-05','L2',1]], kind:'explain',
      prompt:'Marker [7] receives <code>ct</code> but not Alice\'s key. Where does Bob\'s key come from? What would <code>recv.getEncoded()</code> contain if one byte of <code>ct</code> were flipped on the way?',
      criteria:[
        {label:'Recomputed from dk and ct', any:['dk','private','decaps','recompute','derive']},
        {label:'A flipped byte gives a different key', any:['different','wrong','false','not the same']},
        {label:'No exception (implicit rejection)', any:['no exception','no error','silent','implicit','without']},
      ],
      model:'Decaps recomputes the shared secret from dk and ct, then BC derives the AES key from it. With a flipped byte Decaps returns a different, valid-looking secret with no exception, so recv.getEncoded() holds a different key and match is false.',
      soc:'Revisit Lesson 1, Part 3. What does ML-KEM return instead of an error?' },
    { id:'A3', type:'A', step:'practice', title:'Two autocomplete suggestions', cells:[['D-04','L2',1]], kind:'explain',
      prompt:'Autocomplete offers <code>org.bouncycastle.jcajce.spec.MLKEMParameterSpec</code> and <code>org.bouncycastle.pqc.crypto.mlkem.MLKEMParameters</code>. Which belongs in <code>kpg.initialize(...)</code>, and what goes wrong with the other?',
      criteria:[
        {label:'Picks the jcajce.spec class', any:['jcajce','mlkemparameterspec']},
        {label:'The other is the low-level API and will not compile there', any:['low-?level','compile','not an algorithmparameterspec','pqc\\.crypto','lightweight']},
      ],
      model:'The jcajce.spec class, a JCA AlgorithmParameterSpec. The pqc.crypto class belongs to BC\'s low-level API and is not an AlgorithmParameterSpec, so initialize(...) does not compile.',
      soc:'Which of the two package names contains "jcajce", the JCA bridge?' },
    { id:'A4', type:'A', step:'practice', title:'A catch block that logs and carries on', cells:[['D-01','L2',1]], kind:'explain',
      prompt:'A teammate\'s catch block is <code>catch (Exception e) { log.info("crypto issue"); }</code> and execution continues. Describe two concrete ways this makes the program less safe.',
      criteria:[
        {label:'Continues with missing or wrong keys', any:['continu','null','uninitiali','wrong key','broken state','carries on','proceeds']},
        {label:'Hides the exception class, so the cause is never diagnosed', any:['hide','swallow','diagnos','class','which exception','lost']},
        {label:'Catching Exception also hides unrelated runtime bugs', any:['runtime','classcast','nullpointer','other bug','everything','unrelated']},
      ],
      passNeed:2,
      model:'(1) It continues with uninitialised or wrong keys, so later code may encrypt with nothing or crash confusingly. (2) It hides the exception class, so a missing provider or wrong key is never diagnosed. (3) Catching Exception also hides runtime bugs such as a ClassCastException.',
      soc:'After the catch block runs, what value do the key variables hold?' },
    { id:'A5', type:'A', step:'practice', title:'How a predictable RNG breaks a KEM', cells:[['D-05','L2',1],['B-03','L2',0.5]], kind:'explain',
      prompt:'ML-KEM samples its secret and error vectors from random bytes. Suppose those bytes came from a seeded, predictable generator. Explain step by step how an attacker who knows the seed recovers Bob\'s decapsulation key, and why the public key ek would still look perfectly normal.',
      criteria:[
        {label:'Re-running key generation with the seed reproduces dk', any:['rerun','re-run','reproduc','same (s|key|dk)','regenerat','recompute']},
        {label:'Encapsulation randomness is reproducible too, so past secrets fall', any:['past','previous','session','encaps','shared secret']},
        {label:'ek keeps the right length and format', any:['length','format','looks normal','same size','1184','shape']},
      ],
      passNeed:2,
      model:'With the seed, the attacker reruns key generation and gets the same secret vector, the core of dk. Encapsulation randomness is equally reproducible, so past shared secrets fall too. ek still has the right length and format, because predictability does not change the output\'s shape.',
      soc:'If two machines run key generation with the same seed, what do they each get?',
      instr:'Adapted from Vargas Martin, Practical Cryptography, Listing 9.1 TODO 4.' },
    { id:'B1', type:'B', step:'practice', title:'Register and choose the set', cells:[['B-01','L3',1],['B-03','L3',1],['B-02','L3',0.5]], kind:'fill',
      prompt:'Fill markers [1] and [3] so the program prints provider = BC, ctLen = 1088, match = true.',
      code:'Security.addProvider(new {{0}}());                                  // [1]\nKeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");\nkpg.initialize(MLKEMParameterSpec.{{1}}, new SecureRandom());     // [3]',
      blanks:[
        {a:['BouncyCastleProvider'], ph:'class name'},
        {opts:['ml_kem_512','ml_kem_768','ml_kem_1024'], a:['ml_kem_768'], miss:{ml_kem_512:'Output: ctLen = 768. Which set produces which length? Lesson 1, Part 4.', ml_kem_1024:'Output: ctLen = 1568. Which set produces which length? Lesson 1, Part 4.'}},
      ],
      passOut:['provider = BC','ctLen    = 1088','ok:match    = true'],
      hint:'Is the provider class registered, and does your parameter set match category 3?' },
    { id:'B2', type:'B', step:'practice', title:'Complete the receiver', cells:[['B-05','L3',1]], kind:'fill',
      prompt:'Complete Bob\'s decapsulation so it matches Alice\'s side exactly.',
      code:'enc.init(new KEMGenerateSpec(kp.getPublic(), "AES", 256), new SecureRandom());   // Alice\n...\ndec.init(new KEMExtractSpec(kp.{{0}}(), {{1}}, "AES", {{2}}));                    // Bob',
      blanks:[
        {opts:['getPublic','getPrivate'], a:['getPrivate'], miss:{getPublic:'Does not compile: KEMExtractSpec takes a PrivateKey. Decapsulation needs dk.'}},
        {opts:['ct','sent.getEncoded()','kp.getPublic().getEncoded()'], a:['ct']},
        {opts:['128','192','256'], a:['256'], miss:{'128':'Compiles, runs, prints match = false: Bob\'s KDF now derives a 128-bit key. Compare with Alice\'s arguments character by character.','192':'Compiles, runs, prints match = false: the KDF arguments differ from Alice\'s.'}},
      ],
      passOut:['provider = BC','ctLen    = 1088','ok:match    = true'],
      hint:'Which key does Decaps need, and must the KDF arguments match the sender\'s?' },
    { id:'B3', type:'B', step:'practice', title:'Choose the catch clause', cells:[['D-01','L3',1]], kind:'mc', codeOpts:true,
      prompt:'Which catch clause meets the minimum handling pattern?',
      opts:[
        'catch (Exception e) { }',
        'catch (GeneralSecurityException e) {\n    System.err.println("KEM failure: " + e.getClass().getSimpleName());\n    System.exit(1);\n}',
        'catch (GeneralSecurityException e) {\n    System.out.println(Hex.toHexString(kp.getPrivate().getEncoded()));\n}',
        'catch (GeneralSecurityException e) {\n    log.info("crypto issue");\n}',
      ], a:1,
      model:'Option 2: it catches the crypto exception family, reports the class, prints no secrets and stops with a non-zero status.',
      hint:'Which option reports the cause, leaks nothing, and stops?' },
    { id:'B4', type:'B', step:'practice', title:'Declare the dependency', cells:[['D-02','L3',1],['D-03','L3',1]], kind:'table',
      prompt:'Fill the Maven dependency for the lab, reproducibly.',
      head:['Element','Value'],
      rows:[
        ['<code>groupId</code>',{opts:['org.bouncycastle','com.bouncycastle','bouncycastle'],a:'org.bouncycastle'}],
        ['<code>artifactId</code>',{opts:['bcprov-jdk18on','bcprov-jdk15on','bcpqc-fips'],a:'bcprov-jdk18on'}],
        ['<code>version</code>',{opts:['1.79','[1.79,1.90)','LATEST','1.+'],a:'1.79'}],
      ],
      model:'org.bouncycastle · bcprov-jdk18on · exactly 1.79.',
      hint:'Would two builds a month apart run the same code?' },
    { id:'C1', type:'C', step:'diagnose', title:'Read the output', cells:[['B-01','L4',1],['C-04','L4',0.5]], kind:'findline', code:true,
      prompt:'The program printed <code>KEM failure: NoSuchProviderException: no such provider: BC</code> and exited with status 1. Click the line that threw, then name the cause and fix.',
      lines:[
        'public static void main(String[] args) {',
        '    try {',
        '        KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");',
        '        kpg.initialize(MLKEMParameterSpec.ml_kem_768, new SecureRandom());',
        '        KeyPair kp = kpg.generateKeyPair();',
        '        // ... encapsulate, decapsulate, print',
        '    } catch (GeneralSecurityException e) {',
        '        System.err.println("KEM failure: " + e.getClass().getSimpleName() + ": " + e.getMessage());',
        '        System.exit(1);',
        '    }',
        '}',
      ],
      groups:[[3]],
      mech:{q:'Cause and fix?', opts:[
        'BC was never registered: add Security.addProvider(new BouncyCastleProvider()) before the first getInstance',
        'The algorithm name is wrong: use "Kyber"',
        'The parameter set is wrong: use ml_kem_1024',
        'The JDK is too old for ML-KEM',
      ], a:0},
      model:'NoSuchProviderException at the first getInstance(..., "BC"): BC was never registered. Add Security.addProvider(new BouncyCastleProvider()) before it.',
      soc:'The exception names a provider, not an algorithm. Where in this code is that provider registered?' },
    { id:'C2', type:'C', step:'diagnose', title:'Copied from an ECDH tutorial', cells:[['B-03','L4',1],['C-04','L4',0.5]], kind:'findline', code:true,
      prompt:'On Bouncy Castle 1.79, line 3 runs without complaint and line 4 throws <code>NullPointerException</code>. Click the line that is actually at fault, then explain.',
      lines:[
        'Security.addProvider(new BouncyCastleProvider());',
        'KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");',
        'kpg.initialize(new ECGenParameterSpec("secp256r1"));',
        'KeyPair kp = kpg.generateKeyPair();',
      ],
      groups:[[3]],
      mech:{q:'Why does it fail?', opts:[
        'An elliptic-curve spec cannot configure a lattice KEM; use MLKEMParameterSpec',
        'secp256r1 is deprecated',
        'The provider must be BCPQC',
        'initialize must be called twice',
      ], a:0},
      model:'An elliptic-curve parameter spec cannot configure ML-KEM. BC 1.79 does not reject it in initialize; key generation then fails with a NullPointerException, a runtime exception that catch (GeneralSecurityException) does not catch. The fault is line 3, not the line that threw. The code was probably adapted from ECDH without knowing ML-KEM needs its own spec.',
      soc:'What kind of object is ECGenParameterSpec built to configure?' },
    { id:'C3', type:'C', step:'diagnose', title:'It passes all its checks', cells:[['D-05','L4',0.5],['B-03','L4',0.5]], kind:'findline', code:true, flag:'M1',
      prompt:'This program prints <code>BC</code>, <code>1088</code>, <code>true</code>. A second run prints the same ciphertext hash. Click the line that makes it insecure, and explain.',
      lines:[
        'Security.addProvider(new BouncyCastleProvider());',
        'SecureRandom rng = SecureRandom.getInstance("SHA1PRNG");',
        'rng.setSeed(42L);',
        'KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");',
        'kpg.initialize(MLKEMParameterSpec.ml_kem_768, rng);',
        'KeyPair kp = kpg.generateKeyPair();',
        'KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", "BC");',
        'enc.init(new KEMGenerateSpec(kp.getPublic(), "AES", 256), rng);',
      ],
      groups:[[3]],
      mech:{q:'What is wrong, and how would you test for it?', opts:[
        'SHA1PRNG seeded before first use is deterministic, so keys are predictable; test by running twice and checking the ciphertexts differ',
        'SHA1PRNG is too slow; use a faster generator',
        '42 is too small; use a larger seed',
        'The SecureRandom must be static',
      ], a:0},
      model:'SHA1PRNG seeded before first use is deterministic: every key pair and ciphertext is predictable from the seed. Test by running twice and comparing ciphertexts or public keys; they must differ. Fix: new SecureRandom(), no constant seed.',
      soc:'Who else could reproduce those keys?' },
    { id:'C4', type:'C', step:'diagnose', title:'Audit a published example', cells:[['D-01','L4',1],['D-05','L4',0.5]], kind:'mc', multi:true,
      prompt:'This excerpt is from a 2026 cryptography textbook\'s ML-KEM benchmark (Vargas Martin, <i>Practical Cryptography</i>, Listing 9.3, shortened). It does its stated job. Which of the statements below are rule breaks you would fix before copying it?',
      show:'public static void main(String[] args) throws Exception {\n    Security.addProvider(new BouncyCastleProvider());\n    Security.addProvider(new BouncyCastlePQCProvider());\n    long start = System.nanoTime();\n    KeyPairGenerator kpg = KeyPairGenerator.getInstance("Kyber", "BCPQC");\n    kpg.initialize(KyberParameterSpec.kyber768, new SecureRandom());\n    // ... wrap and unwrap an AES key ...\n    if (!java.util.Arrays.equals(secretKey.getEncoded(), unwrappedKey.getEncoded()))\n        throw new RuntimeException("Decapsulation failed!");',
      opts:[
        'main throws Exception: failures are never handled',
        'Arrays.equals compares secret bytes in non-constant time',
        'getEncoded() copies are never wiped',
        '"Kyber" through BCPQC is the legacy path, not the BC provider\'s ML-KEM',
        'Both providers are registered, which allows mixing',
        'new SecureRandom() should be seeded for reproducibility',
        'kyber768 is a weaker parameter set than ml_kem_512',
      ], a:[0,1,2,3,4],
      model:'All of the first five. Seeding SecureRandom would make it worse, and kyber768 corresponds to the 768 level, not a weaker one. Frame it fairly: the listing is a clear benchmark; the exercise is reading any example against a checklist before copying it.',
      instr:'From the book review. Check the repository licence before handing out the full listing.',
      soc:'Take the course rules one by one: exceptions, comparison, cleanup, provider. Which does this excerpt meet?' },
    { id:'D1', type:'D', step:'create', title:'KemCheck.java', cells:[['B-01','L6',1],['B-02','L6',1],['B-03','L6',1],['B-05','L6',1],['D-01','L6',1],['D-02','L6',0.5],['D-04','L6',1]], kind:'code',
      prompt:'Write <code>KemCheck.java</code>. Register BC; generate an ML-KEM-768 key pair with an explicit parameter spec; encapsulate an AES-256 key; decapsulate it; then print exactly <code>providerIsBC=</code>, <code>ctLenIs1088=</code>, <code>secretsMatch=</code>, <code>cleanedUp=</code>. Any <code>GeneralSecurityException</code> prints its class name to stderr and exits with status 1. On both paths, zero every <code>byte[]</code> copy of secret material and attempt <code>destroy()</code> on both keys, treating <code>DestroyFailedException</code> as "not destroyable".',
      starter:KEMCHECK_STARTER, ref:KEMCHECK_REF,
      checks:[
        {label:'Registers the BC provider', re:'Security\\.(addProvider|insertProviderAt)\\s*\\(\\s*new\\s+BouncyCastleProvider'},
        {label:'Explicit ml_kem_768 spec', re:'MLKEMParameterSpec\\.ml_kem_768'},
        {label:'"BC" named in every getInstance', special:'pinned'},
        {label:'Encapsulates with KEMGenerateSpec(…, "AES", 256)', re:'KEMGenerateSpec\\s*\\([^;]*"AES"\\s*,\\s*256'},
        {label:'Decapsulates with KEMExtractSpec(…, "AES", 256)', re:'KEMExtractSpec\\s*\\([^;]*"AES"\\s*,\\s*256'},
        {label:'Prints all four lines', all:['providerIsBC=','ctLenIs1088=','secretsMatch=','cleanedUp=']},
        {label:'Catches GeneralSecurityException and fails with status 1', all:['catch\\s*\\(\\s*GeneralSecurityException','(exit\\s*\\(\\s*1\\s*\\)|status\\s*=\\s*1)']},
        {label:'Cleanup runs in finally', re:'finally\\s*\\{[\\s\\S]*?(Arrays\\.fill|wipe\\s*\\()'},
        {label:'Attempts destroy()', re:'\\.destroy\\s*\\('},
        {label:'Constant-time comparison', re:'MessageDigest\\.isEqual'},
      ],
      passOut:['ok:providerIsBC=true','ok:ctLenIs1088=true','ok:secretsMatch=true','ok:cleanedUp=true','q:forced-failure run (provider removed): stderr "KEM failure: NoSuchProviderException", exit 1'],
      model:'See the reference solution (instructor view). Graders look for cleanup in finally rather than after a System.exit that would skip it, one SecureRandom reused, a named constant for 1088, and no secrets printed.' },
  ],
  exit:{
    intro:'A 12-line snippet has no addProvider, calls KeyPairGenerator.getInstance("ML-KEM") with no provider, and never calls initialize.',
    qs:[
      {q:'Predict what happens on JDK 21.0.12 and on the lab\'s JDK 21.0.13.', criteria:[{label:'21.0.12 fails (no provider offers ML-KEM)', any:['nosuchalgorithm','no such algorithm','fail','exception']},{label:'21.0.13 runs on the JDK\'s built-in ML-KEM', any:['built-?in','jdk.{0,12}(own|provider)','sun','default','runs','works']}], model:'21.0.12 throws NoSuchAlgorithmException (no registered provider offers ML-KEM); 21.0.13 runs on the JDK\'s built-in ML-KEM, defaulting to ML-KEM-768.', cells:[['B-02','L4',0.5]]},
      {q:'Name the two lines you would add so it behaves the same on both.', criteria:[{label:'Register BC', any:['addprovider','bouncycastleprovider','insertproviderat']},{label:'Pin "BC" in getInstance', any:['"bc"','\\bbc\\b.{0,20}getinstance','getinstance.{0,30}bc','pin']}], model:'Security.addProvider(new BouncyCastleProvider()) and getInstance("ML-KEM", "BC"); an explicit initialize(ml_kem_768, …) earns a bonus.', cells:[['B-01','L3',0.5],['B-02','L3',0.5]]},
      {q:'Re-read your Hook sentence "My program will be done when…". What would you add now?', ungraded:true},
    ],
  },
};
/* ================================================================
   LESSON 3 — Parameter sets, and the 1088-byte fingerprint
   ================================================================ */
const PARAMAUDIT_STARTER =
`import java.security.*;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public class ParamAudit {
    // TODO a constant table citing FIPS 203: set, spec, category, ciphertext length

    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());
        int minCategory = args.length > 0 ? Integer.parseInt(args[0]) : 3;
        // TODO 1. one CSV row per set: set,category,ctLen,expectedCtLen,ctOk,secretsMatch
        // TODO 2. policy: throw if ML-KEM-768's category < minCategory or any check fails
        // TODO 3. print freshRandomness=
        // TODO 4. flip one ciphertext byte; print tamperDetectedByCompare= and tamperThrew=
        // Exit 1 on GeneralSecurityException, 2 on a failed policy or check.
    }
}`;

const PARAMAUDIT_REF =
`import java.security.*;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public class ParamAudit {
    // FIPS 203: parameter set, NIST security category, ciphertext length in bytes
    record Row(String name, MLKEMParameterSpec spec, int category, int ctLen) {}
    static final Row[] FIPS203 = {
        new Row("ML-KEM-512",  MLKEMParameterSpec.ml_kem_512,  1, 768),
        new Row("ML-KEM-768",  MLKEMParameterSpec.ml_kem_768,  3, 1088),
        new Row("ML-KEM-1024", MLKEMParameterSpec.ml_kem_1024, 5, 1568),
    };
    static final Row REQUIRED = FIPS203[1];
    static final SecureRandom RNG = new SecureRandom();

    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());
        int minCategory = args.length > 0 ? Integer.parseInt(args[0]) : 3;
        try {
            System.out.println("set,category,ctLen,expectedCtLen,ctOk,secretsMatch");
            for (Row r : FIPS203) {
                KeyPair kp = keyPair(r.spec());
                SecretKeyWithEncapsulation s = encapsulate(kp.getPublic());
                boolean match = agrees(s, kp.getPrivate(), s.getEncapsulation());
                int len = s.getEncapsulation().length;
                System.out.println(r.name() + "," + r.category() + "," + len + "," + r.ctLen()
                        + "," + (len == r.ctLen()) + "," + match);
            }
            if (REQUIRED.category() < minCategory) {
                throw new IllegalStateException(REQUIRED.name() + " is category " + REQUIRED.category()
                        + ", policy requires " + minCategory);
            }
            KeyPair kp = keyPair(REQUIRED.spec());
            SecretKeyWithEncapsulation s1 = encapsulate(kp.getPublic());
            byte[] ct = s1.getEncapsulation();
            if (ct.length != REQUIRED.ctLen()) {
                throw new IllegalStateException("ciphertext " + ct.length + " bytes, expected " + REQUIRED.ctLen());
            }
            if (!agrees(s1, kp.getPrivate(), ct)) {
                throw new IllegalStateException("round-trip keys disagree");
            }
            SecretKeyWithEncapsulation s2 = encapsulate(kp.getPublic());
            System.out.println("freshRandomness=" + !Arrays.equals(ct, s2.getEncapsulation()));

            byte[] tampered = ct.clone();
            tampered[0] ^= 0x01;
            boolean threw = false, detected = false;
            try {
                detected = !agrees(s1, kp.getPrivate(), tampered);
            } catch (GeneralSecurityException e) {
                threw = true;
            }
            System.out.println("tamperDetectedByCompare=" + detected);
            System.out.println("tamperThrew=" + threw);
        } catch (GeneralSecurityException e) {
            System.err.println("KEM failure: " + e.getClass().getSimpleName());
            System.exit(1);
        } catch (IllegalStateException e) {
            System.err.println("Check failed: " + e.getMessage());
            System.exit(2);
        }
    }

    static KeyPair keyPair(MLKEMParameterSpec spec) throws GeneralSecurityException {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
        kpg.initialize(spec, RNG);
        return kpg.generateKeyPair();
    }

    static SecretKeyWithEncapsulation encapsulate(PublicKey ek) throws GeneralSecurityException {
        KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", "BC");
        enc.init(new KEMGenerateSpec(ek, "AES", 256), RNG);
        return (SecretKeyWithEncapsulation) enc.generateKey();
    }

    // Test-only comparison: decapsulate ct and compare with the sender's key, wiping both copies.
    static boolean agrees(SecretKey sent, PrivateKey dk, byte[] ct) throws GeneralSecurityException {
        KeyGenerator dec = KeyGenerator.getInstance("ML-KEM", "BC");
        dec.init(new KEMExtractSpec(dk, ct, "AES", 256));
        byte[] a = sent.getEncoded();
        byte[] b = dec.generateKey().getEncoded();
        try {
            return MessageDigest.isEqual(a, b);
        } finally {
            Arrays.fill(a, (byte) 0);
            Arrays.fill(b, (byte) 0);
        }
    }
}`;

LESSONS.L3 = {
  id:'L3', n:3, title:'Parameter sets, and the 1088-byte fingerprint', short:'Parameter sets & fingerprint',
  concepts:['A-04','C-01','C-03','D-05'], minutes:85,
  gate:{label:'B-03 and B-05 Apply ≥ 0.40', cells:[['B-03','L3',0.40],['B-05','L3',0.40]]},
  hint:'Which observable in the output would differ if the property you care about were violated? Look at sizes, not at whether it ran.',
  bans:[{terms:['ml_kem_768','downgrade','implicit rejection','1088'], until:['C1','C2']}],
  instr:{
    misconceptions:[
      '"ML-KEM-512 is insecure." → approved at category 1; the defect is choosing it when the requirement is higher.',
      '"getPublic().getEncoded().length should be 1184." → DER wrapper; show the lengths live.',
      '"assert is how you write checks in Java." → off unless -ea.',
      '"AES-GCM will catch any KEM problem." → it catches disagreement, not a jointly weaker key.',
    ],
  },
  hook:{
    title:'The one-character change',
    blocks:[
      {code:{fn:'Program A', text:'kpg.initialize(MLKEMParameterSpec.ml_kem_768, new SecureRandom());', runs:[{label:'Run A', out:['provider = BC','match    = true','q:exit code 0']}]}},
      {code:{fn:'Program B · commit: "switched to 512 for speed"', text:'kpg.initialize(MLKEMParameterSpec.ml_kem_512, new SecureRandom());', runs:[{label:'Run B', out:['provider = BC','match    = true','q:exit code 0']}]}},
    ],
    vote:{q:'Program B was committed by a teammate. Ship it?', opts:['Yes','No','Can\'t tell']},
    prompt:'Give a one-line reason for your vote.',
    reveal:{
      intro:'What changed:',
      items:[
        'Program B runs ML-KEM at NIST security category 1, comparable to AES-128 key search. Program A runs category 3, comparable to AES-192.',
        'Bouncy Castle accepted the change without a warning, because ML-KEM-512 is a valid, standardised set. Nothing broke; a requirement was silently lowered.',
        'There was a symptom on a line we hid: A prints <code>ctLen = 1088</code>, B prints <code>ctLen = 768</code>.',
      ],
      close:'Today is about learning which lines to look at.',
      src:'SF-01, reproduced on Bouncy Castle 1.79 in the preliminary verification work.',
    },
    instr:'Do not highlight the difference; let students hunt for it. If asked "is 512 insecure?": NIST-approved, but lower than the requirement, so here it is a defect.',
  },
  parts:[
    { id:'P1', title:'What a parameter set is, and how to choose one', concepts:['A-04'],
      bigIdea:'The three ML-KEM parameter sets are the same algorithm turned to three strengths. The API, the code and the output format are identical; only the security level and the sizes change. That is exactly why a wrong choice is invisible unless you look for it.',
      blocks:[
        {table:{head:['','ML-KEM-512','ML-KEM-768','ML-KEM-1024'], rows:[
          ['Module rank k','2','3','4'],
          ['NIST security category','1','3','5'],
          ['Roughly as hard as','AES-128 key search','AES-192 key search','AES-256 key search'],
          ['Encapsulation key','800 B','1184 B','1568 B'],
          ['Decapsulation key (expanded)','1632 B','2400 B','3168 B'],
          ['Ciphertext','768 B','1088 B','1568 B'],
          ['Shared secret','32 B','32 B','32 B'],
        ]}, src:'FIPS 203 via <a href="https://datatracker.ietf.org/doc/draft-ietf-tls-mlkem/09/" target="_blank" rel="noopener">draft-ietf-tls-mlkem</a>; rank and category from the FIPS 203 parameter table.'},
        {p:'Two rows to point at: the shared secret is <b>always 32 bytes</b>, so it cannot tell you which set ran; the ciphertext is <b>different for every set</b>, so it can.'},
        {h:'Where the ciphertext length comes from'},
        {p:'Every polynomial has 256 coefficients. The ciphertext stores k polynomials at d<sub>u</sub> bits per coefficient plus one at d<sub>v</sub> bits, and 256 bits = 32 bytes. So the length is 32 × (d<sub>u</sub>·k + d<sub>v</sub>).'},
        {table:{head:['Set','k','d_u','d_v','Ciphertext = 32 × (d_u·k + d_v)','ek = 384·k + 32'], rows:[
          ['ML-KEM-512','2','10','4','32 × 24 = <b>768</b>','<b>800</b>'],
          ['ML-KEM-768','3','10','4','32 × 34 = <b>1088</b>','<b>1184</b>'],
          ['ML-KEM-1024','4','11','5','32 × 49 = <b>1568</b>','<b>1568</b>'],
        ]}, src:'Parameters from Vargas Martin, <i>Practical Cryptography</i> (2026), Table 9.1; results match FIPS 203.'},
        {h:'What "512 for speed" really buys'},
        {ul:['All three sets are fast on ordinary hardware; for most applications computation is not the bottleneck.','The practical difference is size: 768 sends 384 more bytes of key and 320 more bytes of ciphertext than 512.','So "512 for speed" usually trades a security category for a saving nobody measured. A legitimate 512 is written down, justified and checked.']},
        {h:'How to choose'},
        {table:{head:['Situation','Set','Reason'], rows:[
          ['General applications, web services, this course','ML-KEM-768','Category 3; NIST\'s recommended default (IR 8547, 2026) and the JDK\'s default'],
          ['Secrets kept for decades, high-value targets','ML-KEM-1024','Category 5; extra margin'],
          ['Severely size-constrained devices','ML-KEM-512, by documented decision','Category 1 is standardised, but must be deliberate'],
          ['"I don\'t know"','ML-KEM-768','Safe default'],
        ]}},
        {callout:{title:'Never rely on a default', html:'If code skips <code>initialize(...)</code>, the library picks a set for you. The JDK\'s ML-KEM picks 768, and so does Bouncy Castle 1.79 today, but nothing promises it will stay that way. Defaults differ between libraries and can change between versions. Always state the set, then check it.'}},
      ],
      checks:[
        {q:'Which output never changes between the three sets?', opts:['The 32-byte shared secret length','The ciphertext length','The encapsulation key length','The NIST category'], a:0, why:'K is 32 bytes for every set.'},
        {q:'A medical-records system must protect data for 30 years. Which set?', opts:['ML-KEM-1024','ML-KEM-512','ML-KEM-768 always','Any; they are equivalent'], a:0, why:'Long data lifetime → category 5 margin.'},
        {q:'"We didn\'t call initialize, but it works." What problem does that create?', opts:['The set depends on a library default that can change silently','It will not compile','It always uses ML-KEM-1024','It disables the KDF'], a:0, why:'Defaults differ and move.'},
      ],
      reteach:'Same machine, three dial settings. Turning the dial changes how big the parts are and how hard the machine is to break, and nothing else. Because nothing else changes, the only way to know which setting ran is to measure one of the parts that grows with the dial: the ciphertext.',
      instr:'Ask students to estimate how much faster 512 is before showing the question is the wrong one.',
    },
    { id:'P2', title:'The fingerprint: proving which set ran', concepts:['C-01'],
      bigIdea:'FIPS 203 fixes the ciphertext length for each set: 768, 1088 or 1568 bytes. So ct.length is a cheap, unforgeable statement of which set actually ran. A check on it turns the hook\'s invisible downgrade into a loud failure.',
      blocks:[
        {code:{fn:'reference check', text:'static final int ML_KEM_768_CT = 1088;   // FIPS 203, ML-KEM-768 ciphertext length\n\nbyte[] ct = sent.getEncapsulation();\nif (ct.length != ML_KEM_768_CT) {\n    throw new IllegalStateException(\n        "ciphertext is " + ct.length + " bytes, expected 1088: wrong ML-KEM parameter set");\n}'}},
        {ol:['<b>A named constant with its source</b>, not a bare 1088: a reviewer can check it against FIPS 203 in seconds.','<b>An exception, not a println.</b> A warning scrolls past; an exception stops the program. Java\'s <code>assert</code> is avoided on purpose: assertions are off unless the JVM runs with <code>-ea</code>.','<b>The message says what was found, what was expected and what it means.</b>']},
        {p:'A second, independent witness asks the key which set it belongs to: <code>((MLKEMKey) kp.getPublic()).getParameterSpec().getName()</code>. Two observables agreeing is stronger than one.'},
        {h:'Three traps'},
        {table:{head:['Trap','What students try','What actually happens','Do this instead'], rows:[
          ['Encoded keys are not raw keys','<code>kp.getPublic().getEncoded().length == 1184</code>','Always false: the JCA returns a 1206-byte DER SubjectPublicKeyInfo wrapping the 1184 raw bytes (measured on BC 1.79). BC\'s low-level API does return the raw 1184. Students then delete the "broken" check.','Check the ciphertext, or ask the key for its set name'],
          ['1568 is ambiguous','"1568 bytes, so it\'s the ML-KEM-1024 ciphertext."','For ML-KEM-1024 the ciphertext and the raw encapsulation key are both 1568 bytes.','Label every printed length with its artefact'],
          ['The derived key length says nothing','<code>sent.getEncoded().length == 32</code>','KDF output sized by your request; 32 for every set.','Never use it as evidence of the set'],
          ['The private key is not 2400 bytes either','<code>kp.getPrivate().getEncoded().length == 2400</code>','BC 1.79 stores the private key in its compact seed form: 86 bytes for every set.','Never size-check keys; check the ciphertext or the set name'],
        ]}},
        {h:'A check that never fires is not a check'},
        {p:'A check proves something only if it <b>would fail</b> when the property is violated. Test every check with the <b>two-run rule</b>: run as written (it must pass), then switch the spec to <code>ml_kem_512</code> (it must throw). Try three candidates:'},
        {code:{fn:'candidate 1 · assert', text:'assert ct.length == 1088;', runs:[{label:'spec 768', out:['ok:passes']},{label:'spec 512 (no -ea)', out:['warn:passes — the assert never ran','q:decorative check']}]}},
        {code:{fn:'candidate 2 · encoded key', text:'if (kp.getPublic().getEncoded().length != 1184) throw new IllegalStateException("wrong set");', runs:[{label:'spec 768', out:['exc:IllegalStateException: wrong set','q:fires on the correct set: the DER length is 1206, not 1184']},{label:'spec 512', out:['exc:IllegalStateException: wrong set','q:fires always, proves nothing']}]}},
        {code:{fn:'candidate 3 · ciphertext length', text:'if (ct.length != ML_KEM_768_CT) throw new IllegalStateException("ciphertext is " + ct.length + " bytes");', runs:[{label:'spec 768', out:['ok:passes']},{label:'spec 512', out:['exc:IllegalStateException: ciphertext is 768 bytes','ok:fires exactly when the property is violated']}]}},
      ],
      checks:[
        {q:'Your program prints ctLen = 768. Which set ran?', opts:['ML-KEM-512','ML-KEM-768','ML-KEM-1024','Can\'t tell'], a:0, why:'768 is unique to ML-KEM-512.'},
        {q:'Why is assert ct.length == 1088; a weak check in production?', opts:['Assertions are off unless the JVM runs with -ea','assert is slower than if','assert cannot compare ints','It throws the wrong exception'], a:0, why:'Most deployments never enable -ea.'},
        {q:'A check passes on every run you have ever done. What one experiment shows it works?', opts:['Break the property on purpose (switch to 512) and confirm it throws','Run it 100 more times','Add a println next to it','Review it with a colleague'], a:0, why:'The two-run rule.'},
      ],
      reteach:'A smoke alarm that never sounds might be working or might have no battery. You only know by holding a match under it. The two-run rule is holding a match under your check: deliberately break the property, and the check must go off.',
      instr:'The sandbox applies the two-run rule to B2 automatically; this mirrors the proposal\'s C-01 L3 pass rule.',
    },
    { id:'P3', title:'Silent failure, and the habit that catches it', concepts:['C-03','D-05'],
      bigIdea:'A silent failure compiles, runs, exits 0 and prints plausible output while a security property is violated. You do not find silent failures by waiting for errors. You find them by deciding in advance what should be observable, and checking it.',
      blocks:[
        {table:{head:['Silent failure','Where met','What still looks fine','Observable that exposes it'], rows:[
          ['KDF arguments differ','Lesson 2, B2','runs, no exception','match = false (tests) or AEAD failure (use)'],
          ['Constant-seeded RNG (M1)','Lesson 2, C3','BC, 1088, true','two runs give identical ciphertexts'],
          ['Parameter downgrade (SF-01)','this lesson','BC, true','ctLen = 768; key\'s set name'],
          ['Corrupted ciphertext','this lesson','no exception, exit 0','keys differ; AEAD tag fails'],
          ['Wrong provider or key class (SF-05)','Lesson 4','key labelled "ML-KEM-768"','provider name, key class'],
        ]}},
        {h:'Implicit rejection, now in code'},
        {code:{fn:'tamper demo', text:'byte[] tampered = ct.clone();\ntampered[0] ^= 0x01;                       // flip one bit, as an attacker could\n\nKeyGenerator dec2 = KeyGenerator.getInstance("ML-KEM", "BC");\ndec2.init(new KEMExtractSpec(kp.getPrivate(), tampered, "AES", 256));\nSecretKey bad = dec2.generateKey();        // no exception here\nSystem.out.println("tamperedMatch = " + MessageDigest.isEqual(sent.getEncoded(), bad.getEncoded()));', runs:[
          {label:'Run', out:['warn:tamperedMatch = false','q:no exception · exit code 0']},
          {label:'One byte short', out:['exc:java.lang.ArrayIndexOutOfBoundsException at generateKey()','q:loud, but a runtime exception: catch (GeneralSecurityException) misses it']},
          {label:'One byte too long', out:['warn:tamperedMatch = false','q:no exception: BC 1.79 does not reject the extra byte, so check ct.length yourself']},
        ]}},
        {p:'Real peers never compare keys. They find out when authenticated encryption fails:'},
        {code:{fn:'AEAD makes it loud', text:'Cipher encC = Cipher.getInstance("AES/GCM/NoPadding");\nencC.init(Cipher.ENCRYPT_MODE, sent, new GCMParameterSpec(128, iv));\nbyte[] msg = encC.doFinal("hello Bob".getBytes(StandardCharsets.UTF_8));\n\nCipher decC = Cipher.getInstance("AES/GCM/NoPadding");\ndecC.init(Cipher.DECRYPT_MODE, bad, new GCMParameterSpec(128, iv));\ndecC.doFinal(msg);', runs:[{label:'Run', out:['exc:javax.crypto.AEADBadTagException: Tag mismatch','q:silent at the KEM layer → loud at the next layer']}]}},
        {callout:{title:'One nuance', html:'A genuine decryption failure is also possible, with probability about 2⁻¹⁶⁴ for ML-KEM-768. It looks exactly like implicit rejection, and it is negligible in practice.'}},
        {h:'Two kinds of silent failure'},
        {p:'Implicit rejection is a failure of <b>agreement</b>: the two sides end up with different keys, and AEAD will eventually catch it. SF-01 is a failure of <b>requirement</b>: both sides agree perfectly on a key weaker than specified. Nothing is inconsistent, so AEAD never catches it. Only your own check can.'},
        {h:'The verification habit'},
        {p:'For every security property you depend on, name one observable that would differ if the property were violated, and check it in code.'},
        {table:{head:['Property','Observable','Value if correct','How to check'], rows:[
          ['Correct parameter set','Ciphertext length','1088','<code>if (ct.length != 1088) throw …</code>'],
          ['Correct set (second witness)','Key\'s parameter-spec name','ML-KEM-768 (exact string on BC 1.79)','<code>getParameterSpec().getName()</code>'],
          ['Correct provider','<code>kpg.getProvider().getName()</code>','BC','compare and throw'],
          ['Both sides agree','AEAD round-trip (use) or key comparison (tests)','decrypts; true','GCM decrypt; MessageDigest.isEqual'],
          ['Fresh randomness','Two encapsulations to the same ek','different ciphertexts','<code>!Arrays.equals(ct1, ct2)</code>'],
        ]}},
      ],
      checks:[
        {q:'Bob decapsulated a tampered ciphertext. Which line first reveals the problem?', opts:['The AEAD decrypt (or a test-only key comparison)','Decaps itself','The ciphertext length check','None: it is undetectable'], a:0, why:'Decaps reveals nothing; the next layer does.'},
        {q:'Would AES-GCM catch an SF-01 downgrade?', opts:['No: both sides agree on the weaker key','Yes: the tag would fail','Yes, if the key is 128 bits','Only on JDK 24'], a:0, why:'Requirement failures are consistent.'},
        {q:'Which observable proves your RNG is not constant-seeded?', opts:['Two encapsulations to the same ek give different ciphertexts','ctLen = 1088','match = true','provider = BC'], a:0, why:'Freshness needs two samples.'},
      ],
      reteach:'Sort silent failures into two bins. "The two sides disagree": the next layer (AEAD) eventually notices. "The two sides agree on something wrong": nobody ever notices, unless you wrote a check for that exact property. The verification table is your list of checks for the second bin.',
      instr:'Ask students to sort each row of the first table into "another layer will catch it" vs "only my check will".',
    },
  ],
  exercises:[
    { id:'A1', type:'A', step:'practice', title:'768 → 512', cells:[['A-04','L2',1],['C-01','L2',1]], kind:'explain',
      prompt:'Marker [3] uses <code>MLKEMParameterSpec.ml_kem_768</code>. If you replaced <code>ml_kem_768</code> with <code>ml_kem_512</code>, what would change about the ciphertext, and why? What would not change in the program\'s output?',
      criteria:[
        {label:'Ciphertext goes from 1088 to 768 bytes', all:['1088','768']},
        {label:'Because the parameter set (rank k) changed', any:['parameter set','rank','\\bk\\b','set changed','smaller set','fewer polynomials','fips']},
        {label:'Security category drops (3 → 1)', any:['category','level','weaker','aes-?128','less secure','security']},
        {label:'Names an output that stays the same', any:['match','provider','32','derived key','still true','unchanged','same']},
      ],
      partialAt:2,
      model:'The ciphertext shrinks from 1088 to 768 bytes, because ML-KEM-512 uses module rank 2 instead of 3 and FIPS 203 fixes the length per set. The category drops from 3 to 1. The provider line, the 32-byte derived key and match = true all stay the same.',
      soc:'Run both versions and print ct.length. What else in the output differs?' },
    { id:'A2', type:'A', step:'practice', title:'"match = true, so it\'s correct"', cells:[['C-03','L2',1]], kind:'explain',
      prompt:'A teammate says: "My test prints match = true, so the KEM is correct." Give two different ways the setup could be wrong while that line still prints true, and for each, the line you would add to catch it.',
      criteria:[
        {label:'Downgraded set → check ct.length', any:['512','downgrad','parameter','ct\\.length','1088','length']},
        {label:'Seeded RNG → compare two encapsulations', any:['seed','rng','random','fresh','twice','two run']},
        {label:'Wrong provider → check the provider name', any:['provider','bcpqc','getprovider']},
      ],
      passNeed:2,
      model:'Any two of: downgraded set → check ct.length == 1088; constant-seeded RNG → encapsulate twice and check the ciphertexts differ; wrong provider → check kpg.getProvider().getName() is BC.',
      soc:'Which rows of the silent-failure table still print match = true?' },
    { id:'A3', type:'A', step:'practice', title:'"GCM authenticates everything"', cells:[['C-03','L2',1]], kind:'explain',
      prompt:'Your service uses AES-GCM with the key derived from ML-KEM. A colleague argues: "GCM authenticates everything, so we don\'t need a parameter-set check." Explain precisely which failures GCM would catch and which it would not.',
      criteria:[
        {label:'GCM catches disagreement (tampering, KDF mismatch)', any:['tamper','disagree','mismatch','different key','corrupt','implicit']},
        {label:'GCM misses requirement failures (SF-01, seeded RNG)', any:['downgrad','512','weaker','seed','agree','requirement','both sides']},
      ],
      model:'GCM catches disagreement: a tampered ciphertext under implicit rejection, or mismatched KDF arguments, give different keys and the tag check fails. It cannot catch requirement failures where both sides agree on a weaker or predictable key: SF-01 downgrade, constant-seeded RNG. Those need explicit checks.',
      soc:'In an SF-01 downgrade, do Alice and Bob hold the same key?' },
    { id:'B1', type:'B', step:'practice', title:'Produce a 1088-byte ciphertext', cells:[['A-04','L3',1],['B-03','L3',0.5]], kind:'fill',
      prompt:'Complete the code so it produces a 1088-byte ciphertext.',
      code:'kpg.initialize(MLKEMParameterSpec.{{0}}, new SecureRandom());',
      blanks:[{opts:['ml_kem_512','ml_kem_768','ml_kem_1024'], a:['ml_kem_768'], miss:{ml_kem_512:'ctLen = 768. Which set produces which length? Part 1.', ml_kem_1024:'ctLen = 1568. Which set produces which length? Part 1.'}}],
      passOut:['ok:ctLen = 1088'] },
    { id:'B2', type:'B', step:'practice', title:'Write a check that fires', cells:[['C-01','L3',1]], kind:'mc', codeOpts:true, tworun:true,
      prompt:'Pick the line to put after <code>byte[] ct = sent.getEncapsulation();</code>. The sandbox applies the two-run rule: it must pass with ml_kem_768 and throw with ml_kem_512.',
      opts:[
        'assert ct.length == 1088;',
        'System.out.println("ctLen = " + ct.length);',
        'if (kp.getPublic().getEncoded().length != 1184) throw new IllegalStateException("wrong set");',
        'if (ct.length != ML_KEM_768_CT) throw new IllegalStateException("ciphertext is " + ct.length + " bytes");',
      ], a:3,
      runs:[
        {r768:'passes', r512:'passes (assertions off): never fires'},
        {r768:'prints 1088', r512:'prints 768 and carries on: never stops the program'},
        {r768:'throws: DER length is not 1184', r512:'throws: fires always, proves nothing'},
        {r768:'passes', r512:'throws: ciphertext is 768 bytes'},
      ],
      model:'Option 4: it passes on the correct set and fires exactly when the set is wrong.',
      hint:'Which candidate behaves differently on the two runs?' },
    { id:'B3', type:'B', step:'practice', title:'Prove fresh randomness', cells:[['D-05','L3',1]], kind:'mc', codeOpts:true,
      prompt:'Which line proves the RNG is not constant-seeded? (<code>s1</code> and <code>s2</code> are two encapsulations to the same public key.)',
      opts:[
        'System.out.println("ctDiffers=" + !Arrays.equals(s1.getEncapsulation(), s2.getEncapsulation()));',
        'System.out.println("ctDiffers=" + (s1.getEncapsulation().length == 1088));',
        'System.out.println("ctDiffers=" + MessageDigest.isEqual(s1.getEncoded(), s1.getEncoded()));',
        'System.out.println("ctDiffers=" + (kpg.getProvider() != null));',
      ], a:0,
      model:'Option 1: two encapsulations to the same ek must produce different ciphertexts. A seeded SHA1PRNG rerun prints false.' },
    { id:'B4', type:'B', step:'practice', title:'Derive the fingerprint', cells:[['C-01','L3',1],['A-04','L3',0.5]], kind:'table',
      prompt:'Using only the parameters (ciphertext = 32 × (d<sub>u</sub>·k + d<sub>v</sub>) bytes), fill in each ciphertext length.',
      head:['Set','k','d_u','d_v','Ciphertext (bytes)'],
      rows:[
        ['ML-KEM-512','2','10','4',{input:true,a:'768'}],
        ['ML-KEM-768','3','10','4',{input:true,a:'1088'}],
        ['ML-KEM-1024','4','11','5',{input:true,a:'1568'}],
      ],
      model:'32 × 24 = 768 · 32 × 34 = 1088 · 32 × 49 = 1568. The shared secret is 32 bytes for all three, so it cannot work as a fingerprint.',
      instr:'From the book review (Table 9.1). Students who derive 1088 rarely confuse it with the 32-byte secret again.' },
    { id:'C1', type:'C', step:'diagnose', title:'"Switched to 512 for speed"', cells:[['A-04','L4',1],['C-01','L4',1]], kind:'findline', code:true, flag:'SF-01',
      prompt:'This program passes its test suite (<code>match = true</code>) and prints <code>ctLen = 768</code> among other diagnostics. Should it be merged? Click the line at fault, then explain.',
      lines:[
        'Security.addProvider(new BouncyCastleProvider());',
        'KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");',
        'kpg.initialize(MLKEMParameterSpec.ml_kem_512, new SecureRandom());   // switched to 512 for speed',
        'KeyPair kp = kpg.generateKeyPair();',
        '// ... encapsulate, decapsulate ...',
        'System.out.println("ctLen = " + ct.length);',
        'System.out.println("match = " + MessageDigest.isEqual(a, b));',
      ],
      groups:[[3]],
      mech:{q:'What is wrong, why does it matter, and what would have prevented it?', opts:[
        'Silent downgrade from category 3 to category 1; a ct.length != 1088 check would have failed loudly',
        'ML-KEM-512 is broken and must never be used',
        'The ciphertext is too short to decapsulate',
        'The provider should be BCPQC for speed',
      ], a:0},
      model:'It silently downgraded from ML-KEM-768 (category 3) to ML-KEM-512 (category 1); the 768-byte ciphertext is the evidence. The requirement was lowered with no review. A ct.length != 1088 check (or a set-name check) would have failed loudly.',
      soc:'Your code printed a ciphertext of 768 bytes. What would you expect that number to be for the parameter set this lesson requires?' },
    { id:'C2', type:'C', step:'diagnose', title:'"Decapsulation OK"', cells:[['C-03','L4',1],['A-02','L4',0.5]], kind:'findline', code:true,
      prompt:'A test flips one ciphertext byte; the log says "decapsulation OK". Did decapsulation succeed? Click the misleading line and explain.',
      lines:[
        'try {',
        '    recv = dec.generateKey();',
        '    log.info("decapsulation OK");',
        '} catch (GeneralSecurityException e) {',
        '    log.warn("decapsulation failed, retrying");',
        '    // retry ...',
        '}',
      ],
      groups:[[3]],
      mech:{q:'What is wrong with this logic?', opts:[
        'ML-KEM never throws for a well-sized corrupted ciphertext, so "no exception" does not mean OK; detect mismatch with AEAD or key confirmation',
        'The retry branch should run twice',
        'log.info should be log.warn',
        'generateKey() must be called before init',
      ], a:0},
      model:'ML-KEM never throws for a correctly sized but corrupted ciphertext; it returns a different key. "No exception" is not success, and the retry branch can never run for tampering. Detect mismatch at the next layer (AEAD tag) or with key confirmation, and stop logging success.',
      soc:'When a well-sized ciphertext is corrupted, which branch of this try runs?' },
    { id:'C3', type:'C', step:'diagnose', title:'A check that always fires', cells:[['C-01','L4',1]], kind:'findline', code:true,
      prompt:'There are two separate faults here. Click both lines, then choose both reasons.',
      lines:[
        'try {',
        '    if (kp.getPublic().getEncoded().length != 1184)',
        '        throw new IllegalStateException("wrong key size");',
        '} catch (IllegalStateException e) {',
        '    // TODO: this always fires, investigate later',
        '}',
      ],
      groups:[[2],[4]],
      mech:{q:'Which two faults?', multi:true, opts:[
        'getEncoded() returns a DER SubjectPublicKeyInfo, so its length is never 1184',
        'The exception is swallowed, so the check can never stop the program',
        '1184 is the ciphertext length, not the key length',
        'IllegalStateException is the wrong exception type',
      ], a:[0,1]},
      model:'(1) getEncoded() returns DER, never exactly 1184, so the check always fires. (2) The author "fixed" that by swallowing the exception, so the check can never stop anything. Correct check: if (ct.length != 1088) throw …, with no catch, or the key\'s parameter-spec name.' },
    { id:'D1', type:'D', step:'create', title:'ParamAudit.java', cells:[['A-04','L6',1],['C-01','L6',1],['C-03','L6',1],['D-05','L6',1]], kind:'code',
      prompt:'Write <code>ParamAudit.java</code>. (1) For each of ML-KEM-512, -768 and -1024, print one CSV row <code>set,category,ctLen,expectedCtLen,ctOk,secretsMatch</code> from a constant table citing FIPS 203. (2) Read a minimum category from the first argument (default 3); throw if ML-KEM-768\'s category is below it or any check fails. (3) Print <code>freshRandomness=</code>. (4) Flip one ciphertext byte, decapsulate, print <code>tamperDetectedByCompare=</code> and <code>tamperThrew=</code>. Exit 1 on <code>GeneralSecurityException</code>, 2 on a failed policy or check. Wipe every secret byte array.',
      starter:PARAMAUDIT_STARTER, ref:PARAMAUDIT_REF,
      checks:[
        {label:'Constant table with all three sets and their lengths', all:['ml_kem_512','ml_kem_768','ml_kem_1024','768','1088','1568']},
        {label:'Cites FIPS 203', re:'FIPS\\s*-?\\s*203'},
        {label:'"BC" named in every getInstance', special:'pinned'},
        {label:'Length check throws (no assert)', all:['getEncapsulation\\s*\\(\\s*\\)','throw\\s+new\\s+IllegalStateException'], none:['\\bassert\\b']},
        {label:'Reads the policy argument', re:'args\\s*\\[\\s*0\\s*\\]'},
        {label:'Freshness: compares two encapsulations', re:'freshRandomness='},
        {label:'Tamper: flips a byte and reports both lines', all:['\\^=','tamperDetectedByCompare=','tamperThrew=']},
        {label:'Exit codes 1 and 2', all:['exit\\s*\\(\\s*1\\s*\\)','exit\\s*\\(\\s*2\\s*\\)']},
        {label:'Wipes secret byte arrays', re:'Arrays\\.fill'},
      ],
      passOut:['set,category,ctLen,expectedCtLen,ctOk,secretsMatch','ok:ML-KEM-512,1,768,768,true,true','ok:ML-KEM-768,3,1088,1088,true,true','ok:ML-KEM-1024,5,1568,1568,true,true','ok:freshRandomness=true','ok:tamperDetectedByCompare=true','ok:tamperThrew=false','q:run with argument 5: stderr "Check failed: ML-KEM-768 is category 3, policy requires 5", exit 2'],
      model:'See the reference solution (instructor view).' },
  ],
  exit:{
    intro:'',
    qs:[
      {q:'Your program printed a value of 1568 bytes. List every ML-KEM artefact and set that could have produced it, and the one line you would add to remove the ambiguity.', criteria:[{label:'Names both ML-KEM-1024 artefacts', any:['1024']},{label:'Proposes labelling or a set-name check', any:['label','name','getparameterspec','which artefact','print','ciphertext.{0,20}key|key.{0,20}ciphertext']}], model:'An ML-KEM-1024 ciphertext or an ML-KEM-1024 raw encapsulation key. Label the printed artefact, or print the key\'s parameter-spec name.', cells:[['C-01','L4',0.5]]},
      {q:'Back to the hook: would you ship program B now? Which single check would have stopped it in CI?', criteria:[{label:'No (unless 512 was documented)', any:['\\bno\\b','not ship','wouldn.t','would not','reject']},{label:'A throwing ct.length / set-name check', any:['1088','length','getparameterspec','set name']}], model:'No, unless category 1 was a documented requirement. A ct.length != 1088 (or set-name) check that throws.', cells:[['A-04','L4',0.5]]},
      {q:'Which of today\'s silent failures would an AEAD layer eventually catch, and which only your own checks?', criteria:[{label:'AEAD catches tampering / implicit rejection', any:['tamper','implicit','corrupt','disagree']},{label:'Only own checks catch SF-01', any:['downgrad','512','sf-01','parameter','requirement']}], model:'Implicit rejection (tampering) is caught by AEAD; the SF-01 downgrade only by your own checks.', cells:[['C-03','L4',0.5]]},
    ],
  },
};
/* ================================================================
   LESSON 4 — Same name, different machine
   ================================================================ */
const GUARD_STARTER =
`import java.security.Key;
import org.bouncycastle.jcajce.interfaces.MLKEMKey;

static void requireBcMlKem768(Key k) {
    // TODO reject anything that is not a BC ML-KEM key (name its class in the message)
    // TODO reject any parameter set other than ML-KEM-768 (name the set in the message)
}`;

const GUARD_REF =
`import java.security.Key;
import org.bouncycastle.jcajce.interfaces.MLKEMKey;

static void requireBcMlKem768(Key k) {
    if (!(k instanceof MLKEMKey mk)) {
        throw new IllegalArgumentException(
            "not a BC ML-KEM key: " + (k == null ? "null" : k.getClass().getName()));
    }
    String set = mk.getParameterSpec().getName();
    if (!"ML-KEM-768".equals(set)) {                 // exact string verified on BC 1.79
        throw new IllegalArgumentException("wrong parameter set: " + set);
    }
}`;

const PINNED_STARTER =
`import java.security.*;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.interfaces.MLKEMKey;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public final class PinnedKem {
    private static final String PROVIDER = "BC";
    private static final int CT_LEN = 1088;            // FIPS 203, ML-KEM-768 ciphertext

    public static KeyPair generate() throws GeneralSecurityException {
        // TODO generate with BC only; print provider=; guard both keys
        return null;
    }

    public static SecretKeyWithEncapsulation encapsulate(PublicKey ek) throws GeneralSecurityException {
        // TODO guard first; encapsulate; check the ciphertext length
        return null;
    }

    public static SecretKey decapsulate(PrivateKey dk, byte[] ct) throws GeneralSecurityException {
        // TODO guard first; check the input length; decapsulate
        return null;
    }

    static void requireBcMlKem768(Key k) {
        // TODO your guard from B2
    }

    public static void main(String[] args) {
        // TODO (a) round-trip → roundTripOk=
        // TODO (b) register BCPQC at position 1, make an "ML-KEM-768" key pair through it,
        //          pass its public key to encapsulate → foreignKeyRejected=
        // TODO (c) remove BCPQC afterwards
    }
}`;

const PINNED_REF =
`import java.security.*;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.interfaces.MLKEMKey;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public final class PinnedKem {
    private static final String PROVIDER = "BC";
    private static final String SET = "ML-KEM-768";   // exact string verified on BC 1.79
    private static final int CT_LEN = 1088;            // FIPS 203, ML-KEM-768 ciphertext
    private static final SecureRandom RNG = new SecureRandom();

    public static KeyPair generate() throws GeneralSecurityException {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", PROVIDER);
        kpg.initialize(MLKEMParameterSpec.ml_kem_768, RNG);
        KeyPair kp = kpg.generateKeyPair();
        System.out.println("provider=" + kpg.getProvider().getName());
        requireBcMlKem768(kp.getPublic());
        requireBcMlKem768(kp.getPrivate());
        return kp;
    }

    public static SecretKeyWithEncapsulation encapsulate(PublicKey ek) throws GeneralSecurityException {
        requireBcMlKem768(ek);                                   // guard runs before any BC call
        KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", PROVIDER);
        enc.init(new KEMGenerateSpec(ek, "AES", 256), RNG);
        SecretKeyWithEncapsulation s = (SecretKeyWithEncapsulation) enc.generateKey();
        if (s.getEncapsulation().length != CT_LEN) {
            throw new IllegalStateException("ciphertext " + s.getEncapsulation().length + " bytes, expected " + CT_LEN);
        }
        return s;
    }

    public static SecretKey decapsulate(PrivateKey dk, byte[] ct) throws GeneralSecurityException {
        requireBcMlKem768(dk);
        if (ct == null || ct.length != CT_LEN) {
            throw new IllegalArgumentException("ciphertext must be " + CT_LEN + " bytes");
        }
        KeyGenerator dec = KeyGenerator.getInstance("ML-KEM", PROVIDER);
        dec.init(new KEMExtractSpec(dk, ct, "AES", 256));
        return dec.generateKey();
    }

    static void requireBcMlKem768(Key k) {
        if (!(k instanceof MLKEMKey mk)) {
            throw new IllegalArgumentException(
                "not a BC ML-KEM key: " + (k == null ? "null" : k.getClass().getName()));
        }
        String set = mk.getParameterSpec().getName();
        if (!SET.equals(set)) {
            throw new IllegalArgumentException("wrong parameter set: " + set);
        }
    }

    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());
        try {
            KeyPair kp = generate();
            SecretKeyWithEncapsulation s = encapsulate(kp.getPublic());
            SecretKey r = decapsulate(kp.getPrivate(), s.getEncapsulation());
            byte[] a = s.getEncoded(), b = r.getEncoded();
            System.out.println("roundTripOk=" + MessageDigest.isEqual(a, b));
            Arrays.fill(a, (byte) 0);
            Arrays.fill(b, (byte) 0);

            Security.insertProviderAt(new BouncyCastlePQCProvider(), 1);
            boolean rejected = false;
            try {
                KeyPairGenerator foreign = KeyPairGenerator.getInstance("ML-KEM-768", "BCPQC");
                KeyPair fkp = foreign.generateKeyPair();
                System.out.println("provider=" + foreign.getProvider().getName());
                encapsulate(fkp.getPublic());
            } catch (IllegalArgumentException e) {
                rejected = true;
                System.out.println("guardMessage=" + e.getMessage());
            } catch (NoSuchAlgorithmException e) {
                System.out.println("foreignKeyTest=skipped (BCPQC does not offer ML-KEM-768 in this version)");
            } finally {
                Security.removeProvider("BCPQC");
            }
            System.out.println("foreignKeyRejected=" + rejected);
        } catch (GeneralSecurityException e) {
            System.err.println("KEM failure: " + e.getClass().getSimpleName());
            System.exit(1);
        }
    }
}`;

LESSONS.L4 = {
  id:'L4', n:4, title:'Same name, different machine: providers and provenance', short:'Providers & provenance',
  concepts:['B-02','B-04','C-02','C-04'], minutes:90,
  gate:{label:'B-01, B-02 Apply ≥ 0.40 and C-01 Apply ≥ 0.40', cells:[['B-01','L3',0.40],['B-02','L3',0.40],['C-01','L3',0.40]]},
  hint:'Is the question about who generated the key, who is using it, or which provider answers an unnamed call? Print the provider and the key class.',
  bans:[{terms:['bcpqc'], until:['B1','C1'], modes:['hint','review']}, {terms:['loggingutil'], until:['C2']}],
  instr:{
    misconceptions:[
      '"BC and BCPQC are the same library, so it doesn\'t matter." → the #2230 hook.',
      '"getAlgorithm() says ML-KEM-768, so the key is fine." → label vs substance table.',
      '"My code doesn\'t call insertProviderAt, so the order is fixed." → the list is JVM-global (C2).',
      '"I\'ll catch the InvalidKeyException and retry." → fix it where the key is created.',
    ],
  },
  hook:{
    title:'"Only a ML-KEM-768 private key can be used for unwrapping"',
    story:[
      'A developer on Bouncy Castle 1.83 generated an ML-KEM-768 key pair, used it to encrypt a message in the CMS format, then tried to decrypt their own message. It failed with:',
      '<span class="quote">java.security.InvalidKeyException: Only a ML-KEM-768 private key can be used for unwrapping</span>',
      'The key they passed reported itself as ML-KEM-768.',
    ],
    vote:{q:'The key says it is ML-KEM-768. The error says it needs an ML-KEM-768 key. Who is lying?', opts:['The key','The error message','Nobody','Can\'t tell']},
    prompt:'One sentence of reasoning.',
    reveal:{
      intro:'The maintainer\'s diagnosis:',
      items:[
        'The key pair had been generated through the <b>BCPQC</b> provider, which produced a key of a different internal class.',
        'Decryption ran through the <b>BC</b> provider\'s standard ML-KEM code, which only accepts its own key class.',
        'Both providers were registered, and different steps picked different ones. The fix was to stop registering BCPQC.',
      ],
      close:'Nobody lied. The name was true and still insufficient. Today you learn what would have been sufficient, and how to read that error in a minute instead of a day.',
      src:'<a href="https://github.com/bcgit/bc-java/issues/2230" target="_blank" rel="noopener">bc-java #2230</a> (Bouncy Castle 1.83, through CMS. On the lab\'s 1.79 the same mix-up fails as a ClassCastException; see C1.)',
    },
    instr:'Same pattern as the thesis\'s SF-05: silent when the key is generated, loud only when it is used.',
  },
  parts:[
    { id:'P1', title:'Two providers, one name', concepts:['B-04'],
      bigIdea:'Bouncy Castle ships two JCA providers. One holds standardised algorithms, the other experimental and pre-standard ones. Because post-quantum algorithms became standard only recently, similar names have lived in both, and what each name means has changed between releases. The only safe policy is to choose one provider deliberately and verify it.',
      blocks:[
        {table:{head:['','BC','BCPQC'], rows:[
          ['Class','<code>org.bouncycastle.jce.provider.BouncyCastleProvider</code>','<code>org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider</code>'],
          ['Purpose','Standardised algorithms','Experimental and pre-standard algorithms'],
          ['Naming style','NIST names: "ML-KEM", "ML-DSA-65"','Original names: "Kyber", "Dilithium"'],
          ['ML-KEM status','Added in 1.79','In 1.79 it already answers to "ML-KEM", "ML-KEM-768" and "Kyber", but with its own key class (BCKyberPublicKey)'],
          ['In this course','<b>Always</b>','<b>Never</b> registered'],
        ]}},
        {h:'How the boundary moved'},
        {table:{head:['Release','What a maintainer or report showed','Source'], rows:[
          ['1.79 (Oct 2024)','ML-KEM added to the BC provider and the lightweight API','release notes'],
          ['Mar 2025 (issue on 1.79/1.80)','A maintainer: "Kyber in the BCPQC provider is simply an alias for ML-KEM"','<a href="https://github.com/bcgit/bc-java/issues/2037" target="_blank" rel="noopener">#2037</a>'],
          ['1.79 (this lab, measured)','BCPQC "ML-KEM-768" returns a BCKyberPublicKey; BC refuses it with ClassCastException. With BCPQC registered first, an unpinned "ML-KEM" answers BCPQC with a 1024 key by default','lab VM checks'],
          ['1.83','BCPQC still answers to "ML-KEM-768" but returns a different key class; mixing fails','<a href="https://github.com/bcgit/bc-java/issues/2230" target="_blank" rel="noopener">#2230</a>'],
        ]}},
        {callout:{title:'Documentation drifts too', html:'One 2026 textbook says ML-KEM replaced Kyber "starting with Bouncy Castle 1.83", while its own benchmark listing, also tested on 1.83, still calls <code>getInstance("Kyber", "BCPQC")</code>. The release notes say ML-KEM arrived in 1.79. Trust primary sources and, above all, observed behaviour: print the provider and the key class.'}},
        {callout:{title:'Rule 1', html:'Register only BC for ML-KEM, and name <code>"BC"</code> in every <code>getInstance</code>. Do not register BCPQC "just in case": registering it is what made #2230 possible.'}},
        {h:'Why a name is not enough'},
        {p:'A key object carries a <i>label</i> (<code>getAlgorithm()</code>), but the code that will accept it is decided by its <i>class</i>. Two providers can both label a key "ML-KEM-768" while implementing it as different Java classes. BC\'s ML-KEM code checks the class before using a key. Two keys both stamped "Front Door" can be cut for different locks.'},
        {table:{head:['','Label','Substance'], rows:[
          ['What it is','The name a key reports','The class and provider that implement it'],
          ['How you read it','<code>key.getAlgorithm()</code>','<code>key.getClass().getName()</code>, <code>instanceof</code>, provider name'],
          ['Can two providers give the same value?','Yes','No'],
          ['Proves compatibility?','No','Yes'],
        ]}},
      ],
      checks:[
        {q:'Which Bouncy Castle provider holds the standardised ML-KEM?', opts:['BC','BCPQC','Both equally','Neither; the JDK does'], a:0, why:'BC holds NIST-standard algorithms.'},
        {q:'Why does this course forbid registering BCPQC, even if no getInstance names it?', opts:['Unpinned calls or libraries could still pick it up; registration alone creates the risk','It slows the JVM','It is not open source','It conflicts with JDK 21'], a:0, why:'The provider list is global.'},
        {q:'Two keys both return "ML-KEM-768" from getAlgorithm(). Are they interchangeable?', opts:['Not necessarily: their classes and providers may differ','Yes: same algorithm name','Yes, if both are 1184 bytes','Only on JDK 24'], a:0, why:'Label is not substance.'},
      ],
      reteach:'Two shops sell a product with the same name. One sells the certified version, the other an earlier prototype that looks identical. The label on the box is true in both shops. The only way to know which you hold is to check where it came from and what is actually inside: the provider and the class.',
      instr:'Do not ask students to memorise the release timeline; the point is that the answer depends on the version.',
    },
    { id:'P2', title:'Provider order and silent routing', concepts:['B-02'],
      bigIdea:'An unpinned getInstance returns whichever provider is first in a global list. That list can be changed by code you never read, a library you depend on, or a JDK upgrade. None of those changes produce an error.',
      blocks:[
        {ol:['The provider list is <b>global to the JVM</b>. Any class, including one inside a dependency, can change it.','<code>Security.addProvider(p)</code> appends at the <b>lowest</b> priority; <code>Security.insertProviderAt(p, 1)</code> puts a provider <b>first</b>; <code>Security.removeProvider("BCPQC")</code> removes one.','<code>getInstance("ML-KEM")</code> with no provider asks each provider in order and returns the first that offers the service.','<code>getInstance("ML-KEM", "BC")</code> ignores the order entirely.']},
        {code:{fn:'unpinned on purpose', text:'KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM");   // deliberately unpinned\nSystem.out.println("answered by: " + kpg.getProvider().getName());'}},
        {routing:true},
        {h:'Where reordering hides in real code'},
        {ul:['A static initialiser in a utility class: <code>static { Security.insertProviderAt(...); }</code>, run the first time the class is touched.','A dependency that registers its own provider when it loads.','A framework that configures providers from a <code>java.security</code> file.','A JDK upgrade that adds a built-in implementation.']},
        {callout:{title:'Rule 2', html:'Pin <code>"BC"</code> in every <code>getInstance</code> <i>and</i> check <code>getProvider().getName()</code> once at startup. The pin decides; the check proves.'}},
      ],
      checks:[
        {q:'Configuration A (BC appended) answered BC on JDK 21.0.12. What changes, with no code edit, after the routine update to 21.0.13?', opts:['The JDK\'s built-in ML-KEM answers instead of BC','Nothing','The program fails to start','BCPQC answers'], a:0, why:'The built-in provider sits earlier in the list.'},
        {q:'A logging library calls insertProviderAt(somePqcProvider, 1) in a static block. Which of your calls are affected?', opts:['Every unpinned getInstance for algorithms that provider offers','Every call, pinned or not','Only calls inside the logging library','None'], a:0, why:'Pinned calls ignore the order.'},
        {q:'Why must each routing configuration run in a fresh JVM?', opts:['The provider list is global; earlier changes would carry over','The JDK caches algorithm names','BC can only be registered once per day','It does not need to'], a:0, why:'Global state persists within a JVM.'},
      ],
      reteach:'An unnamed getInstance is "give me whoever answers first". The queue of who answers first is shared by the whole program and can be rearranged by any code that runs before you. Naming the provider skips the queue.',
      instr:'Measured on the lab VM: BCPQC 1.79 does answer to "ML-KEM", with a 1024 key by default. Point it out: the unpinned call silently changed the key size and picked a key class BC rejects.',
    },
    { id:'P3', title:'Proving provenance and reading a loud failure', concepts:['C-02','C-04'],
      bigIdea:'For keys you generate, pinning the provider is enough. For keys that arrive (loaded from a file, received from another module, passed into your method), check what they are before using them. When a mix-up slips through, the stack trace already tells you what happened, if you ask it four questions.',
      blocks:[
        {table:{head:['Check','Code','Proves','Cannot prove'], rows:[
          ['Algorithm label','<code>key.getAlgorithm()</code>','What the key calls itself','Which code made it, or whether BC will accept it'],
          ['Generator provider','<code>kpg.getProvider().getName()</code>','Which provider generated keys <i>you</i> made','Anything about keys that arrive'],
          ['Implementation class','<code>key instanceof MLKEMKey</code>','BC\'s ML-KEM code will accept it','Which parameter set it uses'],
          ['Parameter set','<code>((MLKEMKey) key).getParameterSpec().getName()</code>','The key\'s set','—'],
        ]}},
        {p:'<b>Class proves compatibility; set proves strength.</b> A guard needs both. <code>MLKEMKey</code> is <code>org.bouncycastle.jcajce.interfaces.MLKEMKey</code>.'},
        {code:{fn:'provenance guard', text:GUARD_REF}},
        {ul:['Run it <b>before</b> any crypto call, so the failure is your clear message, not BC\'s exception three layers down.','<code>IllegalArgumentException</code>: a foreign key passed to your method is a caller\'s programming error.','Name the class in the message: that is exactly the fact the person debugging needs.']},
        {h:'The four-question ladder'},
        {code:{fn:'stack trace from #2230', text:'org.bouncycastle.cms.CMSException: exception unwrapping key: ...\nCaused by: java.security.InvalidKeyException: Only a ML-KEM-768 private key can be used for unwrapping\n    at org.bouncycastle.jcajce.provider.asymmetric.mlkem.MLKEMCipherSpi.engineInit(Unknown Source)'}},
        {table:{head:['#','Question','What the trace answers'], rows:[
          ['1','Which exception class?','<code>InvalidKeyException</code>: the algorithm exists and the provider is registered; the <i>key</i> was refused'],
          ['2','Which provider\'s code threw?','<code>…asymmetric.mlkem.MLKEMCipherSpi</code> is BC\'s standard ML-KEM code'],
          ['3','What class was the key?','Not in the trace: print <code>key.getClass().getName()</code>. In #2230 it was a Kyber-family class from BCPQC'],
          ['4','Where was the key created?','Search every <code>getInstance</code> and every <code>addProvider</code> / <code>insertProviderAt</code>'],
        ]}},
        {p:'Read the last <code>Caused by:</code> line first. The outer exception only says which layer noticed.'},
        {table:{head:['Exception','Meaning','Most likely cause','First fix'], rows:[
          ['<code>NoSuchProviderException</code>','Named provider not registered','BC never added (BM-1)','addProvider before first use'],
          ['<code>NoSuchAlgorithmException</code>','Provider does not offer that name','BCPQC-style name asked of BC, or the reverse','Use the NIST name with BC'],
          ['<code>NullPointerException</code> at <code>generateKeyPair</code>','Wrong kind of spec (BC 1.79)','Classical spec passed to ML-KEM','Use the ML-KEM spec classes'],
          ['<code>ClassCastException</code> (1.79) or <code>InvalidKeyException</code> (1.83)','Right algorithm, unacceptable key','Key from another provider (SF-05)','Check the class; fix at the creation site'],
        ]}},
        {callout:{title:'Fixing SF-05', html:'Fix it where the key is <b>created</b>, never by catching the exception where it is <b>used</b>. Catching it hides the mix-up and leaves the wrong provider in place.'}},
      ],
      checks:[
        {q:'Which single check proves BC\'s ML-KEM code will accept a key?', opts:['instanceof MLKEMKey','getAlgorithm()','getEncoded().length','getFormat()'], a:0, why:'The implementation class decides acceptance.'},
        {q:'Your guard passes, but the key is ML-KEM-512. Which line should have caught it?', opts:['The parameter-set check inside the guard','The instanceof check','The provider check','None could'], a:0, why:'Class proves compatibility, not strength.'},
        {q:'A trace ends in InvalidKeyException thrown from a BC …mlkem…Spi class. What do you print next?', opts:['The key\'s class name','The ciphertext length','The JDK version','The full key bytes'], a:0, why:'Ladder question 3.'},
      ],
      reteach:'When a door will not open, ask four questions in order: what did the lock say (exception class), whose lock is it (provider frame), whose key is this (key class), and where was the key cut (getInstance). The answer to the last one is where the fix goes.',
      instr:'Climb the ladder on the #2230 trace with the class before C1.',
    },
  ],
  exercises:[
    { id:'A1', type:'A', step:'practice', title:'A key that says ML-KEM-768', cells:[['C-02','L2',1]], kind:'explain',
      prompt:'A key prints <code>getAlgorithm() = ML-KEM-768</code>. Describe one concrete way BC\'s ML-KEM code could still reject it, and the single line you would add before using the key to find out.',
      criteria:[
        {label:'Generated by another provider or class', any:['bcpqc','other provider','another provider','different class','different provider','kyber','foreign']},
        {label:'A class-level check, not another label check', any:['instanceof','getclass','class name','mlkemkey']},
      ],
      model:'It could have been generated by another provider (e.g. BCPQC) as a different key class; BC checks the class and throws InvalidKeyException. Add if (!(key instanceof MLKEMKey)) throw …, or print key.getClass().getName().',
      soc:'Two keys print the same label. What property of the Java object could still differ?' },
    { id:'A2', type:'A', step:'practice', title:'Upgrading the lab VM', cells:[['B-02','L2',1],['B-04','L2',0.5]], kind:'explain',
      prompt:'Your program calls <code>Security.addProvider(new BouncyCastleProvider())</code> and later <code>KeyPairGenerator.getInstance("ML-KEM")</code> with no provider. Nothing in your code changes, but the VM gets the routine October 2026 update from JDK 21.0.12 to 21.0.13. Explain what happens and why no error appears.',
      criteria:[
        {label:'The JDK\'s built-in ML-KEM answers instead', any:['built-?in','jdk.{0,12}(own|provider|implementation)','sun','jep']},
        {label:'Because of the provider list order', any:['order','first','earlier','list','append','lowest']},
        {label:'Silent because both implementations work', any:['silent','no error','both work','valid','still runs','works']},
      ],
      passNeed:2,
      model:'After the update the JDK\'s own ML-KEM (SunJCE) sits earlier in the list than the appended BC, so it answers the unpinned call. It is a valid implementation, so everything runs; a patch release has silently switched libraries. Pinning "BC" prevents it.',
      soc:'Where in the provider list does addProvider put BC?' },
    { id:'A3', type:'A', step:'practice', title:'The wrong fix', cells:[['C-04','L2',1]], kind:'explain',
      prompt:'A teammate fixes an <code>InvalidKeyException</code> from BC\'s ML-KEM code by catching it and generating a new key pair with <code>getInstance("ML-KEM", "BC")</code> inside the catch block. The program now works. Why is this the wrong fix?',
      criteria:[
        {label:'The fix belongs where the key is created', any:['creat','generation site','source','where the key','at the getinstance','root cause']},
        {label:'Names a concrete harm of catching', any:['hide','mask','other path','peer','old public key','still wrong','breaks','wrong provider']},
      ],
      model:'It hides the cause: the original key still comes from the wrong provider, so other code paths using it will fail or silently use the wrong implementation. Regenerating also breaks any peer that already has the old public key. Pin "BC" where the key is created and stop registering BCPQC.',
      soc:'After your catch block regenerates a key, which code still holds the old one?' },
    { id:'B1', type:'B', step:'practice', title:'Register and pin', cells:[['B-04','L3',1],['B-02','L3',1]], kind:'fill',
      prompt:'Fill the blanks so only BC is used. The sandbox pre-registers BCPQC at position 1 before running your code, so any unpinned call will be caught.',
      code:'Security.{{0}}(new {{1}}());\nKeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", {{2}});\nKeyGenerator enc     = KeyGenerator.getInstance("ML-KEM", {{3}});',
      blanks:[
        {opts:['addProvider','removeProvider'], a:['addProvider']},
        {opts:['BouncyCastleProvider','BouncyCastlePQCProvider'], a:['BouncyCastleProvider']},
        {opts:['"BC"','"BCPQC"','(no second argument)'], a:['"BC"'], miss:{'(no second argument)':'The harness put another provider first; your unpinned call listened to it.'}},
        {opts:['"BC"','"BCPQC"','(no second argument)'], a:['"BC"'], miss:{'(no second argument)':'The harness put another provider first; your unpinned call listened to it.'}},
      ],
      passOut:['ok:answered by: BC','ok:answered by: BC'],
      hint:'Which of your calls listened to the provider the harness put first?' },
    { id:'B2', type:'B', step:'practice', title:'Write the provenance guard', cells:[['C-02','L3',1]], kind:'code', small:true,
      prompt:'Write the body of <code>requireBcMlKem768</code>. The harness passes three keys: a BC ML-KEM-768 key (accept), a BC ML-KEM-512 key (reject, naming the set) and a non-BC key (reject, naming the class).',
      starter:GUARD_STARTER, ref:GUARD_REF,
      checks:[
        {label:'Class check with instanceof MLKEMKey', re:'instanceof\\s+MLKEMKey'},
        {label:'Message names the key\'s class', re:'getClass\\s*\\(\\s*\\)\\s*\\.\\s*getName'},
        {label:'Reads the parameter set', re:'getParameterSpec\\s*\\(\\s*\\)\\s*\\.\\s*getName'},
        {label:'Compares with "ML-KEM-768"', re:'"ML-KEM-768"'},
        {label:'Rejects with IllegalArgumentException', re:'throw\\s+new\\s+IllegalArgumentException'},
      ],
      passOut:['ok:BC ML-KEM-768 key  → accepted','ok:BC ML-KEM-512 key  → IllegalArgumentException: wrong parameter set: ML-KEM-512','ok:non-BC key         → IllegalArgumentException: not a BC ML-KEM key: org.bouncycastle.pqc.jcajce.provider.kyber.BCKyberPublicKey'],
      hint:'Class proves compatibility. What proves strength?' },
    { id:'C1', type:'C', step:'diagnose', title:'Climb the ladder', cells:[['B-04','L4',1],['C-02','L4',1],['C-04','L4',0.5]], kind:'multimc', flag:'SF-05',
      prompt:'The key generation log reads <code>[keygen] generated key pair, algorithm=ML-KEM-768</code>. Encryption then fails with <code>ClassCastException: BCKyberPublicKey cannot be cast to BCMLKEMPublicKey</code> (the lab\'s Bouncy Castle 1.79; version 1.83 reports the same mix-up as an InvalidKeyException). In the source, <code>KeyStoreHelper</code> calls <code>KeyPairGenerator.getInstance("ML-KEM-768", "BCPQC")</code>; encryption uses BC. Answer the four ladder questions.',
      qs:[
        {q:'1 · What does the exception class tell you?', opts:['BC\'s ML-KEM code received a key object of a class it cannot use','The provider is not registered','The parameter spec is wrong','The ciphertext is corrupt'], a:0},
        {q:'2 · Whose code threw?', opts:['BC\'s standard ML-KEM implementation','BCPQC\'s Kyber implementation','The JDK\'s SunJCE','The CMS library only'], a:0},
        {q:'3 · What will key.getClass().getName() show?', opts:['BCKyberPublicKey, a BCPQC class, not an MLKEMKey','BCMLKEMPrivateKey','java.security.PrivateKey','ML-KEM-768'], a:0},
        {q:'4 · Where does the fix go?', opts:['Change KeyStoreHelper\'s getInstance to "BC" and stop registering BCPQC','Catch the InvalidKeyException and retry','Switch encryption to BCPQC as well','Increase the key size'], a:0},
      ],
      model:'(1) ClassCastException: BC\'s ML-KEM code got a key class it cannot use (1.83 calls the same mix-up an InvalidKeyException). (2) BC\'s ML-KEM code threw. (3) BCKyberPublicKey, a BCPQC class, not an MLKEMKey. (4) Fix at the creation site: getInstance(…, "BC") in KeyStoreHelper and remove the BCPQC registration. Catching the exception earns no credit.',
      soc:'Two providers are involved. Which one created the key, and which one is using it?' },
    { id:'C2', type:'C', step:'diagnose', title:'Everything passes', cells:[['B-02','L4',1]], kind:'findline', code:true,
      prompt:'The round-trip passes. One debug line prints <code>provider = BCPQC</code>. Find what changed which code is running.',
      lines:[
        'public final class LoggingUtil {',
        '    static { Security.insertProviderAt(new BouncyCastlePQCProvider(), 1); }   // "needed for legacy signatures"',
        '    public static void info(String msg) { System.out.println("[info] " + msg); }',
        '}',
        '',
        'public class App {',
        '    public static void main(String[] args) throws Exception {',
        '        Security.addProvider(new BouncyCastleProvider());',
        '        LoggingUtil.info("starting");',
        '        KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM");',
        '        System.out.println("provider = " + kpg.getProvider().getName());',
        '    }',
        '}',
      ],
      groups:[[2],[10]],
      mech:{q:'How did it happen, and what makes the program immune?', opts:[
        'LoggingUtil\'s static initialiser puts BCPQC first when the class is first used; pin "BC" in every getInstance and check the provider at startup',
        'addProvider in main put BCPQC first; remove it',
        'The JDK upgrade changed the default; downgrade the JDK',
        'getProvider() is lying; print getAlgorithm() instead',
      ], a:0},
      model:'The static initialiser in LoggingUtil runs when the class is first touched and puts BCPQC first; the unpinned getInstance then picks BCPQC. Pin "BC", add a startup provider check, and ask why a logging class registers a crypto provider.',
      soc:'Which line runs before the getInstance call and could change the provider list?' },
    { id:'C3', type:'C', step:'diagnose', title:'Three traces in six minutes', cells:[['C-04','L4',1]], kind:'table', timed:360,
      prompt:'For each anonymised trace, fill one row of the lookup card.',
      head:['Trace','Meaning','Provider that threw','First fix'],
      rows:[
        ['<code>NoSuchProviderException: no such provider: BC</code>',{opts:['Provider not registered','Wrong kind of spec','Key class refused'],a:'Provider not registered'},{opts:['none: lookup failed','BC','BCPQC'],a:'none: lookup failed'},{opts:['addProvider before first use','Use MLKEMParameterSpec','Print key class; fix creation site'],a:'addProvider before first use'}],
        ['<code>NullPointerException: … "this.mlkemParams" is null</code> from <code>generateKeyPair</code>',{opts:['Provider not registered','Wrong kind of spec','Key class refused'],a:'Wrong kind of spec'},{opts:['none: lookup failed','BC','BCPQC'],a:'BC'},{opts:['addProvider before first use','Use MLKEMParameterSpec','Print key class; fix creation site'],a:'Use MLKEMParameterSpec'}],
        ['<code>ClassCastException: BCKyberPublicKey cannot be cast to BCMLKEMPublicKey</code>',{opts:['Provider not registered','Wrong kind of spec','Key class refused'],a:'Key class refused'},{opts:['none: lookup failed','BC','BCPQC'],a:'BC'},{opts:['addProvider before first use','Use MLKEMParameterSpec','Print key class; fix creation site'],a:'Print key class; fix creation site'}],
      ],
      partialRows:2,
      model:'Not registered / none / addProvider · wrong spec / BC / MLKEMParameterSpec · key class refused / BC / print class and fix the creation site.' },
    { id:'D1', type:'D', step:'create', title:'PinnedKem.java', cells:[['B-02','L6',1],['B-04','L6',1],['C-02','L6',1],['C-04','L6',1]], kind:'code',
      prompt:'Write <code>PinnedKem.java</code> with <code>generate()</code>, <code>encapsulate(PublicKey)</code> and <code>decapsulate(PrivateKey, byte[])</code>. (1) Every method uses only BC, by name. (2) Every method that receives a key runs a provenance guard first, rejecting anything that is not a BC ML-KEM-768 key with an <code>IllegalArgumentException</code> naming the class or set. (3) Check the ciphertext is 1088 bytes on both sides. (4) <code>generate</code> prints <code>provider=</code>. (5) <code>main</code> runs a round-trip (<code>roundTripOk=true</code>), then registers BCPQC at position 1, makes an "ML-KEM-768" key pair through it, passes its public key to <code>encapsulate</code>, prints <code>foreignKeyRejected=true</code> when your guard rejects it, and removes BCPQC afterwards.',
      starter:PINNED_STARTER, ref:PINNED_REF, allowBCPQC:true,
      checks:[
        {label:'"BC" (or the PROVIDER constant) in every BC getInstance', special:'pinnedOrConst'},
        {label:'Guard with instanceof MLKEMKey', re:'instanceof\\s+MLKEMKey'},
        {label:'Guard reads the parameter set', re:'getParameterSpec\\s*\\(\\s*\\)\\s*\\.\\s*getName'},
        {label:'Guard runs before the BC call in encapsulate', special:'guardFirst'},
        {label:'Ciphertext length checked on both sides', count:['CT_LEN|1088',3]},
        {label:'Prints provider=, roundTripOk= and foreignKeyRejected=', all:['provider=','roundTripOk=','foreignKeyRejected=']},
        {label:'Registers BCPQC at position 1 for the test, then removes it', all:['insertProviderAt\\s*\\(\\s*new\\s+BouncyCastlePQCProvider\\s*\\(\\s*\\)\\s*,\\s*1','removeProvider\\s*\\(\\s*"BCPQC"']},
      ],
      passOut:['ok:provider=BC','ok:roundTripOk=true','provider=BCPQC','ok:guardMessage=not a BC ML-KEM key: org.bouncycastle.pqc.jcajce.provider.kyber.BCKyberPublicKey','ok:foreignKeyRejected=true','q:measured on JDK 21 + Bouncy Castle 1.79'],
      model:'See the reference solution (instructor view).' },
  ],
  exit:{
    intro:'',
    qs:[
      {q:'Fill the blanks in the #2230 diagnosis: "You are generating the key from the ___ factory, but decryption picks up the ___ implementation because ___ is ahead of ___ in the search order."', criteria:[{label:'BCPQC generated; BC decrypted and comes first', all:['bcpqc','bc']}], model:'BCPQC; BC; BC; BCPQC.', cells:[['B-04','L4',0.5]]},
      {q:'Write the two lines of code that would have made #2230 impossible.', criteria:[{label:'Register only BC / no BCPQC', any:['bouncycastleprovider','no bcpqc','remove','only bc','addprovider']},{label:'Pin "BC" at key generation or guard with instanceof', any:['"bc"','instanceof','mlkemkey','getinstance']}], model:'Register only BC (no BouncyCastlePQCProvider), and getInstance("ML-KEM", "BC") at key generation; an instanceof MLKEMKey guard earns a bonus.', cells:[['C-02','L4',0.5]]},
      {q:'Return to your hook answer: who was "lying"? Has your answer changed?', ungraded:true},
    ],
  },
};

/* ---------------- Placeholder lessons ---------------- */
LESSONS.L5 = { id:'L5', n:5, title:'Integration audit', short:'Integration audit', placeholder:true,
  concepts:['B-04','C-02','C-03','D-05'],
  outline:'Audit an unfamiliar multi-file Java project for every misuse class taught in Lessons 1–4. Planned, not yet authored.' };
LESSONS.L6 = { id:'L6', n:6, title:'Capstone', short:'Capstone', placeholder:true,
  concepts:['C-01','C-02','C-03','D-05','B-05'],
  outline:'Build and defend a small KEM-based file-encryption tool against a hidden misuse test suite. Planned, not yet authored.' };

/* lesson minutes come from the per-step estimates in catalog.js (LESSON_TIME) */
Object.keys(LESSON_TIME).forEach(L => { if(LESSONS[L]) LESSONS[L].minutes = lessonMinutes(L); });
