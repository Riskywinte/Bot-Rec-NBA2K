const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');

const assetsPath = path.join(__dirname, '..', 'assets');
const backgroundPath = path.join(assetsPath, 'background.png');
const logoPath = path.join(assetsPath, 'logo.png');

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
        ctx.font = 'bold 48px sans-serif';
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#160b0b';
        ctx.strokeText('Only', 500, 75);
        ctx.fillStyle = '#f7f0eb';
        ctx.fillText('Only', 500, 75);
        ctx.font = 'bold 43px sans-serif';
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
    drawText('TIME 1', 250, 185, '#f34139', 'bold 42px sans-serif');
    ctx.shadowColor = 'rgba(255, 177, 31, 0.55)';
    drawText('TIME 2', 750, 185, '#ffc130', 'bold 42px sans-serif');
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
        ctx.font = 'bold italic 31px sans-serif';
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
        drawText(position, badgeX + 21.5, badgeY + 20, '#fff', 'bold 16px sans-serif');

        const name = player?.name || 'VAZIO';
        let fontSize = 29;
        ctx.font = `bold ${fontSize}px sans-serif`;
        while (ctx.measureText(name).width > 280 && fontSize > 18) {
            fontSize--;
            ctx.font = `bold ${fontSize}px sans-serif`;
        }
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#170b0a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.strokeText(name, badgeX, y + 78);
        ctx.fillStyle = isTeamB ? '#ffd04a' : '#ff4a42';
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
    ctx.font = 'bold 41px sans-serif';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#190a0b';
    ctx.strokeText('VS', 500, 465);
    ctx.fillStyle = '#ff572f';
    ctx.fillText('VS', 500, 465);
    ctx.restore();

    return canvas.toBuffer();
}

