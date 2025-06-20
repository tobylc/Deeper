export interface RoleSpecificQuestions {
  [relationshipType: string]: {
    [role: string]: string[];
  };
}

export const roleSpecificQuestions: RoleSpecificQuestions = {
  "Parent-Child": {
    "Father": [
      "What mistake did I make as a father that I wish I could apologize for or explain?",
      "What fear do I have about our relationship that I've never voiced?",
      "How did my own father's parenting affect me in ways I might have passed on to you?",
      "What aspect of your adult life makes me worry about you most, and why?",
      "What's something I'm struggling with personally that I think you should know about?",
      "When have I felt most proud of you in a way I never properly expressed?",
      "What conversation have I been avoiding having with you because it feels too difficult?",
      "How has watching you become an adult forced me to confront my own mortality or aging?",
      "What do I wish I had done differently during your childhood that still weighs on me?",
      "What aspect of my own character or past do I hope you understand rather than judge?"
    ],
    "Mother": [
      "What fear about motherhood or my parenting do I carry that I've never shared with you?",
      "What sacrifice I made for our family do I sometimes resent, and how has that affected me?",
      "When did I feel most lost or overwhelmed as your mother, and what did I learn from that?",
      "What part of my own mother's parenting do I see reflected in myself that worries me?",
      "What aspect of your adult life triggers my deepest maternal anxieties?",
      "What moment of your childhood do I wish I could have handled completely differently?",
      "What's something about my own struggles with womanhood that I think you should understand?",
      "How has my relationship with your father affected you in ways I'm afraid to acknowledge?",
      "What conversation about family, relationships, or life have I been too scared to start with you?",
      "What do I need from our adult relationship that I don't know how to ask for?"
    ],
    "Son": [
      "What do I struggle with as a man that I'm afraid to admit to you?",
      "How did your parenting affect my confidence or self-worth in ways you might not realize?",
      "What aspect of my adult life do I feel like I'm failing at that I need your perspective on?",
      "What fear do I have about becoming like you, or not living up to your expectations?",
      "What's something about my relationships or choices that I've been afraid to tell you?",
      "How do I deal with pressure to be 'successful' when I'm not sure what that means anymore?",
      "What part of your past or your struggles do I need to understand to know you better as a person?",
      "What conversation between us feels overdue but too difficult to start?",
      "How do I handle feeling like I've disappointed you, even when you haven't said so?",
      "What do I need to know about your own failures or regrets to feel less alone in mine?"
    ],
    "Daughter": [
      "What do I struggle with as a woman that I'm embarrassed to ask you about?",
      "How did growing up in our family affect my self-image or confidence in ways you might not see?",
      "What pattern from your life am I repeating that I don't want to continue?",
      "What fear do I have about my relationships or future that I need your honest insight on?",
      "What aspect of your marriage or relationship choices do I need to understand better?",
      "How do I handle the pressure of being a 'good daughter' while living my own life?",
      "What sacrifice or struggle of yours do I take for granted that I should acknowledge?",
      "What conversation about womanhood, family, or expectations feels too vulnerable to have?",
      "How do I deal with feeling like I can't live up to your strength or what you've accomplished?",
      "What do I need to know about your mistakes or regrets to feel less afraid of making my own?"
    ]
  },
  "Romantic Partners": {
    "Boyfriend": [
      "What fear do I have about our relationship that I haven't shared with you?",
      "What part of my past still affects how I love you that you should know about?",
      "What do I need from you emotionally that I'm afraid to ask for?",
      "What insecurity do I have about myself in our relationship?",
      "What conversation about our future scares me but feels necessary?",
      "How do I handle my feelings when I think you might be losing interest?",
      "What aspect of physical or emotional intimacy do I struggle with but haven't discussed?",
      "What do I compare our relationship to that might be unfair or harmful?",
      "What sacrifice would I be willing to make for you that you don't know about?",
      "What doubt about us do I have that I wish you could help me resolve?"
    ],
    "Girlfriend": [
      "What vulnerability about myself am I afraid to show you?",
      "What part of love or relationships confuses or scares me that I need your patience with?",
      "What do I need to feel secure with you that I haven't been able to express?",
      "What fear do I have about losing myself in this relationship?",
      "What conversation about commitment or our future feels too scary to start?",
      "How do I handle feeling jealous or insecure in ways that might hurt us?",
      "What expectation do I have of you that might be unfair but feels important to me?",
      "What part of my emotional needs feels too needy or demanding to share?",
      "What do I struggle with physically or emotionally that affects our intimacy?",
      "What doubt or fear about love do I carry from my past that impacts how I love you?"
    ],
    "Husband": [
      "What part of marriage do I struggle with that I haven't admitted to you?",
      "What fear do I have about our future together that keeps me awake at night?",
      "What sacrifice or compromise in our marriage do I sometimes resent?",
      "What aspect of our physical or emotional intimacy needs honest discussion?",
      "What expectation of marriage or partnership am I failing to meet?",
      "What conversation about money, family, or life goals have I been avoiding?",
      "How do I handle feeling disconnected from you when life gets overwhelming?",
      "What part of my identity or dreams do I feel like I've lost in our marriage?",
      "What do I need from you as my wife that I don't know how to ask for?",
      "What regret or mistake in our relationship do I need to acknowledge and address?"
    ],
    "Wife": [
      "What need do I have in our marriage that I've been afraid to voice?",
      "What fear about our relationship or future do I carry alone?",
      "What part of being a wife feels overwhelming or unclear to me?",
      "What conversation about intimacy, expectations, or boundaries feels overdue?",
      "What sacrifice I've made for our marriage do I need you to understand?",
      "How do I handle feeling unappreciated or misunderstood in our relationship?",
      "What aspect of our partnership makes me feel lonely even when we're together?",
      "What do I struggle with about balancing my individual identity with being your wife?",
      "What expectation or dream about marriage has been harder than I expected?",
      "What conversation about our emotional or physical connection feels too vulnerable to start?"
    ],
    "Partner": [
      "What's something you love about how we communicate?",
      "How do you feel we complement each other?",
      "What's a goal you'd like us to work toward together?",
      "What makes our relationship unique?",
      "What's your favorite way we spend time together?"
    ],
    "Fiance": [
      "What are you most excited about for our wedding?",
      "How do you imagine our life together after marriage?",
      "What's something you're looking forward to sharing as spouses?",
      "What traditions do you want to start together?",
      "What made you know you wanted to marry me?"
    ],
    "Fiancee": [
      "What are you most excited about for our wedding?",
      "How do you imagine our life together after marriage?",
      "What's something you're looking forward to sharing as spouses?",
      "What traditions do you want to start together?",
      "What made you know you wanted to marry me?"
    ]
  },
  "Friends": {
    "Best Friend": [
      "What fear do I have about our friendship that I've never admitted?",
      "What part of my life or personality do I hide from you because I'm afraid you'll judge me?",
      "What moment in our friendship did I handle badly that I still feel guilty about?",
      "What do I need from you as my friend that I'm too afraid to ask for?",
      "What jealousy or resentment have I felt toward you that I've kept secret?",
      "What conversation between us feels overdue but too scary to start?",
      "How has our friendship changed me in ways that I haven't acknowledged?",
      "What vulnerability about myself do I wish I could share with you but feel too exposed to?",
      "What assumption about our friendship might be wrong that we should talk about?",
      "What support do I need during difficult times that I don't know how to ask for?"
    ],
    "Close Friend": [
      "What insecurity do I have that affects our friendship that you might not see?",
      "What part of my life do I struggle with that I wish I could get your perspective on?",
      "What fear do I have about growing apart as we change and evolve?",
      "What boundary in our friendship feels unclear or difficult to navigate?",
      "What conversation about our different life paths or choices feels too sensitive?",
      "How do I handle feeling left out or jealous in our friendship?",
      "What expectation do I have of our friendship that might be unfair?",
      "What part of my personality or behavior do I worry might push you away?",
      "What difficult truth about myself do I wish I could share with you?",
      "What do I appreciate about you that I've never properly expressed?"
    ],
    "Friend": [
      "What do I struggle with in friendships that makes me afraid of getting too close?",
      "What part of my life feels too messy or complicated to share with friends?",
      "What fear do I have about being truly known by the people in my life?",
      "What conversation about boundaries or expectations in our friendship feels overdue?",
      "What insecurity do I have about whether people actually enjoy my company?",
      "How do I handle feeling like I give more to friendships than I receive?",
      "What part of my past or current struggles do I keep hidden from friends?",
      "What do I need from friendships that I don't know how to communicate?",
      "What pattern in my relationships do I repeat that might be harmful?",
      "What vulnerability about friendship or connection do I carry that affects how I relate to others?"
    ],
    "Childhood Friend": [
      "What's your favorite childhood memory of us?",
      "How do you think we've both changed since we were kids?",
      "What's something from our childhood that still makes you laugh?",
      "How has our friendship evolved as we've grown up?",
      "What childhood dream of yours do you still think about?"
    ],
    "College Friend": [
      "What's your best memory from our college days?",
      "How do you think college shaped who we are today?",
      "What's something we used to do in college that you miss?",
      "How has our friendship changed since graduation?",
      "What's a college experience you're grateful we shared?"
    ],
    "Work Friend": [
      "What's the best part about having you as a colleague?",
      "How do you think we complement each other professionally?",
      "What's a work challenge you'd like to discuss?",
      "What's your favorite non-work thing we've discovered about each other?",
      "How has working together strengthened our friendship?"
    ]
  },
  "Siblings": {
    "Brother": [
      "What's your favorite childhood memory of us?",
      "How do you think we've influenced each other?",
      "What's something you admire about your sister?",
      "What family trait do you see in both of us?",
      "What's a tradition you hope we continue as adults?"
    ],
    "Sister": [
      "What's your favorite childhood memory of us?",
      "How do you think we've influenced each other?",
      "What's something you admire about your brother?",
      "What family trait do you see in both of us?",
      "What's a tradition you hope we continue as adults?"
    ],
    "Twin Brother": [
      "What's it like having a twin sister?",
      "How do you think being twins has shaped our relationship?",
      "What's something unique about our twin bond?",
      "How are we most similar and most different?",
      "What's your favorite thing about being twins?"
    ],
    "Twin Sister": [
      "What's it like having a twin brother?",
      "How do you think being twins has shaped our relationship?",
      "What's something unique about our twin bond?",
      "How are we most similar and most different?",
      "What's your favorite thing about being twins?"
    ],
    "Older Brother": [
      "What's it like being the big brother?",
      "What's something you hope to teach your younger sibling?",
      "How do you feel about your role in the family?",
      "What's your favorite memory of protecting or helping your sibling?",
      "What advice would you give your younger sibling?"
    ],
    "Older Sister": [
      "What's it like being the big sister?",
      "What's something you hope to teach your younger sibling?",
      "How do you feel about your role in the family?",
      "What's your favorite memory of protecting or helping your sibling?",
      "What advice would you give your younger sibling?"
    ],
    "Younger Brother": [
      "What's it like being the little brother?",
      "What's something you've learned from your older sibling?",
      "How do you feel about your place in the family?",
      "What's your favorite thing about having an older sibling?",
      "What's something you want your older sibling to know?"
    ],
    "Younger Sister": [
      "What's it like being the little sister?",
      "What's something you've learned from your older sibling?",
      "How do you feel about your place in the family?",
      "What's your favorite thing about having an older sibling?",
      "What's something you want your older sibling to know?"
    ]
  },
  "Grandparents": {
    "Grandfather": [
      "What's your favorite story from when you were young?",
      "What's the most important lesson you want to pass down?",
      "How has the world changed since you were my age?",
      "What's your proudest moment as a grandfather?",
      "What tradition from your generation do you hope continues?"
    ],
    "Grandmother": [
      "What's your favorite story from when you were young?",
      "What's the most important lesson you want to pass down?",
      "How has the world changed since you were my age?",
      "What's your proudest moment as a grandmother?",
      "What tradition from your generation do you hope continues?"
    ],
    "Grandparent": [
      "What's something about your childhood you'd like me to know?",
      "What's your favorite memory of our family?",
      "What advice would you give to someone my age?",
      "What's something you're proud of about our family?",
      "What do you hope for my future?"
    ],
    "Grandson": [
      "What's your favorite thing about spending time with grandparents?",
      "What's something you'd like to learn from your grandparent?",
      "What's a family story you'd love to hear more about?",
      "How do you think you're similar to your grandparent?",
      "What's something you want to thank your grandparent for?"
    ],
    "Granddaughter": [
      "What's your favorite thing about spending time with grandparents?",
      "What's something you'd like to learn from your grandparent?",
      "What's a family story you'd love to hear more about?",
      "How do you think you're similar to your grandparent?",
      "What's something you want to thank your grandparent for?"
    ],
    "Grandchild": [
      "What's your favorite memory with your grandparent?",
      "What's something special about your relationship?",
      "What have you learned from your grandparent?",
      "What do you love most about family gatherings?",
      "What's something you want to do together?"
    ]
  }
};

