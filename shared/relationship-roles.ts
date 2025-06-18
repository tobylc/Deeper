export interface RelationshipRoles {
  [key: string]: {
    options: string[];
    pairs: Array<{
      role1: string;
      role2: string;
    }>;
  };
}

export const relationshipRoles: RelationshipRoles = {
  "Parent-Child": {
    options: ["Father", "Mother", "Parent", "Son", "Daughter", "Child"],
    pairs: [
      { role1: "Father", role2: "Son" },
      { role1: "Father", role2: "Daughter" },
      { role1: "Mother", role2: "Son" },
      { role1: "Mother", role2: "Daughter" },
      { role1: "Parent", role2: "Child" }
    ]
  },
  "Romantic Partners": {
    options: ["Boyfriend", "Girlfriend", "Husband", "Wife", "Partner", "Fiance", "Fiancee"],
    pairs: [
      { role1: "Boyfriend", role2: "Girlfriend" },
      { role1: "Girlfriend", role2: "Boyfriend" },
      { role1: "Husband", role2: "Wife" },
      { role1: "Wife", role2: "Husband" },
      { role1: "Partner", role2: "Partner" },
      { role1: "Fiance", role2: "Fiancee" },
      { role1: "Fiancee", role2: "Fiance" }
    ]
  },
  "Friends": {
    options: ["Best Friend", "Close Friend", "Friend", "Childhood Friend", "College Friend", "Work Friend"],
    pairs: [
      { role1: "Best Friend", role2: "Best Friend" },
      { role1: "Close Friend", role2: "Close Friend" },
      { role1: "Friend", role2: "Friend" },
      { role1: "Childhood Friend", role2: "Childhood Friend" },
      { role1: "College Friend", role2: "College Friend" },
      { role1: "Work Friend", role2: "Work Friend" }
    ]
  },
  "Siblings": {
    options: ["Brother", "Sister", "Twin Brother", "Twin Sister", "Older Brother", "Older Sister", "Younger Brother", "Younger Sister"],
    pairs: [
      { role1: "Brother", role2: "Sister" },
      { role1: "Sister", role2: "Brother" },
      { role1: "Brother", role2: "Brother" },
      { role1: "Sister", role2: "Sister" },
      { role1: "Twin Brother", role2: "Twin Sister" },
      { role1: "Twin Sister", role2: "Twin Brother" },
      { role1: "Older Brother", role2: "Younger Sister" },
      { role1: "Older Sister", role2: "Younger Brother" },
      { role1: "Younger Brother", role2: "Older Sister" },
      { role1: "Younger Sister", role2: "Older Brother" }
    ]
  },
  "Grandparents": {
    options: ["Grandfather", "Grandmother", "Grandparent", "Grandson", "Granddaughter", "Grandchild"],
    pairs: [
      { role1: "Grandfather", role2: "Grandson" },
      { role1: "Grandfather", role2: "Granddaughter" },
      { role1: "Grandmother", role2: "Grandson" },
      { role1: "Grandmother", role2: "Granddaughter" },
      { role1: "Grandparent", role2: "Grandchild" }
    ]
  },
  "Long-distance": {
    options: ["Partner", "Friend", "Family Member", "Loved One"],
    pairs: [
      { role1: "Partner", role2: "Partner" },
      { role1: "Friend", role2: "Friend" },
      { role1: "Family Member", role2: "Family Member" },
      { role1: "Loved One", role2: "Loved One" }
    ]
  },
  "Other": {
    options: ["Person", "Individual", "Connection"],
    pairs: [
      { role1: "Person", role2: "Person" },
      { role1: "Individual", role2: "Individual" },
      { role1: "Connection", role2: "Connection" }
    ]
  }
};

export function getRolesForRelationship(relationshipType: string): string[] {
  return relationshipRoles[relationshipType]?.options || [];
}

export function getValidRolePairs(relationshipType: string): Array<{role1: string; role2: string}> {
  return relationshipRoles[relationshipType]?.pairs || [];
}

export function isValidRolePair(relationshipType: string, role1: string, role2: string): boolean {
  const pairs = getValidRolePairs(relationshipType);
  return pairs.some(pair => 
    (pair.role1 === role1 && pair.role2 === role2) ||
    (pair.role1 === role2 && pair.role2 === role1)
  );
}