async function generateProfileImage(profile) {
    const width = 1200;
    const height = 760;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const orange = '#ff6b24';
    const light = '#fff4ed';
    const muted = '#a98e83';

    const roundedRect = (x, y, rectWidth, rectHeight, radius) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + rectWidth, y, x + rectWidth, y + rectHeight, radius);
        ctx.arcTo(x + rectWidth, y + rectHeight, x, y + rectHeight, radius);
        ctx.arcTo(x, y + rectHeight, x, y, radius);
        ctx.arcTo(x, y, x + rectWidth, y, radius);
        ctx.closePath();
    };

    const drawText = (text, x, y, font, color, align = 'left') => {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(text, x, y);
    };

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
    } else {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#0b0608');
        gradient.addColorStop(0.65, '#210b0b');
        gradient.addColorStop(1, '#5a190c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = 'rgba(10, 5, 6, 0.62)';
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(640, 760, 30, 640, 760, 620);
    glow.addColorStop(0, 'rgba(255, 75, 20, 0.55)');
    glow.addColorStop(1, 'rgba(255, 75, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 200, width, height - 200);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 103, 37, 0.13)';
    ctx.lineWidth = 2;
    for (let index = 0; index < 7; index++) {
        ctx.beginPath();
        ctx.moveTo(360 + index * 145, 0);
        ctx.lineTo(120 + index * 145, height);
        ctx.stroke();
    }
    ctx.restore();

    const panel = (x, y, panelWidth, panelHeight, radius = 18) => {
        roundedRect(x, y, panelWidth, panelHeight, radius);
        ctx.fillStyle = 'rgba(20, 9, 9, 0.91)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 88, 39, 0.68)';
        ctx.stroke();
    };

    panel(34, 34, 300, 692, 28);
    panel(360, 34, 806, 206, 24);
    panel(360, 254, 806, 232, 24);
    panel(360, 500, 806, 226, 24);

    if (fs.existsSync(logoPath)) {
        const logo = await Canvas.loadImage(logoPath);
        const logoScale = Math.min(190 / logo.width, 145 / logo.height);
        const logoWidth = logo.width * logoScale;
        const logoHeight = logo.height * logoScale;
        ctx.drawImage(logo, 34 + (300 - logoWidth) / 2, 48, logoWidth, logoHeight);
    } else {
        drawText('REC DO PANELA', 184, 112, 'bold 24px sans-serif', light, 'center');
    }

    const avatarX = 184;
    const avatarY = 322;
    const avatarRadius = 91;
    let avatarLoaded = false;
    try {
        const avatar = await Canvas.loadImage(profile.user.displayAvatarURL({ extension: 'png', size: 256 }));
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

    if (!avatarLoaded) {
        const initials = profile.name.trim().slice(0, 1).toUpperCase() || '?';
        const avatarGradient = ctx.createLinearGradient(avatarX - avatarRadius, avatarY - avatarRadius, avatarX + avatarRadius, avatarY + avatarRadius);
        avatarGradient.addColorStop(0, '#813319');
        avatarGradient.addColorStop(1, '#26100e');
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
        ctx.fillStyle = avatarGradient;
        ctx.fill();
        drawText(initials, avatarX, avatarY + 25, 'bold 72px sans-serif', light, 'center');
    }

    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = orange;
    ctx.stroke();

    let nameFontSize = 34;
    ctx.font = `bold ${nameFontSize}px sans-serif`;
    while (ctx.measureText(profile.name).width > 270 && nameFontSize > 20) {
        nameFontSize--;
        ctx.font = `bold ${nameFontSize}px sans-serif`;
    }
    drawText(profile.name, 184, 454, `bold ${nameFontSize}px sans-serif`, light, 'center');
    drawText('PLAYER CARD', 184, 484, 'bold 15px sans-serif', orange, 'center');

    roundedRect(128, 501, 112, 38, 12);
    ctx.fillStyle = orange;
    ctx.fill();
    drawText(profile.favoritePosition || 'REC', 184, 527, 'bold 19px sans-serif', light, 'center');

    drawText('TEMPORADA ATUAL', 184, 585, 'bold 14px sans-serif', muted, 'center');
    drawText(`SEASON ${profile.season}`, 184, 611, 'bold 21px sans-serif', light, 'center');

    drawText(`SEASON ${profile.season}`, 386, 68, 'bold 26px sans-serif', light);
    drawText('NÚMEROS GRANDES = TEMPORADA  ·  EMBAIXO = CARREIRA', 1140, 66, 'bold 12px sans-serif', muted, 'right');

    const summaryStats = [
        { label: 'PARTIDAS', value: profile.seasonStats.games, career: profile.careerStats.games },
        { label: 'VITÓRIAS', value: profile.seasonStats.wins, career: profile.careerStats.wins },
        { label: 'DERROTAS', value: profile.seasonStats.losses, career: profile.careerStats.losses },
        { label: '% VITÓRIAS', value: `${profile.seasonStats.winRate}%`, career: `${profile.careerStats.winRate}%` }
    ];
    const summaryY = 88;
    const summaryWidth = 180;
    const summaryGap = 16;
    summaryStats.forEach((stat, index) => {
        const x = 382 + index * (summaryWidth + summaryGap);
        panel(x, summaryY, summaryWidth, 126, 16);
        drawText(String(stat.value), x + summaryWidth / 2, summaryY + 56, 'bold 42px sans-serif', light, 'center');
        drawText(stat.label, x + summaryWidth / 2, summaryY + 82, 'bold 13px sans-serif', orange, 'center');
        drawText(`carreira ${stat.career}`, x + summaryWidth / 2, summaryY + 108, 'bold 12px sans-serif', muted, 'center');
    });

    drawText('POR POSIÇÃO', 386, 287, 'bold 27px sans-serif', light);
    drawText('NA TEMPORADA  ·  ANEL = % DE VITÓRIAS', 1140, 284, 'bold 12px sans-serif', muted, 'right');
    const positionWidth = 144;
    const positionGap = 13;
    profile.positions.forEach((position, index) => {
        const x = 382 + index * (positionWidth + positionGap);
        const y = 307;
        panel(x, y, positionWidth, 151, 16);

        drawText(position.position, x + 14, y + 34, 'bold 27px sans-serif', light);
        ctx.beginPath();
        ctx.arc(x + 119, y + 25, 19, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 107, 36, 0.2)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = orange;
        ctx.stroke();
        drawText(`${position.season.winRate}%`, x + 119, y + 30, 'bold 11px sans-serif', light, 'center');

        drawText(`${position.season.games} JOGOS`, x + 14, y + 67, 'bold 14px sans-serif', light);
        drawText(`${position.season.wins} V  ·  ${position.season.losses} D`, x + 14, y + 90, 'bold 13px sans-serif', muted);
        ctx.beginPath();
        ctx.moveTo(x + 14, y + 105);
        ctx.lineTo(x + positionWidth - 14, y + 105);
        ctx.strokeStyle = 'rgba(255, 107, 36, 0.35)';
        ctx.stroke();
        drawText(`carreira ${position.career.games} J  ·  ${position.career.wins} V`, x + 14, y + 130, 'bold 10px sans-serif', muted);
    });

    drawText('DESTAQUES', 386, 535, 'bold 27px sans-serif', light);
    drawText('TEMPORADA ATUAL', 1140, 532, 'bold 12px sans-serif', muted, 'right');
    const highlights = [
        { label: 'MAIS JOGADA', position: profile.mostPlayedPosition },
        { label: 'MELHOR WR', position: profile.bestPosition }
    ];
    highlights.forEach((highlight, index) => {
        const x = 382 + index * 386;
        panel(x, 555, 374, 74, 15);
        drawText(highlight.label, x + 18, 580, 'bold 13px sans-serif', orange);
        drawText(highlight.position, x + 18, 613, 'bold 22px sans-serif', light);
    });

    const bannerGradient = ctx.createLinearGradient(382, 0, 1140, 0);
    bannerGradient.addColorStop(0, 'rgba(146, 41, 15, 0.95)');
    bannerGradient.addColorStop(1, 'rgba(54, 18, 15, 0.95)');
    roundedRect(382, 645, 758, 59, 15);
    ctx.fillStyle = bannerGradient;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 107, 36, 0.8)';
    ctx.stroke();
    drawText('CONTINUE JOGANDO PARA DESTACAR SEUS NÚMEROS', 761, 683, 'italic bold 21px sans-serif', light, 'center');

    return canvas.toBuffer('image/png');
}

module.exports = { generateRosterImage, generateProfileImage };