export function getRoleSpecificQuestions(relationshipType: string, userRole: string): string[] {
  const questions = roleSpecificQuestions[relationshipType]?.[userRole];
  return questions || [];
}

export function getGeneralRelationshipQuestions(relationshipType: string): string[] {
  // Fallback to general questions if specific role questions aren't available
  const generalQuestions = {
    "Parent-Child": [
      "What's one thing you're grateful for about our relationship?",
      "What's a favorite family tradition?",
      "How do you think we've grown together?",
      "What's something you'd like to do together soon?",
      "What makes our relationship special?"
    ],
    "Romantic Partners": [
      "What's your favorite thing about us as a couple?",
      "What's a dream you have for our future?",
      "How do we make each other better?",
      "What's your favorite memory together?",
      "What makes you feel most loved?"
    ],
    "Friends": [
      "What's the best part of our friendship?",
      "How have we supported each other?",
      "What adventure should we go on next?",
      "What's something you admire about me?",
      "What makes our friendship unique?"
    ],
    "Siblings": [
      "What's your favorite childhood memory together?",
      "How have we influenced each other?",
      "What family trait do we both share?",
      "What's something you appreciate about our relationship?",
      "What tradition should we continue?"
    ],
    "Grandparents": [
      "What's your favorite family story?",
      "What wisdom would you like to share?",
      "How has our family changed over the years?",
      "What's your proudest family moment?",
      "What do you hope for our family's future?"
    ]
  };
  
  return generalQuestions[relationshipType as keyof typeof generalQuestions] || [];
}