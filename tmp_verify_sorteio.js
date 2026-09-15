const positions = ['PG', 'SG', 'SF', 'PF', 'C'];

function findPositionAssignment(team, missingPosition = null, ignorePositionRules = false) {
  const players = [...team].sort((a, b) => a.positions.length - b.positions.length);
  const search = (index, usedPositions, assignments) => {
    if (index === players.length) return assignments;
    const player = players[index];
    const availablePositions = ignorePositionRules ? positions : player.positions;
    for (const position of availablePositions) {
      if (position === missingPosition || (!ignorePositionRules && usedPositions.has(position))) continue;
      const result = search(index + 1, new Set([...usedPositions, position]), [...assignments, position]);
      if (result) return result;
    }
    return null;
  };
  const assignedPositions = search(0, new Set(), []);
  return assignedPositions ? { players, positions: assignedPositions } : null;
}

function chooseBalancedTeams(players, teamSize) {
  let bestTeam1 = players.slice(0, teamSize);
  let bestMissingPosition = null;
  let bestScore = Infinity;

  const evaluateTeam = team => positions.map(position => team.filter(player => player.positions.includes(position)).length);

  const search = (start, selected) => {
    if (selected.length === teamSize) {
      const team1 = selected.map(index => players[index]);
      const selectedIds = new Set(selected);
      const team2 = players.filter((_, index) => !selectedIds.has(index));
      const possibleMissingPositions = teamSize === 4 ? positions : [null];

      for (const missingPosition of possibleMissingPositions) {
        const ignorePositionRules = teamSize === 4;
        const team1Assignment = findPositionAssignment(team1, missingPosition, ignorePositionRules);
        const team2Assignment = findPositionAssignment(team2, missingPosition, ignorePositionRules);
        if (!team1Assignment || !team2Assignment) continue;

        const team1Profile = evaluateTeam(team1);
        const team2Profile = evaluateTeam(team2);
        const positionDifference = team1Profile.reduce((total, count, index) => total + Math.abs(count - team2Profile[index]), 0);

        if (positionDifference < bestScore) {
          bestScore = positionDifference;
          bestTeam1 = team1;
          bestMissingPosition = missingPosition;
        }
      }
      return;
    }

    const remaining = teamSize - selected.length;
    for (let index = start; index <= players.length - remaining; index++) {
      selected.push(index);
      search(index + 1, selected);
      selected.pop();
    }
  };

  search(0, []);
  if (bestScore === Infinity) return null;

  const team1Ids = new Set(bestTeam1);
  return {
    team1: bestTeam1,
    team2: players.filter(player => !team1Ids.has(player)),
    missingPosition: bestMissingPosition
  };
}

const players4x4 = [
  { id: '1', positions: ['PG'] },
  { id: '2', positions: ['SG'] },
  { id: '3', positions: ['SF'] },
  { id: '4', positions: ['PF'] },
  { id: '5', positions: ['C'] },
  { id: '6', positions: ['PG'] },
  { id: '7', positions: ['SG'] },
  { id: '8', positions: ['SF'] }
];

const result4x4 = chooseBalancedTeams(players4x4, 4);
if (!result4x4) throw new Error('O sorteio 4x4 não encontrou uma divisão válida.');
if (result4x4.missingPosition === null) throw new Error('O sorteio 4x4 não definiu uma posição vazia.');

const assertUniquePositions = (team, label) => {
  const positions = team.map(player => player.positions[0]);
  const duplicates = positions.filter((position, index) => positions.indexOf(position) !== index);
  if (duplicates.length > 0) {
    throw new Error(`${label} gerou posições duplicadas: ${duplicates.join(', ')}`);
  }
};

assertUniquePositions(result4x4.team1, 'TIME 1');
assertUniquePositions(result4x4.team2, 'TIME 2');

console.log('4x4:', JSON.stringify(result4x4, null, 2));

const players5x5 = [
  { id: '1', positions: ['PG', 'SG'] },
  { id: '2', positions: ['PG', 'SF'] },
  { id: '3', positions: ['SG', 'SF'] },
  { id: '4', positions: ['SF', 'PF'] },
  { id: '5', positions: ['PF', 'C'] },
  { id: '6', positions: ['C', 'PG'] },
  { id: '7', positions: ['PG', 'SG'] },
  { id: '8', positions: ['SG', 'PF'] },
  { id: '9', positions: ['SF', 'C'] },
  { id: '10', positions: ['PF', 'C'] }
];

const result5x5 = chooseBalancedTeams(players5x5, 5);
if (!result5x5) throw new Error('O sorteio 5x5 não encontrou uma divisão válida.');
if (result5x5.missingPosition !== null) throw new Error('O sorteio 5x5 não deveria ter posição vazia.');

console.log('5x5:', JSON.stringify(result5x5, null, 2));
