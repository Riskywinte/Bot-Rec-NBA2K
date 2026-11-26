const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');

const assetsPath = path.join(__dirname, '..', 'assets');
const backgroundPath = path.join(assetsPath, 'background.png');
const logoPath = path.join(assetsPath, 'logo.png');

Canvas.registerFont(path.join(assetsPath, 'fonts', 'Lato-Regular.ttf'), {
    family: 'Lato',
    weight: 'normal'
});
Canvas.registerFont(path.join(assetsPath, 'fonts', 'Lato-Bold.ttf'), {
    family: 'Lato',
    weight: 'bold'
});

async function generateRosterImage(team1, team2) {
    const width = 1000;
    const height = 740;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (fs.existsSync(backgroundPath)) {
        const background = await Canvas.loadImage(backgroundPath);
        const scale = Math.max(width / background.width, height / background.height);
        const backgroundWidth = background.width * scale;
        const backgroundHeight = background.height * scale;
        ctx.drawImage(
            background,
            (width - backgroundWidth) / 2,
            (height - backgroundHeight) / 2,
            backgroundWidth,
            backgroundHeight
        );
        ctx.fillStyle = 'rgba(12, 4, 5, 0.34)';
        ctx.fillRect(0, 0, width, height);
    } else {
        const background = ctx.createLinearGradient(0, 0, 0, height);
        background.addColorStop(0, '#0b0608');
        background.addColorStop(0.7, '#1b0908');
        background.addColorStop(1, '#a9300b');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(500, 760, 20, 500, 760, 510);
        glow.addColorStop(0, 'rgba(255, 91, 13, 0.86)');
        glow.addColorStop(1, 'rgba(255, 67, 8, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 260, width, height - 260);
    }

    const roundedRect = (x, y, rectWidth, rectHeight, radius) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + rectWidth, y, x + rectWidth, y + rectHeight, radius);
        ctx.arcTo(x + rectWidth, y + rectHeight, x, y + rectHeight, radius);
        ctx.arcTo(x, y + rectHeight, x, y, radius);
        ctx.arcTo(x, y, x + rectWidth, y, radius);
        ctx.closePath();
    };

    const drawText = (text, x, y, color, font, align = 'center') => {
        ctx.font = font;
        ctx.textAlign = align;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    };

    if (fs.existsSync(logoPath)) {
        const logo = await Canvas.loadImage(logoPath);
        const crop = { x: 32, y: 30, width: 436, height: 440 };
        const logoCanvas = Canvas.createCanvas(crop.width, crop.height);
        const logoContext = logoCanvas.getContext('2d');
        logoContext.drawImage(
            logo,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            crop.width,
            crop.height
        );

        const logoPixels = logoContext.getImageData(0, 0, crop.width, crop.height);
        for (let index = 0; index < logoPixels.data.length; index += 4) {
            const red = logoPixels.data[index];
            const green = logoPixels.data[index + 1];
            const blue = logoPixels.data[index + 2];
            const brightness = Math.max(red, green, blue);
            const colorRange = brightness - Math.min(red, green, blue);

            if (brightness < 110 && colorRange < 55) {
                logoPixels.data[index + 3] = 0;
            } else if (brightness < 150 && colorRange < 35) {
                logoPixels.data[index + 3] *= (brightness - 110) / 40;
            }
        }
        logoContext.putImageData(logoPixels, 0, 0);

        const logoScale = Math.min(126 / crop.width, 126 / crop.height);
        const logoWidth = crop.width * logoScale;
        const logoHeight = crop.height * logoScale;
        ctx.drawImage(
            logoCanvas,
            0,
            0,
            crop.width,
            crop.height,
            (width - logoWidth) / 2,
            20 + (126 - logoHeight) / 2,
            logoWidth,
            logoHeight
        );
    } else {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.font = 'bold 48px Lato';
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#160b0b';
        ctx.strokeText('Only', 500, 75);
        ctx.fillStyle = '#f7f0eb';
        ctx.fillText('Only', 500, 75);
        ctx.font = 'bold 43px Lato';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#160b0b';
        ctx.strokeText('REC', 500, 113);
        ctx.fillStyle = '#f13c25';
        ctx.fillText('REC', 500, 113);
        ctx.restore();
    }

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(255, 56, 38, 0.55)';
    drawText('TIME A', 250, 185, '#f34139', 'bold 42px Lato');
    ctx.shadowColor = 'rgba(255, 177, 31, 0.55)';
    drawText('TIME B', 750, 185, '#ffc130', 'bold 42px Lato');
    ctx.restore();

    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
    const cardY = 204;
    const cardHeight = 96;
    const cardGap = 6;
    const cardWidth = 404;

    const drawInitial = (x, y, radius, player, color) => {
        const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
        gradient.addColorStop(0, '#5b2822');
        gradient.addColorStop(1, '#160b10');
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const initial = player?.name?.trim()?.[0]?.toUpperCase() || '?';
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold italic 31px Lato';
        ctx.fillStyle = '#ff9b55';
        ctx.fillText(initial, x, y + 1);
        ctx.restore();
    };

    const drawSlot = async (x, y, position, player, isTeamB) => {
        const accent = isTeamB ? '#ffb21c' : '#f03932';
        const cardFill = isTeamB ? 'rgba(31, 17, 7, 0.94)' : 'rgba(36, 12, 12, 0.94)';

        ctx.save();
        ctx.shadowColor = isTeamB ? 'rgba(255, 178, 28, 0.32)' : 'rgba(240, 57, 50, 0.34)';
        ctx.shadowBlur = 9;
        roundedRect(x, y, cardWidth, cardHeight, 18);
        ctx.fillStyle = cardFill;
        ctx.fill();
        ctx.restore();

        roundedRect(x, y, cardWidth, cardHeight, 18);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = accent;
        ctx.stroke();

        const avatarX = x + 53;
        const avatarY = y + cardHeight / 2;
        const avatarRadius = 33;
        let avatarLoaded = false;

        if (player?.memberObj?.user) {
            try {
                const url = player.memberObj.user.displayAvatarURL({ extension: 'png', size: 96 });
                const avatar = await Canvas.loadImage(url);
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                ctx.restore();
                avatarLoaded = true;
            } catch (error) {
                avatarLoaded = false;
            }
        }

        if (avatarLoaded) {
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
            ctx.lineWidth = 3;
            ctx.strokeStyle = accent;
            ctx.stroke();
        } else {
            drawInitial(avatarX, avatarY, avatarRadius, player, accent);
        }

        const badgeX = x + 105;
        const badgeY = y + 16;
        roundedRect(badgeX, badgeY, 43, 28, 6);
        ctx.fillStyle = accent;
        ctx.fill();
        drawText(position, badgeX + 21.5, badgeY + 20, '#fff', 'bold 16px Lato');

        const name = player?.name || 'VAZIO';
        let fontSize = 29;
        ctx.font = `bold ${fontSize}px Lato`;
        while (ctx.measureText(name).width > 280 && fontSize > 18) {
            fontSize--;
            ctx.font = `bold ${fontSize}px Lato`;
        }
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#170b0a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = `bold ${fontSize}px Lato`;
        ctx.strokeText(name, badgeX, y + 78);
        ctx.fillStyle = isTeamB ? '#ffd04a' : '#fffaf5';
        ctx.fillText(name, badgeX, y + 78);
        ctx.restore();
    };

    for (let index = 0; index < positions.length; index++) {
        const position = positions[index];
        const y = cardY + index * (cardHeight + cardGap);
        const playerA = team1.find(player => player.assignedPosition === position);
        const playerB = team2.find(player => player.assignedPosition === position);
        await drawSlot(48, y, position, playerA, false);
        await drawSlot(548, y, position, playerB, true);
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 41px Lato';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#190a0b';
    ctx.strokeText('VS', 500, 465);
    ctx.fillStyle = '#ff572f';
    ctx.fillText('VS', 500, 465);
    ctx.restore();

    return canvas.toBuffer();
}

module.exports = { generateRosterImage };
