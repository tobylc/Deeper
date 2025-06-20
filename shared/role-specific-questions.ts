export interface RoleSpecificQuestions {
  [relationshipType: string]: {
    [role: string]: string[];
  };
}

export const roleSpecificQuestions: RoleSpecificQuestions = {
  "Parent-Child": {
    "Father": [
      "What life lesson do you wish you had learned earlier that you want to share with your adult son/daughter?",
      "How has watching your child become an adult changed your perspective on your own choices?",
      "What aspect of modern adult life do you find most challenging to understand from your child's perspective?",
      "What family responsibility or tradition would you like your adult child to eventually take on?",
      "What's something you're proud of about how your child has handled adult challenges?",
      "What wisdom from your father do you find yourself wanting to pass down now that your child is grown?",
      "How do you balance giving advice versus letting your adult child make their own decisions?",
      "What aspect of your adult child's life would you like to understand better?"
    ],
    "Mother": [
      "What motherly wisdom do you want to share now that your child is navigating adult relationships?",
      "How has your relationship with your own mother influenced how you connect with your adult child?",
      "What life skill do you wish you had taught your child before they became an adult?",
      "What aspect of your adult child's independence makes you most proud?",
      "What family tradition or value do you hope your child will carry into their own adult relationships?",
      "How do you navigate the shift from protector to advisor now that your child is grown?",
      "What's something about adult life you wish someone had prepared you for that you want to discuss?",
      "What question about your own adult life would you like your child to understand better?"
    ],
    "Son": [
      "What aspect of being an adult man do you wish you could get your father's perspective on?",
      "What family responsibility are you ready to take on now that you're grown?",
      "How has becoming an adult changed what you appreciate about your father?",
      "What life decision are you facing that you'd value your dad's experience with?",
      "What question about relationships or career would you like your father's honest opinion on?",
      "What family story or tradition do you want to understand better now that you're an adult?",
      "How do you see yourself carrying forward what your father taught you?",
      "What aspect of your father's adult life do you find yourself curious about now?"
    ],
    "Daughter": [
      "What aspect of being an adult woman would you like your mother's guidance on?",
      "How has your perspective on your mother changed since you became an adult yourself?",
      "What life challenge are you facing that you think your mom might have insight about?",
      "What family tradition or value do you want to continue in your own adult life?",
      "What question about adult relationships would you value your mother's perspective on?",
      "How do you want to honor what your parents taught you while creating your own adult path?",
      "What aspect of your mother's life experience do you find yourself more curious about now?",
      "What family responsibility or role are you ready to take on as an adult?"
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