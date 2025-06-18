export interface RoleSpecificQuestions {
  [relationshipType: string]: {
    [role: string]: string[];
  };
}

export const roleSpecificQuestions: RoleSpecificQuestions = {
  "Parent-Child": {
    "Father": [
      "What's one thing you learned from your own father that you want to pass on?",
      "What moment made you feel most proud to be a dad?",
      "How has being a father changed your perspective on life?",
      "What's something you wish your own father had told you?",
      "What's the most important lesson you want to teach your child?"
    ],
    "Mother": [
      "What's one thing you learned from your own mother that you want to pass on?",
      "What moment made you feel most proud to be a mom?",
      "How has being a mother changed your perspective on life?",
      "What's something you wish your own mother had told you?",
      "What's the most important lesson you want to teach your child?"
    ],
    "Parent": [
      "What's your favorite memory from when your child was little?",
      "How do you hope your child will remember their childhood?",
      "What's something new you've learned about yourself as a parent?",
      "What family tradition do you hope to continue?",
      "What's the biggest challenge you've faced as a parent?"
    ],
    "Son": [
      "What's something you admire most about your parent?",
      "What's a family story you'd like to know more about?",
      "How do you think you're similar to your parent?",
      "What's something your parent taught you that you use every day?",
      "What's a question you've always wanted to ask your parent?"
    ],
    "Daughter": [
      "What's something you admire most about your parent?",
      "What's a family story you'd like to know more about?",
      "How do you think you're similar to your parent?",
      "What's something your parent taught you that you use every day?",
      "What's a question you've always wanted to ask your parent?"
    ],
    "Child": [
      "What's your favorite thing to do together as a family?",
      "What makes you feel most loved by your parent?",
      "What's something you hope never changes about your family?",
      "What's a memory that always makes you smile?",
      "What do you want to be like when you're older?"
    ]
  },
  "Romantic Partners": {
    "Boyfriend": [
      "What made you realize you were falling for her?",
      "What's your favorite thing about our relationship?",
      "How do you envision our future together?",
      "What's something new you'd like us to try together?",
      "What makes you feel most connected to me?"
    ],
    "Girlfriend": [
      "What made you realize you were falling for him?",
      "What's your favorite thing about our relationship?",
      "How do you envision our future together?",
      "What's something new you'd like us to try together?",
      "What makes you feel most connected to me?"
    ],
    "Husband": [
      "What's your favorite memory from our relationship so far?",
      "How have we grown together since we got married?",
      "What's something you're grateful for about our partnership?",
      "What dream do you have for our future?",
      "What makes you feel most appreciated in our marriage?"
    ],
    "Wife": [
      "What's your favorite memory from our relationship so far?",
      "How have we grown together since we got married?",
      "What's something you're grateful for about our partnership?",
      "What dream do you have for our future?",
      "What makes you feel most appreciated in our marriage?"
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
      "What's your favorite memory of our friendship?",
      "How have we supported each other through tough times?",
      "What's something you admire about how I handle challenges?",
      "What adventure would you most like us to go on?",
      "What makes our friendship special to you?"
    ],
    "Close Friend": [
      "What's something we have in common that always surprises people?",
      "How has our friendship changed over the years?",
      "What's a goal you'd like support with?",
      "What's your favorite thing we do together?",
      "What's something you've learned from our friendship?"
    ],
    "Friend": [
      "What's been the highlight of our friendship so far?",
      "What's something you'd like to know more about regarding my life?",
      "How do you think we balance each other out?",
      "What's a fun activity you think we should try together?",
      "What's something you appreciate about our friendship?"
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