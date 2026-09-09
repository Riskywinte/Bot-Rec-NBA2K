const positions = ['PG', 'SG', 'SF', 'PF', 'C'];

function findPositionAssignment(team, missingPosition = null) {
  const players = [...team].sort((a, b) => a.positions.length - b.positions.length);
  const search = (index, usedPositions, assignments) => {
    if (index === players.length) return assignments;
    const player = players[index];
    for (const position of player.positions) {
      if (position === missingPosition || usedPositions.has(position)) continue;
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
      const team1MissingPositions = positions.filter(position => !team1.some(player => player.positions.includes(position)));
      const team2MissingPositions = positions.filter(position => !team2.some(player => player.positions.includes(position)));
      const possibleMissingPositions = teamSize === 4
        ? [null, ...team1MissingPositions.filter(position => team2MissingPositions.includes(position))]
        : [null];

      for (const missingPosition of possibleMissingPositions) {
        const team1Assignment = findPositionAssignment(team1, missingPosition);
        const team2Assignment = findPositionAssignment(team2, missingPosition);
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

const players = [
  { id: '1', positions: ['PG'] },
  { id: '2', positions: ['SG'] },
  { id: '3', positions: ['SF'] },
  { id: '4', positions: ['PF'] },
  { id: '5', positions: ['C'] },
  { id: '6', positions: ['PG'] },
  { id: '7', positions: ['SG'] },
  { id: '8', positions: ['SF'] }
];

console.log(JSON.stringify(chooseBalancedTeams(players, 4), null, 2));
