const Canvas = require('canvas');

async function generateRosterImage(team1, team2) {
    const canvas = Canvas.createCanvas(1000, 700);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Only REC', canvas.width / 2, 60);

    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#3498db'; 
    ctx.fillText('TIME 1', 250, 120);
    ctx.fillStyle = '#e74c3c'; 
    ctx.fillText('TIME 2', 750, 120);

    const positionsOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
    const startY = 160;
    const slotHeight = 90;
    const slotWidth = 400;
    const gap = 15;

    const drawSlot = async (x, y, position, player, isTeamB) => {
        ctx.fillStyle = isTeamB ? '#2a1a1a' : '#1a202a';
        ctx.strokeStyle = isTeamB ? '#e74c3c' : '#3498db';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, slotWidth, slotHeight);
        ctx.strokeRect(x, y, slotWidth, slotHeight);

        ctx.fillStyle = isTeamB ? '#e74c3c' : '#3498db';
        ctx.fillRect(x + 100, y + 20, 45, 25);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(position, x + 122, y + 38);

        ctx.textAlign = 'left';
        ctx.font = 'bold 24px Arial';
        if (player) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(player.name, x + 100, y + 75);

            try {
                const avatarUrl = player.memberObj.user.displayAvatarURL({ extension: 'png', size: 64 });
                const avatar = await Canvas.loadImage(avatarUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(x + 50, y + 45, 30, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, x + 20, y + 15, 60, 60);
                ctx.restore();
            } catch (e) {
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.arc(x + 50, y + 45, 30, 0, Math.PI * 2, true);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#555555';
            ctx.fillText('VAZIO', x + 100, y + 75);

            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x + 50, y + 45, 30, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.fillStyle = '#777';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('?', x + 50, y + 52);
        }
    };

    for (let i = 0; i < positionsOrder.length; i++) {
        const pos = positionsOrder[i];
        const playerA = team1.find(player => player.assignedPosition === pos);
        const playerB = team2.find(player => player.assignedPosition === pos);
        
        const currentY = startY + (i * (slotHeight + gap));

        await drawSlot(50, currentY, pos, playerA, false);
        await drawSlot(550, currentY, pos, playerB, true);
    }

    return canvas.toBuffer();
}

module.exports = { generateRosterImage };