const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');

const assetsPath = path.join(__dirname, '..', 'assets');
const backgroundPath = path.join(assetsPath, 'background.png');
const logoPath = path.join(assetsPath, 'logo.png');

function drawCardPanel(ctx, x, y, width, height, radius = 16, fill = 'rgba(20, 9, 9, 0.92)') {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 83, 37, 0.78)';
    ctx.stroke();
}

function drawCardText(ctx, text, x, y, options = {}) {
    const {
        font = '16px sans-serif',
        color = '#fff4ed',
        align = 'left',
        maxWidth
    } = options;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';

    let displayText = String(text);
    if (maxWidth && ctx.measureText(displayText).width > maxWidth) {
        while (displayText.length > 1 && ctx.measureText(`${displayText}…`).width > maxWidth) {
            displayText = displayText.slice(0, -1);
        }
        displayText += '…';
    }

    ctx.fillText(displayText, x, y);
}

async function drawCardBackground(ctx, width, height) {
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
        gradient.addColorStop(0.7, '#1b0908');
        gradient.addColorStop(1, '#a9300b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = 'rgba(10, 4, 5, 0.48)';
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width / 2, height + 60, 10, width / 2, height + 60, width * 0.7);
    glow.addColorStop(0, 'rgba(255, 78, 20, 0.78)');
    glow.addColorStop(1, 'rgba(255, 78, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, height * 0.45, width, height * 0.55);
}

async function drawCardLogo(ctx, x, y, maxWidth, maxHeight) {
    if (fs.existsSync(logoPath)) {
        const logo = await Canvas.loadImage(logoPath);
        const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
        const logoWidth = logo.width * scale;
        const logoHeight = logo.height * scale;
        ctx.drawImage(logo, x + (maxWidth - logoWidth) / 2, y + (maxHeight - logoHeight) / 2, logoWidth, logoHeight);
        return;
    }

    drawCardText(ctx, 'ONLY REC', x + maxWidth / 2, y + maxHeight / 2, {
        font: 'bold 22px sans-serif',
        color: '#ff6b24',
        align: 'center'
    });
}

async function loadPlayerAvatar(member) {
    const options = { extension: 'png', size: 128, forceStatic: true };
    const urls = [
        member.avatarURL(options),
        member.user.displayAvatarURL(options)
    ].filter((url, index, allUrls) => url && allUrls.indexOf(url) === index);
    let lastError;

    for (const url of urls) {
        try {
            return await Canvas.loadImage(url);
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) throw lastError;
    throw new Error('O usuário não possui uma URL de avatar disponível.');
}

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
                const avatar = await loadPlayerAvatar(player.memberObj);
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                ctx.restore();
                avatarLoaded = true;
            } catch (error) {
                console.warn(`Não foi possível carregar a foto de ${player.name}:`, error);
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

async function generateRankingImage(ranking) {
    const width = 1200;
    const rowHeight = 61;
    const hasPlayers = ranking.players.length > 0;
    const height = hasPlayers
        ? 206 + ranking.players.length * rowHeight + 24
        : 356;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    await drawCardBackground(ctx, width, height);

    drawCardPanel(ctx, 40, 30, 1120, 126, 23);
    await drawCardLogo(ctx, 58, 42, 136, 100);
    const positionLabel = ranking.position ? `POSIÇÃO ${ranking.position}` : 'GERAL';
    drawCardText(ctx, `RANKING ${positionLabel}`, 215, 91, {
        font: 'italic bold 37px sans-serif',
        color: '#fff4ed',
        maxWidth: 570
    });
    drawCardText(ctx, `${positionLabel}  ·  SEASON ${ranking.season}  ·  ORDENADO POR VITÓRIAS`, 218, 124, {
        font: 'bold 14px sans-serif',
        color: '#b69b8e',
        maxWidth: 570
    });

    const summaryCards = [
        { label: 'JOGADORES', value: ranking.playerCount },
        { label: 'JOGOS INDIVIDUAIS', value: ranking.totalGames }
    ];
    summaryCards.forEach((card, index) => {
        const x = 850 + index * 143;
        drawCardPanel(ctx, x, 54, 130, 76, 14, 'rgba(31, 12, 10, 0.9)');
        drawCardText(ctx, card.value, x + 65, 91, {
            font: 'bold 28px sans-serif',
            color: '#ff762c',
            align: 'center'
        });
        drawCardText(ctx, card.label, x + 65, 116, {
            font: 'bold 10px sans-serif',
            color: '#b69b8e',
            align: 'center'
        });
    });

    if (!hasPlayers) {
        drawCardPanel(ctx, 40, 177, 1120, 145, 22);
        drawCardText(ctx, ranking.position ? `NENHUM JOGADOR DE ${ranking.position} NO RANKING` : 'NENHUM JOGADOR NO RANKING AINDA', 600, 237, {
            font: 'italic bold 29px sans-serif',
            color: '#fff4ed',
            align: 'center',
            maxWidth: 1040
        });
        drawCardText(ctx, 'AINDA NÃO HÁ PARTIDAS REGISTRADAS NESTA TEMPORADA. USE /VITORIA PARA COMEÇAR O RANKING.', 600, 276, {
            font: 'bold 13px sans-serif',
            color: '#b69b8e',
            align: 'center',
            maxWidth: 1020
        });
        return canvas.toBuffer('image/png');
    }

    const headers = [
        { label: '#', x: 78, align: 'center' },
        { label: 'JOGADOR', x: 135, align: 'left' },
        { label: 'VITÓRIAS', x: 696, align: 'center' },
        { label: 'DERROTAS', x: 824, align: 'center' },
        { label: 'PARTIDAS', x: 952, align: 'center' },
        { label: '% VITÓRIAS', x: 1084, align: 'center' }
    ];
    headers.forEach(header => {
        drawCardText(ctx, header.label, header.x, 183, {
            font: 'bold 12px sans-serif',
            color: '#b69b8e',
            align: header.align
        });
    });

    ranking.players.forEach((player, index) => {
        const y = 194 + index * rowHeight;
        drawCardPanel(
            ctx,
            40,
            y,
            1120,
            54,
            13,
            index % 2 === 0 ? 'rgba(23, 9, 9, 0.92)' : 'rgba(38, 13, 10, 0.92)'
        );
        const rankColor = index < 3 ? ['#ffcc55', '#d6dce0', '#e49760'][index] : '#b69b8e';
        drawCardText(ctx, `${index + 1}`, 78, y + 34, {
            font: 'bold 20px sans-serif',
            color: rankColor,
            align: 'center'
        });
        drawCardText(ctx, player.name, 135, y + 34, {
            font: 'bold 20px sans-serif',
            color: '#fff4ed',
            maxWidth: 500
        });
        drawCardText(ctx, player.wins, 696, y + 34, {
            font: 'bold 20px sans-serif',
            color: '#ff762c',
            align: 'center'
        });
        drawCardText(ctx, player.losses, 824, y + 34, {
            font: 'bold 20px sans-serif',
            color: '#fff4ed',
            align: 'center'
        });
        drawCardText(ctx, player.games, 952, y + 34, {
            font: 'bold 20px sans-serif',
            color: '#fff4ed',
            align: 'center'
        });
        drawCardText(ctx, `${player.winRate}%`, 1084, y + 34, {
            font: 'bold 20px sans-serif',
            color: '#ff762c',
            align: 'center'
        });
    });

    return canvas.toBuffer('image/png');
}

async function generateHistoryImage(matches) {
    const width = 1200;
    const headerHeight = 152;
    const matchHeight = 206;
    const height = matches.length > 0
        ? headerHeight + matches.length * matchHeight + 20
        : 360;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    await drawCardBackground(ctx, width, height);

    drawCardPanel(ctx, 40, 30, 1120, 104, 22);
    await drawCardLogo(ctx, 56, 38, 130, 88);
    drawCardText(ctx, 'HISTÓRICO DE PARTIDAS', 205, 82, {
        font: 'italic bold 35px sans-serif',
        color: '#fff4ed',
        maxWidth: 650
    });
    drawCardText(ctx, 'ÚLTIMOS 5 RESULTADOS  ·  TIMES ORDENADOS POR POSIÇÃO', 208, 112, {
        font: 'bold 13px sans-serif',
        color: '#b69b8e',
        maxWidth: 650
    });
    drawCardPanel(ctx, 930, 48, 196, 68, 13, 'rgba(31, 12, 10, 0.9)');
    drawCardText(ctx, matches.length, 1028, 80, {
        font: 'bold 25px sans-serif',
        color: '#ff762c',
        align: 'center'
    });
    drawCardText(ctx, 'PARTIDAS', 1028, 103, {
        font: 'bold 10px sans-serif',
        color: '#b69b8e',
        align: 'center'
    });

    if (matches.length === 0) {
        drawCardPanel(ctx, 40, 158, 1120, 150, 22);
        drawCardText(ctx, 'NENHUMA PARTIDA REGISTRADA', 600, 220, {
            font: 'italic bold 30px sans-serif',
            color: '#fff4ed',
            align: 'center'
        });
        drawCardText(ctx, 'OS RESULTADOS DAS PARTIDAS APARECERÃO AQUI.', 600, 260, {
            font: 'bold 14px sans-serif',
            color: '#b69b8e',
            align: 'center'
        });
        return canvas.toBuffer('image/png');
    }

    const positionOrder = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };
    matches.forEach((match, index) => {
        const y = headerHeight + index * matchHeight;
        drawCardPanel(ctx, 40, y, 1120, 190, 18);

        drawCardText(ctx, `PARTIDA #${match.id}`, 64, y + 31, {
            font: 'bold 20px sans-serif',
            color: '#fff4ed'
        });
        drawCardText(ctx, match.date, 256, y + 30, {
            font: 'bold 13px sans-serif',
            color: '#b69b8e',
            maxWidth: 540
        });

        const winningTeam = String(match.winner || '').toLowerCase();
        const winnerLabel = winningTeam === 'time1' || winningTeam === 'time2'
            ? `VENCEDOR: ${winningTeam.toUpperCase()}`
            : 'RESULTADO REGISTRADO';
        drawCardText(ctx, winnerLabel, 1128, y + 30, {
            font: 'bold 13px sans-serif',
            color: '#ff762c',
            align: 'right',
            maxWidth: 300
        });

        const teamCards = [
            { label: 'TIME 1', players: match.team1, x: 58, winner: winningTeam === 'time1', accent: '#ff5a3c' },
            { label: 'TIME 2', players: match.team2, x: 610, winner: winningTeam === 'time2', accent: '#ffb13b' }
        ];
        teamCards.forEach(team => {
            drawCardPanel(
                ctx,
                team.x,
                y + 46,
                532,
                126,
                13,
                team.winner ? 'rgba(68, 22, 12, 0.95)' : 'rgba(22, 10, 9, 0.94)'
            );
            drawCardText(ctx, team.label, team.x + 16, y + 70, {
                font: 'bold 14px sans-serif',
                color: team.accent
            });
            const orderedPlayers = [...team.players].sort(
                (a, b) => (positionOrder[String(a.position).toUpperCase()] ?? 99) -
                    (positionOrder[String(b.position).toUpperCase()] ?? 99)
            );
            if (orderedPlayers.length === 0) {
                drawCardText(ctx, 'JOGADORES NÃO REGISTRADOS', team.x + 16, y + 112, {
                    font: 'bold 13px sans-serif',
                    color: '#b69b8e'
                });
            } else {
                orderedPlayers.slice(0, 5).forEach((player, playerIndex) => {
                    const position = String(player.position || '??').toUpperCase();
                    drawCardText(ctx, position, team.x + 18, y + 95 + playerIndex * 15, {
                        font: 'bold 11px sans-serif',
                        color: team.accent
                    });
                    drawCardText(ctx, player.name || 'Jogador', team.x + 60, y + 95 + playerIndex * 15, {
                        font: 'bold 12px sans-serif',
                        color: '#fff4ed',
                        maxWidth: 450
                    });
                });
            }
        });
    });

    return canvas.toBuffer('image/png');
}

module.exports = {
    generateRosterImage,
    generateProfileImage,
    generateRankingImage,
    generateHistoryImage
};
